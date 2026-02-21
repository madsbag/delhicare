#!/usr/bin/env python3
"""
Step 4b: Stage 2 Classification using GPT-4o-mini.

Classifies all Stage 1 filtered entries into 5 categories:
  1. Nursing Homes — residential facilities with nursing/medical staff
  2. Elder Care — old age homes, assisted living, senior care, dementia care
  3. Post-Hospital Care — post-surgery recovery, major neuro conditions,
     critical illness care, palliative/hospice/end-of-life care
  4. Home Health Care — home nursing, patient care at home, domiciliary care
  5. Other — doesn't fit any category

Three passes:
  Pass 1: LLM classification (GPT-4o-mini)
  Pass 2: Automated review to correct known LLM misclassifications
  Pass 3: Deduplication of classified (non-Other) entries by domain+city and name+city

Uses ONLY: business name + website crawl content (no Google types).

Reads:
  - pipeline/data/stage1_filtered.json   (from Step 4a)
  - pipeline/data/deep_crawl_results.json (from Step 3)

Writes:
  - pipeline/data/stage2_classified.json  (keyed by google_place_id)

Usage:
    export OPENAI_API_KEY="your-key-here"
    python pipeline/04b_normalise.py
"""

import json
import re
import os
import sys
import time
import math
from pathlib import Path
from urllib.parse import urlparse
from collections import Counter

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
FILTERED_FILE = DATA_DIR / "stage1_filtered.json"
CRAWL_FILE = DATA_DIR / "deep_crawl_results.json"
OUTPUT_FILE = DATA_DIR / "stage2_classified.json"
CACHE_FILE = DATA_DIR / "stage2_llm_cache.json"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-4o-mini"

CATEGORIES = [
    "Nursing Homes",
    "Elder Care",
    "Post-Hospital Care",
    "Home Health Care",
    "Other",
]

# ─── LLM Prompt ───────────────────────────────────────────────────────────────

CLASSIFY_PROMPT = """You are a healthcare facility classifier for an Indian healthcare directory called Karo Care.

Classify this business into EXACTLY ONE of these 5 categories:

1. "Nursing Homes" — Residential care facilities with nursing/medical staff providing 24/7 inpatient care. NOT home nursing services.

2. "Elder Care" — Old age homes, assisted living facilities, senior citizen care centres, retirement homes, dementia/Alzheimer's care homes, geriatric care centres. Focused on elderly residents.

3. "Post-Hospital Care" — Facilities for post-surgery/post-operative recovery, transition care after hospital discharge, rehabilitation for major neurological conditions (stroke, dementia, cerebral palsy, Parkinson's, Alzheimer's), critical illness care, palliative/hospice/end-of-life care, bedridden patient care. NOT pure physiotherapy clinics or sports rehab — those are "Other".

4. "Home Health Care" — Services providing nursing care, patient care, medical attendants, or caregivers AT THE PATIENT'S HOME. Includes home nursing bureaus, patient care agencies, domiciliary care, home visit services.

5. "Other" — Doesn't clearly fit any of the above. Includes: pure physiotherapy clinics, sports rehab, medical equipment suppliers, general healthcare services, staffing agencies, generic businesses, etc.

IMPORTANT RULES:
- Pure physiotherapy/sports rehab clinics → "Other" (even if they say "rehab")
- "Rehab" qualifies as Post-Hospital Care ONLY if combined with neuro/stroke/dementia/post-surgical/palliative/critical care
- A business providing both nursing home AND elder care → pick the DOMINANT one
- If unclear from the data, classify as "Other"
- Use ONLY the information provided (name + website content). Do NOT use any prior knowledge about the business.

Business name: "{name}"

{content_section}

Respond with ONLY a JSON object:
{{"category": "<one of the 5 categories>", "confidence": "<high|medium|low>", "reason": "<brief 1-line reason>"}}
"""


# ─── Pass 2: Post-LLM Correction Rules ────────────────────────────────────────
# These patterns catch known LLM misclassifications and re-assign them.

def post_llm_review(name, content, llm_category, llm_reason):
    """
    Review LLM classification and correct known mistakes.
    Returns (final_category, corrected, correction_reason).
    """
    name_lower = name.lower()
    content_lower = (content or "").lower()[:15000]
    combined = name_lower + " " + content_lower

    # ── Addiction/de-addiction rehab → Other ───────────────────────────────
    # LLM sometimes classifies addiction rehab as Post-Hospital Care
    if llm_category == "Post-Hospital Care":
        addiction_patterns = [
            r"\b(addict|de.?addict|deaddict)\b",
            r"\b(nasha|nashamukti|nasha\s*mukti)\b",
            r"\b(substance\s*abuse|sober|sobriety|detox)\b",
            r"\balcohol\b.*\b(rehab|recovery|treatment)\b",
            r"\bdrug\b.*\b(rehab|recovery|treatment)\b",
            r"\baddiction\s*(treatment|recovery|rehab)\b",
        ]
        for pat in addiction_patterns:
            if re.search(pat, combined):
                return "Other", True, f"addiction rehab reclassified: {pat}"

    # ── Psychiatric rehab → Other ─────────────────────────────────────────
    # LLM sometimes classifies psychiatric facilities as Post-Hospital Care
    if llm_category == "Post-Hospital Care":
        psych_patterns = [
            r"\bpsychiatr",
            r"\bmental\s*(health|illness|disorder)\b",
            r"\bpsychological\b",
            r"\bmental\s*hospital\b",
        ]
        # Only reclassify if there are NO genuine post-hospital signals
        post_hospital_signals = [
            r"\bstroke\b", r"\bparalysis\b", r"\bdementia\b", r"\balzheimer\b",
            r"\bparkinson\b", r"\bcerebral\s*palsy\b", r"\bpost.operative\b",
            r"\bpost.surgical\b", r"\bcritical\s*(care|illness)\b",
            r"\bpalliative\b", r"\bhospice\b", r"\bbed.?ridden\b",
            r"\bventilat", r"\btransition\s*care\b", r"\bicu\b",
        ]
        has_psych = any(re.search(p, combined) for p in psych_patterns)
        has_post_hospital = any(re.search(p, combined) for p in post_hospital_signals)
        if has_psych and not has_post_hospital:
            return "Other", True, "psychiatric rehab without post-hospital signals"

    # ── Children's disability rehab → Other ───────────────────────────────
    if llm_category == "Post-Hospital Care":
        child_patterns = [
            r"\bchildren\b.*\b(disabilit|handicap|special\s*needs)\b",
            r"\b(handicapped|disabled)\s*children\b",
            r"\bchild\b.*\brehab",
            r"\b(autism|adhd|cerebral\s*palsy)\b.*\bchild",
            r"\bchild\b.*\b(cerebral\s*palsy|autism|adhd)\b",
        ]
        for pat in child_patterns:
            if re.search(pat, combined):
                return "Other", True, f"children's disability rehab: {pat}"

    # ── Lab/diagnostic that slipped through → Other ───────────────────────
    lab_patterns = [
        r"\bpath\s*lab\b",
        r"\blab\s*test\b",
        r"\bblood\s*test\b",
        r"\bdiagnostic\b",
        r"\bx.?ray\b",
        r"\bultrasound\b",
        r"\bmri\b",
        r"\bct\s*scan\b",
    ]
    for pat in lab_patterns:
        if re.search(pat, combined):
            # Only reclassify if the primary business seems to be a lab
            if llm_category != "Other":
                # Check if lab is the primary business (appears in name)
                if re.search(pat, name_lower):
                    return "Other", True, f"diagnostic/lab reclassified: {pat}"

    # ── Pure physio that LLM missed → Other ───────────────────────────────
    if llm_category == "Post-Hospital Care":
        physio_only_name = [
            r"\bphysio",
            r"\bchiro",
        ]
        has_physio_name = any(re.search(p, name_lower) for p in physio_only_name)
        has_post_hospital = any(re.search(p, combined) for p in [
            r"\bstroke\b", r"\bparalysis\b", r"\bdementia\b", r"\balzheimer\b",
            r"\bparkinson\b", r"\bcerebral\s*palsy\b", r"\bpost.operative\b",
            r"\bpost.surgical\b", r"\bcritical\s*(care|illness)\b",
            r"\bpalliative\b", r"\bhospice\b", r"\bbed.?ridden\b",
            r"\bventilat", r"\btransition\s*care\b", r"\bspinal\s*cord\b",
            r"\btraumatic\s*brain\b", r"\bicu\b",
        ])
        if has_physio_name and not has_post_hospital:
            return "Other", True, "pure physio reclassified"

    # ── Staffing/manpower agency → Other ──────────────────────────────────
    staffing_patterns = [
        r"\bstaffing\b",
        r"\bmanpower\b",
        r"\brecruitment\b",
        r"\bplacement\b.*\b(agency|service|bureau)\b",
    ]
    if llm_category != "Other":
        for pat in staffing_patterns:
            if re.search(pat, combined):
                return "Other", True, f"staffing/manpower reclassified: {pat}"

    # ── Medical equipment/supplies → Other ────────────────────────────────
    equip_patterns = [
        r"\b(wheelchair|oxygen\s*cylinder|medical\s*equipment)\b",
        r"\b(surgical\s*item|medical\s*supply|medical\s*store)\b",
        r"\b(equipment\s*rental|on\s*rent)\b",
    ]
    if llm_category != "Other":
        for pat in equip_patterns:
            if re.search(pat, name_lower):
                return "Other", True, f"equipment/supplies reclassified: {pat}"

    # No correction needed
    return llm_category, False, ""


# ─── Helper Functions ──────────────────────────────────────────────────────────

def get_crawl_content(crawl_data, place_id):
    """Get combined markdown content from crawl results."""
    if place_id not in crawl_data:
        return ""
    entry = crawl_data[place_id]
    pages = entry.get("pages", [])
    combined = []
    for page in pages:
        text = page.get("markdown", "")
        if text and len(text) > 50:
            combined.append(text)
    return "\n\n".join(combined)


def classify_llm(name, content, client):
    """Classify using GPT-4o-mini. Returns (category, confidence, reason)."""
    if content and len(content) > 200:
        truncated = content[:4000]
        content_section = f'Website content (truncated):\n"""\n{truncated}\n"""'
    else:
        content_section = "No website content available."

    prompt = CLASSIFY_PROMPT.format(
        name=name,
        content_section=content_section,
    )

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=150,
        )
        text = response.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        result = json.loads(text)
        return (
            result.get("category", "Other"),
            result.get("confidence", "low"),
            result.get("reason", ""),
        )
    except Exception as e:
        return "Other", "none", f"LLM error: {str(e)[:80]}"


# ─── Distance helpers ────────────────────────────────────────────────────────

def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in metres between two lat/lng points."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


DEDUP_DISTANCE_M = 200  # Only dedup if within this distance


def cluster_by_proximity(pids: list, all_data: dict) -> list[list[str]]:
    """
    Split a list of place IDs into proximity clusters.
    Two entries go in the same cluster only if they are within DEDUP_DISTANCE_M
    of at least one other member.  Returns list of clusters (each a list of pids).
    Entries without lat/lng get their own singleton cluster (never deduped).
    """
    coords = {}
    no_coords = []
    for pid in pids:
        place = all_data.get(pid, {})
        lat = place.get("lat")
        lng = place.get("lng")
        if lat and lng:
            coords[pid] = (float(lat), float(lng))
        else:
            no_coords.append(pid)

    # Simple greedy clustering
    remaining = set(coords.keys())
    clusters: list[list[str]] = []

    while remaining:
        seed = remaining.pop()
        cluster = [seed]
        # Find all entries close to any member of this cluster
        changed = True
        while changed:
            changed = False
            for pid in list(remaining):
                lat1, lon1 = coords[seed]
                # Check distance to any existing cluster member
                for member in cluster:
                    lat2, lon2 = coords[member]
                    if haversine_m(coords[pid][0], coords[pid][1], lat2, lon2) <= DEDUP_DISTANCE_M:
                        cluster.append(pid)
                        remaining.discard(pid)
                        changed = True
                        break
        clusters.append(cluster)

    # Entries without coordinates → each is its own cluster (not deduped)
    for pid in no_coords:
        clusters.append([pid])

    return clusters


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  STAGE 2 CLASSIFIER — LLM + Post-Review")
    print("=" * 70)

    # Load data
    with open(FILTERED_FILE) as f:
        all_data = json.load(f)
    with open(CRAWL_FILE) as f:
        crawl_data = json.load(f)

    print(f"\n  Total entries: {len(all_data)}")

    # Load cache
    cache = {}
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            cache = json.load(f)
        print(f"  Loaded cache: {len(cache)} entries")

    # Check if we need API calls
    uncached = [pid for pid in all_data if pid not in cache]
    client = None
    if uncached:
        if not OPENAI_API_KEY:
            print(f"\n  ERROR: OPENAI_API_KEY not set. {len(uncached)} entries need classification.")
            print("  Run: export OPENAI_API_KEY='your-key-here'")
            sys.exit(1)
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
        except ImportError:
            print("  ERROR: openai package not installed. pip install openai")
            sys.exit(1)
    else:
        print(f"  All entries cached — skipping LLM API calls.")

    # ── Pass 1: LLM Classification ────────────────────────────────────────
    print(f"\n  --- Pass 1: LLM Classification ---")

    total = len(all_data)
    new_calls = 0
    cached_hits = 0
    errors = 0
    start_time = time.time()

    for i, (pid, place) in enumerate(all_data.items()):
        if pid in cache:
            cached_hits += 1
            continue

        name = place.get("name", "")
        content = get_crawl_content(crawl_data, pid)
        category, confidence, reason = classify_llm(name, content, client)

        if category not in CATEGORIES:
            category = "Other"

        cache[pid] = {
            "name": name,
            "llm_category": category,
            "llm_confidence": confidence,
            "llm_reason": reason,
            "has_content": len(content) > 200,
        }
        new_calls += 1

        if new_calls % 100 == 0:
            elapsed = time.time() - start_time
            rate = new_calls / elapsed * 60
            remaining = (total - cached_hits - new_calls) / rate if rate > 0 else 0
            print(f"    {cached_hits + new_calls}/{total} "
                  f"({new_calls} new, {rate:.0f}/min, ~{remaining:.1f}min left)")
            # Save cache periodically
            with open(CACHE_FILE, "w") as f:
                json.dump(cache, f, ensure_ascii=False)

        # Rate limit
        time.sleep(0.12)

    # Final cache save
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, ensure_ascii=False)

    elapsed = time.time() - start_time
    print(f"\n  Pass 1 complete: {new_calls} new API calls, "
          f"{cached_hits} cached, {elapsed:.1f}s")

    # ── Pass 2: Post-LLM Review ──────────────────────────────────────────
    print(f"\n  --- Pass 2: Post-LLM Automated Review ---")

    results = {}
    corrections = 0
    correction_reasons = Counter()
    cat_counts_before = Counter()
    cat_counts_after = Counter()

    for pid, place in all_data.items():
        name = place.get("name", "")
        content = get_crawl_content(crawl_data, pid)

        cached = cache.get(pid, {})
        llm_cat = cached.get("llm_category", "Other")
        llm_conf = cached.get("llm_confidence", "none")
        llm_reason = cached.get("llm_reason", "")

        cat_counts_before[llm_cat] += 1

        # Run post-LLM review
        final_cat, corrected, correction_reason = post_llm_review(
            name, content, llm_cat, llm_reason
        )

        if corrected:
            corrections += 1
            correction_reasons[correction_reason] += 1

        cat_counts_after[final_cat] += 1

        results[pid] = {
            "name": name,
            "category": final_cat,
            "llm_category": llm_cat,
            "llm_confidence": llm_conf,
            "llm_reason": llm_reason,
            "corrected": corrected,
            "correction_reason": correction_reason if corrected else "",
            "has_content": cached.get("has_content", False),
            "_found_in_city": place.get("_found_in_city", place.get("_search_city", "")),
        }

    print(f"\n  Corrections made: {corrections}")
    if corrections:
        print(f"\n  --- Correction reasons ---")
        for reason, count in correction_reasons.most_common(20):
            print(f"    {reason[:60]:60s} x{count}")

    # ── Pass 3: Deduplication ─────────────────────────────────────────────
    print(f"\n  --- Pass 3: Deduplication (classified entries only) ---")

    classified_pids = {pid for pid, r in results.items() if r["category"] != "Other"}

    def get_domain(pid):
        place = all_data.get(pid, {})
        url = place.get("website", "").strip()
        if not url:
            return ""
        try:
            return urlparse(url).netloc.lower().replace("www.", "")
        except Exception:
            return ""

    def get_score(pid):
        place = all_data.get(pid, {})
        rating = place.get("rating", 0) or 0
        reviews = place.get("reviews", 0) or 0
        return (reviews, rating)

    # Pass 3a: Dedup by (domain, city)
    from collections import defaultdict
    domain_city_groups = defaultdict(list)
    for pid in classified_pids:
        domain = get_domain(pid)
        city = results[pid].get("_found_in_city", "")
        if domain:
            domain_city_groups[(domain, city)].append(pid)

    removed_domain = set()
    for (domain, city), pids in domain_city_groups.items():
        if len(pids) <= 1:
            continue
        # Cluster by proximity — only dedup within 200m clusters
        clusters = cluster_by_proximity(pids, all_data)
        for cluster in clusters:
            if len(cluster) <= 1:
                continue
            cluster_sorted = sorted(cluster, key=lambda p: get_score(p), reverse=True)
            for pid in cluster_sorted[1:]:
                removed_domain.add(pid)

    # Pass 3b: Dedup by (normalized_name, city) on remaining
    remaining = classified_pids - removed_domain
    name_city_groups = defaultdict(list)
    for pid in remaining:
        norm_name = re.sub(r"[^a-z0-9]", "", results[pid]["name"].lower())
        city = results[pid].get("_found_in_city", "")
        name_city_groups[(norm_name, city)].append(pid)

    removed_name = set()
    for (norm, city), pids in name_city_groups.items():
        if len(pids) <= 1:
            continue
        # Cluster by proximity — only dedup within 200m clusters
        clusters = cluster_by_proximity(pids, all_data)
        for cluster in clusters:
            if len(cluster) <= 1:
                continue
            cluster_sorted = sorted(cluster, key=lambda p: get_score(p), reverse=True)
            for pid in cluster_sorted[1:]:
                removed_name.add(pid)

    total_removed = removed_domain | removed_name

    # Mark deduplicated entries
    for pid in total_removed:
        results[pid]["deduplicated"] = True
        results[pid]["category_before_dedup"] = results[pid]["category"]
        results[pid]["category"] = "Deduplicated"

    print(f"  Removed by domain+city: {len(removed_domain)}")
    print(f"  Removed by name+city:   {len(removed_name)}")
    print(f"  Total deduplicated:     {len(total_removed)}")

    # ── Final Summary ─────────────────────────────────────────────────────
    final_counts = Counter(r["category"] for r in results.values())

    print(f"\n  {'='*60}")
    print(f"  {'Category':25s} {'LLM':>8s} {'Review':>8s} {'Dedup':>8s}")
    print(f"  {'-'*25} {'-'*8} {'-'*8} {'-'*8}")
    for cat in CATEGORIES:
        llm = cat_counts_before.get(cat, 0)
        review = cat_counts_after.get(cat, 0)
        final = final_counts.get(cat, 0)
        print(f"  {cat:25s} {llm:8d} {review:8d} {final:8d}")
    dedup_count = final_counts.get("Deduplicated", 0)
    print(f"  {'Deduplicated':25s} {'':8s} {'':8s} {dedup_count:8d}")

    active = sum(final_counts.get(c, 0) for c in CATEGORIES if c != "Other")
    print(f"\n  Active listings:  {active}")
    print(f"  Other:            {final_counts.get('Other', 0)}")
    print(f"  Deduplicated:     {dedup_count}")
    print(f"  Total:            {len(results)}")

    # Confidence breakdown
    conf_counts = Counter()
    for r in results.values():
        if r["category"] not in ("Other", "Deduplicated"):
            conf_counts[r["llm_confidence"]] += 1
    print(f"\n  --- Confidence levels (active listings only) ---")
    for conf in ["high", "medium", "low", "none"]:
        count = conf_counts.get(conf, 0)
        pct = count / max(active, 1) * 100
        print(f"    {conf:10s}: {count:5d}  ({pct:.1f}%)")

    # City breakdown
    print(f"\n  --- By city ---")
    city_cats = {}
    for r in results.values():
        if r["category"] == "Deduplicated":
            continue
        city = r["_found_in_city"]
        if city not in city_cats:
            city_cats[city] = Counter()
        city_cats[city][r["category"]] += 1

    for city in sorted(city_cats, key=lambda c: -sum(city_cats[c].values())):
        cats = city_cats[city]
        total_city = sum(cats.values())
        classified = total_city - cats.get("Other", 0)
        print(f"    {city:20s}: {total_city:5d} total, {classified:5d} classified "
              f"({classified/total_city*100:.0f}%)")

    # Save results
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n  Output: {OUTPUT_FILE}")
    print(f"  Cache:  {CACHE_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    main()
