#!/usr/bin/env python3
"""
Stage 2 Classification Test — Compare rule-based vs LLM-based on Delhi.

Classifies entries into:
  1. Nursing Homes — residential facilities with nursing/medical staff
  2. Elder Care — old age homes, assisted living, senior care, dementia care
  3. Post-Hospital Care — post-surgery recovery, major neuro conditions (dementia,
     stroke, cerebral palsy, Parkinson's, Alzheimer's), critical illness care,
     palliative/hospice/end-of-life care, bedridden patient care.
     NOT pure physiotherapy or sports rehab.
  4. Home Health Care — home nursing, patient care at home, domiciliary care
  5. Other — doesn't fit any category (pure physio, equipment, generic, etc.)

Uses ONLY: business name + website crawl content (no Google types).
"""

import json
import re
import os
import sys
import time
from pathlib import Path
from collections import Counter

DATA_DIR = Path(__file__).parent / "data"
FILTERED_FILE = DATA_DIR / "stage1_filtered.json"
CRAWL_FILE = DATA_DIR / "deep_crawl_results.json"
OUTPUT_RULES = DATA_DIR / "stage2_rules_delhi.json"
OUTPUT_LLM = DATA_DIR / "stage2_llm_delhi.json"

CATEGORIES = [
    "Nursing Homes",
    "Elder Care",
    "Post-Hospital Care",
    "Home Health Care",
    "Other",
]

# ─── Rule-Based Classifier ────────────────────────────────────────────────────

# Pure physio signals — if ONLY these are present, classify as Other
PURE_PHYSIO_SIGNALS = [
    r"\bphysio",
    r"\bchiro",
    r"\bsports?\s*(injury|medicine|rehab)",
    r"\bortho\b",
    r"\bjoint\s*pain\b",
    r"\bback\s*pain\b",
    r"\bknee\s*pain\b",
    r"\bspine\s*(care|clinic)\b",
]

# Signals that upgrade "rehab" from Other to Post-Hospital Care
POST_HOSPITAL_QUALIFIERS = [
    r"\bneuro",
    r"\bstroke\b",
    r"\bdementia\b",
    r"\balzheimer\b",
    r"\bparkinson\b",
    r"\bcerebral\s*palsy\b",
    r"\bparalysis\b",
    r"\bparalytic\b",
    r"\bpost.operative\b",
    r"\bpost.surgical\b",
    r"\bpost.hospital\b",
    r"\bcritical\s*(care|illness)\b",
    r"\bpalliative\b",
    r"\bhospice\b",
    r"\bend.of.life\b",
    r"\bterminal\b",
    r"\bbed.?ridden\b",
    r"\bventilat",
    r"\btracheostom",
    r"\bcardiac\s*rehab",
    r"\bneuro\s*rehab",
    r"\bpulmonary\s*rehab",
    r"\btransition\s*care\b",
    r"\bconvalescen",
    r"\brecovery\s*(care|centre|center|home|facility)\b",
    r"\bspinal\s*(cord|injury)\b",
    r"\btraumatic\s*brain\b",
    r"\bcoma\b",
    r"\bhead\s*injury\b",
]


def has_any_pattern(text, patterns):
    """Check if text matches any of the patterns."""
    for pat in patterns:
        if re.search(pat, text):
            return True
    return False


def classify_rule_based(name, content):
    """
    Classify using rules. Returns (category, confidence, reason).
    """
    name_lower = name.lower()
    content_lower = (content or "").lower()[:15000]
    combined = name_lower + " " + content_lower

    # ── 1. Elder Care (check first — strong signals) ──────────────────────
    elder_name_patterns = [
        r"\bold\s*age\s*home\b",
        r"\bvridh|vruddh|vrudh|vriddh|vriddhashram|vrudhashram",
        r"\bassisted\s*living\b",
        r"\bsenior\s*(care|living|citizen|home)\b",
        r"\belder\s*(care|home|ly\s*care)\b",
        r"\bgeriatric\b",
        r"\bretirement\s*(home|community|living)\b",
        r"\baged\s*care\b",
        r"\bmemory\s*care\b",
    ]
    elder_content_patterns = [
        r"\bold\s*age\s*home\b",
        r"\bassisted\s*living\b",
        r"\bsenior\s*(care|living|citizen)\b",
        r"\belder\s*(care|ly\s*care)\b",
        r"\bgeriatric\s*care\b",
        r"\bretirement\s*(home|community|living)\b",
        r"\bdementia\s*care\b",
        r"\balzheimer\b.*\bcare\b",
        r"\bmemory\s*care\b",
        r"\baged\s*care\b",
        r"\bcompanion\s*care\b",
    ]

    if has_any_pattern(name_lower, elder_name_patterns):
        return "Elder Care", "high", "strong name match"

    elder_content_hits = sum(1 for p in elder_content_patterns if re.search(p, content_lower))
    if elder_content_hits >= 2:
        return "Elder Care", "high", f"content matches x{elder_content_hits}"
    if elder_content_hits == 1 and has_any_pattern(name_lower, [r"\bsenior\b", r"\belder\b", r"\bold\b"]):
        return "Elder Care", "medium", "weak name + content match"

    # ── 2. Nursing Homes ──────────────────────────────────────────────────
    nursing_name_patterns = [
        r"\bnursing\s*home\b",
        r"\bnursing\s*facility\b",
        r"\bskilled\s*nursing\b",
    ]
    nursing_content_patterns = [
        r"\bnursing\s*home\b",
        r"\bnursing\s*facility\b",
        r"\bskilled\s*nursing\b",
        r"\b24.hour\s*nursing\b",
        r"\bround.the.clock\s*nursing\b",
        r"\blong.term\s*care\s*facility\b",
        r"\binpatient\s*nursing\b",
    ]

    if has_any_pattern(name_lower, nursing_name_patterns):
        return "Nursing Homes", "high", "strong name match"

    nursing_content_hits = sum(1 for p in nursing_content_patterns if re.search(p, content_lower))
    if nursing_content_hits >= 2:
        return "Nursing Homes", "high", f"content matches x{nursing_content_hits}"
    if nursing_content_hits == 1 and re.search(r"\bnursing\b", name_lower):
        return "Nursing Homes", "medium", "nursing in name + content"

    # ── 3. Home Health Care ───────────────────────────────────────────────
    home_name_patterns = [
        r"\bhome\s*(health\s*care|healthcare|nursing|nurse|care\s*service)\b",
        r"\bcare\s*at\s*home\b",
        r"\bnursing\s*at\s*home\b",
        r"\bhomecare\b",
        r"\bdomiciliary\b",
        r"\bpatient\s*care\s*(service|at\s*home)\b",
        r"\bnursing\s*(bureau|agency|service|staff)\b",
        r"\bcare\s*taker|caretaker\b",
        r"\battendant\b.*\b(service|bureau|provider)\b",
        r"\bhome\b.*\bnursing\s*service\b",
    ]
    home_content_patterns = [
        r"\bhome\s*(health\s*care|healthcare|nursing)\s*(service|provider)\b",
        r"\bnursing\s*at\s*home\b",
        r"\bcare\s*at\s*home\b",
        r"\bpatient\s*care\s*at\s*home\b",
        r"\bhome\s*visit\b",
        r"\bdomiciliary\s*care\b",
        r"\bhomecare\s*service\b",
        r"\bnurse\s*(on\s*call|at\s*home|provider)\b",
        r"\bcaregiv",
        r"\bin.home\s*(care|nursing|service)\b",
        r"\bbedside\s*care\b",
    ]

    if has_any_pattern(name_lower, home_name_patterns):
        return "Home Health Care", "high", "strong name match"

    home_content_hits = sum(1 for p in home_content_patterns if re.search(p, content_lower))
    if home_content_hits >= 2:
        return "Home Health Care", "high", f"content matches x{home_content_hits}"
    if home_content_hits == 1 and has_any_pattern(name_lower, [r"\bhome\b", r"\bpatient\b", r"\bnurs"]):
        return "Home Health Care", "medium", "weak name + content match"

    # ── 4. Post-Hospital Care ─────────────────────────────────────────────
    # Must have post-hospital qualifiers — pure physio/rehab goes to Other
    post_hospital_name_patterns = [
        r"\btransition\s*care\b",
        r"\bpost.hospital\b",
        r"\bpost.operative\b",
        r"\bpost.surgical\b",
        r"\bpalliative\b",
        r"\bhospice\b",
        r"\bend.of.life\b",
        r"\bcritical\s*(care|illness)\b",
        r"\bdementia\s*care\b",
        r"\balzheimer\b",
        r"\bparkinson\b",
        r"\bcerebral\s*palsy\b",
        r"\bneuro\s*rehab",
        r"\bcardiac\s*rehab",
        r"\bstroke\s*(care|rehab|recovery)\b",
        r"\bbed.?ridden\b",
    ]

    if has_any_pattern(name_lower, post_hospital_name_patterns):
        return "Post-Hospital Care", "high", "strong name match"

    # "rehab" in name — only qualifies if also has post-hospital qualifiers
    if re.search(r"\brehab", name_lower):
        if has_any_pattern(combined, POST_HOSPITAL_QUALIFIERS):
            return "Post-Hospital Care", "medium", "rehab + post-hospital qualifier"
        # rehab but only physio signals → Other
        if has_any_pattern(combined, PURE_PHYSIO_SIGNALS):
            return "Other", "medium", "rehab but pure physio"

    # Check content for post-hospital signals
    post_content_hits = sum(1 for p in POST_HOSPITAL_QUALIFIERS if re.search(p, content_lower))
    if post_content_hits >= 2:
        return "Post-Hospital Care", "medium", f"content post-hospital signals x{post_content_hits}"
    if post_content_hits == 1 and re.search(r"\b(care|rehab)", name_lower):
        return "Post-Hospital Care", "low", "weak post-hospital signal"

    # ── 5. Fallback: check for nursing without "home" ─────────────────────
    if re.search(r"\bnursing\b", name_lower):
        if content_lower and has_any_pattern(content_lower, [r"\bhome\b.*\b(care|nursing)\b", r"\bat\s*home\b"]):
            return "Home Health Care", "low", "nursing + home content signal"
        if content_lower and has_any_pattern(content_lower, [r"\bfacility\b", r"\binpatient\b", r"\bbed\b"]):
            return "Nursing Homes", "low", "nursing + facility content signal"
        # Just "nursing" in name, no content — likely nursing bureau / home care
        return "Home Health Care", "low", "nursing in name, default"

    # ── 6. Other ──────────────────────────────────────────────────────────
    return "Other", "none", "no category match"


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


# ─── LLM-Based Classifier ─────────────────────────────────────────────────────

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


def classify_llm(name, content, client):
    """Classify using GPT-4o-mini. Returns (category, confidence, reason)."""
    if content and len(content) > 200:
        # Truncate to ~4000 chars
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
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=150,
        )
        text = response.choices[0].message.content.strip()
        # Parse JSON
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
        return "Other", "none", f"LLM error: {str(e)[:50]}"


def run_rules_delhi(all_data, crawl_data):
    """Run rule-based classifier on Delhi."""
    print("=" * 70)
    print("  RULE-BASED CLASSIFIER — Delhi")
    print("=" * 70)

    delhi = {pid: p for pid, p in all_data.items()
             if p.get("_found_in_city", p.get("_search_city", "")) == "Delhi"}
    print(f"\n  Delhi entries: {len(delhi)}")

    results = {}
    cat_counts = Counter()
    conf_counts = Counter()

    for pid, place in delhi.items():
        name = place.get("name", "")
        content = get_crawl_content(crawl_data, pid)
        category, confidence, reason = classify_rule_based(name, content)

        results[pid] = {
            "name": name,
            "category": category,
            "confidence": confidence,
            "reason": reason,
            "has_content": len(content) > 200,
        }
        cat_counts[category] += 1
        conf_counts[confidence] += 1

    print(f"\n  --- Classification Results ---")
    for cat in CATEGORIES:
        count = cat_counts.get(cat, 0)
        pct = count / len(delhi) * 100
        print(f"    {cat:25s}: {count:5d}  ({pct:.1f}%)")

    print(f"\n  --- Confidence Levels ---")
    for conf in ["high", "medium", "low", "none"]:
        count = conf_counts.get(conf, 0)
        pct = count / len(delhi) * 100
        print(f"    {conf:10s}: {count:5d}  ({pct:.1f}%)")

    for cat in CATEGORIES:
        entries = [(r["name"], r["confidence"], r["reason"])
                   for r in results.values() if r["category"] == cat]
        print(f"\n  --- {cat} ({len(entries)} total, showing 10) ---")
        for name, conf, reason in entries[:10]:
            print(f"    [{conf:6s}] {name[:70]}")

    with open(OUTPUT_RULES, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n  Saved: {OUTPUT_RULES}")
    print("=" * 70)

    return results


def run_llm_delhi(all_data, crawl_data):
    """Run LLM-based classifier on Delhi."""
    print("\n" + "=" * 70)
    print("  LLM-BASED CLASSIFIER — Delhi (GPT-4o-mini)")
    print("=" * 70)

    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        print("  ERROR: OPENAI_API_KEY not set. Skipping LLM classification.")
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
    except ImportError:
        print("  ERROR: openai package not installed. pip install openai")
        return None

    delhi = {pid: p for pid, p in all_data.items()
             if p.get("_found_in_city", p.get("_search_city", "")) == "Delhi"}
    print(f"\n  Delhi entries: {len(delhi)}")

    results = {}
    cat_counts = Counter()
    conf_counts = Counter()
    errors = 0

    total = len(delhi)
    for i, (pid, place) in enumerate(delhi.items()):
        name = place.get("name", "")
        content = get_crawl_content(crawl_data, pid)
        category, confidence, reason = classify_llm(name, content, client)

        if category not in CATEGORIES:
            category = "Other"

        results[pid] = {
            "name": name,
            "category": category,
            "confidence": confidence,
            "reason": reason,
            "has_content": len(content) > 200,
        }
        cat_counts[category] += 1
        conf_counts[confidence] += 1

        if (i + 1) % 50 == 0:
            print(f"    Processed {i+1}/{total}...")

        # Rate limit — ~500 RPM for gpt-4o-mini
        time.sleep(0.15)

    print(f"\n  --- Classification Results ---")
    for cat in CATEGORIES:
        count = cat_counts.get(cat, 0)
        pct = count / len(delhi) * 100
        print(f"    {cat:25s}: {count:5d}  ({pct:.1f}%)")

    print(f"\n  --- Confidence Levels ---")
    for conf in ["high", "medium", "low", "none"]:
        count = conf_counts.get(conf, 0)
        pct = count / len(delhi) * 100
        print(f"    {conf:10s}: {count:5d}  ({pct:.1f}%)")

    for cat in CATEGORIES:
        entries = [(r["name"], r["confidence"], r["reason"])
                   for r in results.values() if r["category"] == cat]
        print(f"\n  --- {cat} ({len(entries)} total, showing 10) ---")
        for name, conf, reason in entries[:10]:
            print(f"    [{conf:6s}] {name[:70]}")

    with open(OUTPUT_LLM, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n  Saved: {OUTPUT_LLM}")
    print("=" * 70)

    return results


def compare_results(rules_results, llm_results):
    """Compare rule-based vs LLM results."""
    if not llm_results:
        return

    print("\n" + "=" * 70)
    print("  COMPARISON — Rules vs LLM")
    print("=" * 70)

    agree = 0
    disagree = 0
    disagreements = []

    for pid in rules_results:
        r_cat = rules_results[pid]["category"]
        l_cat = llm_results[pid]["category"]
        if r_cat == l_cat:
            agree += 1
        else:
            disagree += 1
            disagreements.append({
                "name": rules_results[pid]["name"],
                "rules": r_cat,
                "llm": l_cat,
                "rules_reason": rules_results[pid]["reason"],
                "llm_reason": llm_results[pid]["reason"],
            })

    total = agree + disagree
    print(f"\n  Agreement: {agree}/{total} ({agree/total*100:.1f}%)")
    print(f"  Disagreement: {disagree}/{total} ({disagree/total*100:.1f}%)")

    # Show disagreement patterns
    from collections import defaultdict
    patterns = defaultdict(int)
    for d in disagreements:
        patterns[(d["rules"], d["llm"])] += 1

    print(f"\n  --- Disagreement patterns ---")
    for (r, l), count in sorted(patterns.items(), key=lambda x: -x[1]):
        print(f"    Rules={r:25s} → LLM={l:25s}  x{count}")

    print(f"\n  --- Sample disagreements (first 20) ---")
    for d in disagreements[:20]:
        print(f"    {d['name'][:60]}")
        print(f"      Rules: {d['rules']} ({d['rules_reason'][:50]})")
        print(f"      LLM:   {d['llm']} ({d['llm_reason'][:50]})")
        print()

    print("=" * 70)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "both"

    with open(FILTERED_FILE) as f:
        all_data = json.load(f)
    with open(CRAWL_FILE) as f:
        crawl_data = json.load(f)

    rules_results = None
    llm_results = None

    if mode in ("rules", "both"):
        rules_results = run_rules_delhi(all_data, crawl_data)

    if mode in ("llm", "both"):
        llm_results = run_llm_delhi(all_data, crawl_data)

    if rules_results and llm_results:
        compare_results(rules_results, llm_results)


if __name__ == "__main__":
    main()
