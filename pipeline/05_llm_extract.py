#!/usr/bin/env python3
"""
Step 5: LLM Structured Extraction using GPT-4o-mini.

For each ACTIVE listing (category != Other, Deduplicated), combines all available
data (name, Google fields, crawled website content) and uses GPT-4o-mini to extract:

  1. description       — single comprehensive write-up
  2. specialities      — matched canonical tags from master_tags.json
  3. services          — matched canonical tags from master_tags.json
  4. facility_features — matched canonical tags from master_tags.json
  5. facility_type     — Day Care / Consultation / Boarding
  6. bed_count         — integer if boarding, else null
  7. is_premium        — boolean based on data richness
  8. trust_signals     — accreditations, reviews, testimonials combined

Tags are ONLY assigned to the 4 active categories (Nursing Homes, Elder Care,
Post-Hospital Care, Home Health Care). "Other" and "Deduplicated" are skipped.

Two modes:
  - EXTRACT: when good website content is available (>200 chars)
  - GENERATE: when thin/no content — produces minimal listing from name + Google data

Reads:
  - pipeline/data/stage1_filtered.json      (original place data: name, address, etc.)
  - pipeline/data/stage2_classified.json     (classification: category, confidence)
  - pipeline/data/deep_crawl_results.json    (website crawl content)
  - pipeline/config/master_tags.json         (tag taxonomy)

Writes:
  - pipeline/data/llm_extracted.json         (keyed by google_place_id)
  - pipeline/data/llm_extract_cache.json     (resume support)

Usage:
    export OPENAI_API_KEY="your-key-here"
    python pipeline/05_llm_extract.py
"""

import json
import os
import re
import sys
import time
from pathlib import Path
from collections import Counter

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
CONFIG_DIR = Path(__file__).parent / "config"

STAGE1_FILE = DATA_DIR / "stage1_filtered.json"
CLASSIFIED_FILE = DATA_DIR / "stage2_classified.json"
CRAWL_FILE = DATA_DIR / "deep_crawl_results.json"
TAGS_FILE = CONFIG_DIR / "master_tags.json"

OUTPUT_FILE = DATA_DIR / "llm_extracted.json"
CACHE_FILE = DATA_DIR / "llm_extract_cache.json"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-4o-mini"

MAX_CONTENT_CHARS = 8000   # max website chars to send to LLM
MIN_USEFUL_CONTENT = 200   # minimum chars to consider content useful

ACTIVE_CATEGORIES = {"Nursing Homes", "Elder Care", "Post-Hospital Care", "Home Health Care"}

# ─── Tag Taxonomy ─────────────────────────────────────────────────────────────


def load_tag_taxonomy():
    """Load master tags and build flat canonical name lists for each group."""
    with open(TAGS_FILE) as f:
        tags = json.load(f)

    taxonomy = {}
    for group in ("specialities", "services", "facility_features"):
        canonical_names = list(tags[group].keys())
        taxonomy[group] = canonical_names

    return taxonomy


def build_tag_list_for_prompt(taxonomy):
    """Format taxonomy as a flat list for the LLM prompt."""
    parts = []
    parts.append("SPECIALITIES (pick all that apply):")
    for tag in taxonomy["specialities"]:
        parts.append(f"  - {tag}")
    parts.append("\nSERVICES (pick all that apply):")
    for tag in taxonomy["services"]:
        parts.append(f"  - {tag}")
    parts.append("\nFACILITY FEATURES (pick all that apply):")
    for tag in taxonomy["facility_features"]:
        parts.append(f"  - {tag}")
    return "\n".join(parts)


# ─── Prompts ──────────────────────────────────────────────────────────────────

EXTRACTION_PROMPT = """You are a healthcare facility data extraction expert for Karo Care, an Indian healthcare directory.

Analyze the following data for "{name}" located in {city}, India.
Category: {category}

Your job is to extract structured listing data. Use ONLY information from the provided data — do not fabricate.

INSTRUCTIONS:

1. **description**: Write a single comprehensive 150-300 word description combining:
   - What the facility does, who it serves
   - Key services and specialisations
   - What makes them unique (if evident)
   - Location context
   Write naturally in third person. Do NOT copy text verbatim — rewrite in your own words.

2. **specialities**: From the ALLOWED TAGS below, pick ONLY tags that are clearly supported by the data. Return exact canonical names.

3. **services**: From the ALLOWED TAGS below, pick ONLY tags clearly supported by the data. Return exact canonical names.

4. **facility_features**: From the ALLOWED TAGS below, pick ONLY features clearly mentioned. Return exact canonical names.

5. **facility_type**: Classify as exactly ONE of:
   - "Boarding" — facility where patients/residents STAY (nursing home, old age home, rehab centre with beds)
   - "Day Care" — patients visit during the day but go home at night
   - "Consultation" — outpatient consultation, no stay
   - "Home Visit" — services provided at patient's home
   - "Mixed" — clearly offers multiple types (e.g. boarding + home visit)
   If unclear, use "Unknown".

6. **bed_count**: Number of beds if mentioned. Integer or null.

7. **trust_signals**: Extract any of these if mentioned:
   - accreditations (NABH, ISO, JCI, etc.)
   - notable affiliations (hospital tie-ups, government recognition)
   - years of experience / established year
   - notable testimonials (max 3, brief)
   Return as a flat list of short strings.

ALLOWED TAGS:
{tag_list}

--- BUSINESS DATA ---
Name: {name}
Address: {address}
Phone: {phone}
Rating: {rating} ({reviews} reviews)
Working Hours: {hours}
Google Category: {google_type}

--- WEBSITE CONTENT ---
{content}

Respond with ONLY valid JSON:
{{
  "description": "...",
  "specialities": ["Tag1", "Tag2"],
  "services": ["Tag1", "Tag2"],
  "facility_features": ["Tag1", "Tag2"],
  "facility_type": "Boarding|Day Care|Consultation|Home Visit|Mixed|Unknown",
  "bed_count": null,
  "trust_signals": ["signal1", "signal2"]
}}"""


GENERATION_PROMPT = """You are a healthcare facility content writer for Karo Care, an Indian healthcare directory.

Generate a minimal listing for "{name}" located in {city}, India.
Category: {category}

AVAILABLE DATA:
Name: {name}
Address: {address}
Phone: {phone}
Rating: {rating} ({reviews} reviews)
Working Hours: {hours}
Google Category: {google_type}

INSTRUCTIONS:
1. **description**: Write a brief 50-100 word description based ONLY on what can be reasonably inferred from the name, category, and city. Be factual and general — do NOT fabricate specific claims.

2. **specialities**: From the ALLOWED TAGS below, pick ONLY tags that are clearly implied by the business name or category. Be conservative — if unsure, skip.

3. **services**: Same — only pick tags clearly implied. Be very conservative.

4. **facility_features**: Leave empty [] unless the name clearly implies something (e.g., "24/7" in name → "24/7 Availability").

5. **facility_type**: Infer from category:
   - "Nursing Homes" → "Boarding"
   - "Elder Care" → "Boarding"
   - "Post-Hospital Care" → "Unknown" (could be boarding or home visit)
   - "Home Health Care" → "Home Visit"

6. **bed_count**: null (unknown)

7. **trust_signals**: Empty [] unless evident from name.

ALLOWED TAGS:
{tag_list}

Respond with ONLY valid JSON:
{{
  "description": "...",
  "specialities": ["Tag1"],
  "services": ["Tag1"],
  "facility_features": [],
  "facility_type": "...",
  "bed_count": null,
  "trust_signals": []
}}"""


# ─── Helper Functions ─────────────────────────────────────────────────────────

def get_crawl_content(crawl_data, place_id):
    """Combine all successful crawled pages into a single content string."""
    if place_id not in crawl_data:
        return ""
    entry = crawl_data[place_id]
    pages = entry.get("pages", [])
    parts = []
    for page in pages:
        md = page.get("markdown", "").strip()
        if md and len(md) > 50:
            url = page.get("url", "")
            parts.append(f"--- PAGE: {url} ---\n{md}")
    combined = "\n\n".join(parts)
    return combined[:MAX_CONTENT_CHARS]


def compute_premium(extracted, has_content, rating, reviews):
    """
    Determine if a listing should be flagged as premium based on data richness.
    Premium = has good content + multiple tags + trust signals + good reviews.
    """
    score = 0

    # Content richness
    if has_content:
        score += 2
    desc = extracted.get("description", "")
    if len(desc) > 150:
        score += 1

    # Tags richness
    specialities = extracted.get("specialities", [])
    services = extracted.get("services", [])
    features = extracted.get("facility_features", [])
    total_tags = len(specialities) + len(services) + len(features)
    if total_tags >= 5:
        score += 2
    elif total_tags >= 3:
        score += 1

    # Trust signals
    trust = extracted.get("trust_signals", [])
    if len(trust) >= 2:
        score += 2
    elif len(trust) >= 1:
        score += 1

    # Reviews
    rating = rating or 0
    reviews = reviews or 0
    if reviews >= 20 and rating >= 4.0:
        score += 2
    elif reviews >= 10:
        score += 1

    # Known facility type
    if extracted.get("facility_type") not in ("Unknown", None, ""):
        score += 1

    # Bed count known
    if extracted.get("bed_count"):
        score += 1

    return score >= 6


def validate_tags(extracted, taxonomy):
    """Remove any tags that aren't in the master taxonomy."""
    for group in ("specialities", "services", "facility_features"):
        allowed = set(taxonomy[group])
        raw = extracted.get(group, [])
        if not isinstance(raw, list):
            raw = []
        cleaned = [t for t in raw if t in allowed]
        extracted[group] = cleaned
    return extracted


def load_cache():
    """Load extraction cache for resume support."""
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            return json.load(f)
    return {}


def save_cache(cache):
    """Save extraction cache."""
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, ensure_ascii=False)


# ─── LLM Calls ───────────────────────────────────────────────────────────────

def extract_with_llm(client, name, city, category, address, phone, rating,
                     reviews, hours, google_type, content, tag_list):
    """Use GPT-4o-mini to extract structured data from crawled content."""
    prompt = EXTRACTION_PROMPT.format(
        name=name,
        city=city,
        category=category,
        address=address or "",
        phone=phone or "",
        rating=rating or "N/A",
        reviews=reviews or 0,
        hours=hours or "Not available",
        google_type=google_type or "",
        content=content,
        tag_list=tag_list,
    )

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        result["_source"] = "extracted"
        return result
    except Exception as e:
        print(f"    ✗ LLM extraction error: {e}")
        return {"_source": "error", "_error": str(e)}


def generate_with_llm(client, name, city, category, address, phone, rating,
                      reviews, hours, google_type, tag_list):
    """Use GPT-4o-mini to generate minimal listing content."""
    prompt = GENERATION_PROMPT.format(
        name=name,
        city=city,
        category=category,
        address=address or "",
        phone=phone or "",
        rating=rating or "N/A",
        reviews=reviews or 0,
        hours=hours or "Not available",
        google_type=google_type or "",
        tag_list=tag_list,
    )

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        result["_source"] = "generated"
        return result
    except Exception as e:
        print(f"    ✗ LLM generation error: {e}")
        return {"_source": "error", "_error": str(e)}


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    start_time = time.time()

    print("=" * 70)
    print("  STEP 5: LLM STRUCTURED EXTRACTION")
    print(f"  Model: {OPENAI_MODEL}")
    print("=" * 70)

    # ── Load data ─────────────────────────────────────────────────────────
    print("\n  Loading data...")

    with open(STAGE1_FILE) as f:
        stage1 = json.load(f)
    print(f"  Stage 1 places: {len(stage1)}")

    with open(CLASSIFIED_FILE) as f:
        classified = json.load(f)
    print(f"  Stage 2 classified: {len(classified)}")

    crawl_data = {}
    if CRAWL_FILE.exists():
        with open(CRAWL_FILE) as f:
            crawl_data = json.load(f)
    print(f"  Crawl results: {len(crawl_data)}")

    # Load tag taxonomy
    taxonomy = load_tag_taxonomy()
    tag_list = build_tag_list_for_prompt(taxonomy)
    print(f"  Tags: {sum(len(v) for v in taxonomy.values())} canonical tags across 3 groups")

    # Filter to active listings only
    active_pids = [
        pid for pid, cls in classified.items()
        if cls.get("category") in ACTIVE_CATEGORIES
    ]
    print(f"\n  Active listings to process: {len(active_pids)}")

    # Category breakdown
    cat_counts = Counter(classified[pid]["category"] for pid in active_pids)
    for cat in sorted(ACTIVE_CATEGORIES):
        print(f"    {cat:25s}: {cat_counts.get(cat, 0)}")

    # ── Load cache ────────────────────────────────────────────────────────
    cache = load_cache()
    uncached = [pid for pid in active_pids if pid not in cache]
    print(f"\n  Already cached: {len(cache)}")
    print(f"  Need processing: {len(uncached)}")

    # ── Check API key ─────────────────────────────────────────────────────
    client = None
    if uncached:
        if not OPENAI_API_KEY:
            print(f"\n  ERROR: OPENAI_API_KEY not set. {len(uncached)} entries need extraction.")
            print("  Run: export OPENAI_API_KEY='your-key-here'")
            sys.exit(1)
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
        except ImportError:
            print("  ERROR: openai package not installed. pip install openai")
            sys.exit(1)
    else:
        print("  All entries cached — skipping API calls.")

    # ── Process entries ───────────────────────────────────────────────────
    print(f"\n  --- Processing {len(uncached)} entries ---")

    extracted_count = 0
    generated_count = 0
    error_count = 0
    process_start = time.time()

    for i, pid in enumerate(uncached):
        cls = classified[pid]
        place = stage1.get(pid, {})

        name = place.get("name", cls.get("name", ""))
        city = cls.get("_found_in_city", place.get("_found_in_city", ""))
        category = cls["category"]
        address = place.get("formatted_address", "")
        phone = place.get("phone", "")
        rating = place.get("rating")
        reviews = place.get("reviews", 0)
        hours_list = place.get("working_hours_text", [])
        hours = "; ".join(hours_list) if hours_list else ""
        google_type = place.get("primary_type_display", "")

        # Get crawl content
        content = get_crawl_content(crawl_data, pid)
        has_content = len(content) >= MIN_USEFUL_CONTENT

        if has_content:
            result = extract_with_llm(
                client, name, city, category, address, phone,
                rating, reviews, hours, google_type, content, tag_list,
            )
            mode = "EXTRACT"
            extracted_count += 1
        else:
            result = generate_with_llm(
                client, name, city, category, address, phone,
                rating, reviews, hours, google_type, tag_list,
            )
            mode = "GENERATE"
            generated_count += 1

        if result.get("_source") == "error":
            error_count += 1

        # Validate tags against taxonomy
        result = validate_tags(result, taxonomy)

        # Compute premium flag
        result["is_premium"] = compute_premium(result, has_content, rating, reviews)

        # Store in cache
        cache[pid] = result

        # Progress
        elapsed = time.time() - process_start
        rate = (i + 1) / elapsed * 60 if elapsed > 0 else 0
        remaining = (len(uncached) - i - 1) / rate if rate > 0 else 0

        name_short = name[:40]
        n_tags = len(result.get("specialities", [])) + len(result.get("services", []))
        print(f"  [{i+1}/{len(uncached)}] {mode:8s} {name_short:40s} "
              f"tags={n_tags:2d} premium={'Y' if result.get('is_premium') else 'N'} "
              f"({rate:.0f}/min, ~{remaining:.0f}m left)")

        # Save cache every 25 entries
        if (i + 1) % 25 == 0:
            save_cache(cache)

        # Rate limit
        time.sleep(0.15)

    # Final cache save
    if uncached:
        save_cache(cache)

    # ── Build output ──────────────────────────────────────────────────────
    print(f"\n  --- Building final output ---")

    output = {}
    stats = {
        "total": 0,
        "extracted": 0,
        "generated": 0,
        "premium": 0,
        "with_specialities": 0,
        "with_services": 0,
        "with_features": 0,
        "facility_types": Counter(),
        "by_category": {},
    }

    for pid in active_pids:
        cls = classified[pid]
        place = stage1.get(pid, {})
        result = cache.get(pid)

        if not result:
            continue

        category = cls["category"]

        # Build final listing object
        listing = {
            # Admin fields (from Google)
            "google_place_id": pid,
            "name": place.get("name", cls.get("name", "")),
            "category": category,
            "formatted_address": place.get("formatted_address", ""),
            "short_address": place.get("short_address", ""),
            "city": cls.get("_found_in_city", ""),
            "lat": place.get("lat"),
            "lng": place.get("lng"),
            "rating": place.get("rating"),
            "reviews": place.get("reviews", 0),
            "website": place.get("website", ""),
            "phone": place.get("phone", ""),
            "phone_international": place.get("phone_international", ""),
            "working_hours": place.get("working_hours_text", []),
            "google_maps_link": place.get("google_maps_link", ""),

            # Extracted content
            "description": result.get("description", ""),
            "specialities": result.get("specialities", []),
            "services": result.get("services", []),
            "facility_features": result.get("facility_features", []),
            "facility_type": result.get("facility_type", "Unknown"),
            "bed_count": result.get("bed_count"),
            "trust_signals": result.get("trust_signals", []),
            "is_premium": result.get("is_premium", False),

            # Metadata
            "_source": result.get("_source", "unknown"),
            "_llm_category": cls.get("llm_category", ""),
            "_llm_confidence": cls.get("llm_confidence", ""),
        }

        output[pid] = listing
        stats["total"] += 1

        # Track stats
        source = result.get("_source", "")
        if source == "extracted":
            stats["extracted"] += 1
        elif source == "generated":
            stats["generated"] += 1
        if listing["is_premium"]:
            stats["premium"] += 1
        if listing["specialities"]:
            stats["with_specialities"] += 1
        if listing["services"]:
            stats["with_services"] += 1
        if listing["facility_features"]:
            stats["with_features"] += 1
        stats["facility_types"][listing["facility_type"]] += 1

        if category not in stats["by_category"]:
            stats["by_category"][category] = {
                "total": 0, "premium": 0,
                "avg_tags": 0, "tag_sum": 0,
            }
        stats["by_category"][category]["total"] += 1
        if listing["is_premium"]:
            stats["by_category"][category]["premium"] += 1
        n_tags = len(listing["specialities"]) + len(listing["services"]) + len(listing["facility_features"])
        stats["by_category"][category]["tag_sum"] += n_tags

    # Save output
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # ── Summary ───────────────────────────────────────────────────────────
    elapsed = time.time() - start_time

    print(f"\n{'='*70}")
    print(f"  STEP 5 COMPLETE — {elapsed:.0f}s")
    print(f"{'='*70}")
    print(f"\n  Total listings:    {stats['total']}")
    print(f"  Extracted (web):   {stats['extracted']}")
    print(f"  Generated (thin):  {stats['generated']}")
    print(f"  Premium listings:  {stats['premium']}")
    print(f"  Errors:            {error_count}")

    print(f"\n  --- Tag Coverage ---")
    print(f"  With specialities:      {stats['with_specialities']:5d}  "
          f"({stats['with_specialities']/max(stats['total'],1)*100:.0f}%)")
    print(f"  With services:          {stats['with_services']:5d}  "
          f"({stats['with_services']/max(stats['total'],1)*100:.0f}%)")
    print(f"  With facility features: {stats['with_features']:5d}  "
          f"({stats['with_features']/max(stats['total'],1)*100:.0f}%)")

    print(f"\n  --- Facility Types ---")
    for ft, count in stats["facility_types"].most_common():
        pct = count / max(stats["total"], 1) * 100
        print(f"  {ft:20s}: {count:5d}  ({pct:.0f}%)")

    print(f"\n  --- By Category ---")
    print(f"  {'Category':25s} {'Total':>6s} {'Premium':>8s} {'Avg Tags':>9s}")
    print(f"  {'-'*25} {'-'*6} {'-'*8} {'-'*9}")
    for cat in sorted(ACTIVE_CATEGORIES):
        cs = stats["by_category"].get(cat, {"total": 0, "premium": 0, "tag_sum": 0})
        avg = cs["tag_sum"] / max(cs["total"], 1)
        print(f"  {cat:25s} {cs['total']:6d} {cs['premium']:8d} {avg:9.1f}")

    # Top tags
    print(f"\n  --- Top 15 Speciality Tags ---")
    spec_counts = Counter()
    for listing in output.values():
        for t in listing.get("specialities", []):
            spec_counts[t] += 1
    for tag, count in spec_counts.most_common(15):
        print(f"    {tag:35s}: {count}")

    print(f"\n  --- Top 15 Service Tags ---")
    svc_counts = Counter()
    for listing in output.values():
        for t in listing.get("services", []):
            svc_counts[t] += 1
    for tag, count in svc_counts.most_common(15):
        print(f"    {tag:35s}: {count}")

    print(f"\n  Output: {OUTPUT_FILE}")
    print(f"  Cache:  {CACHE_FILE}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
