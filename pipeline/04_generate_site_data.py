#!/usr/bin/env python3
"""
Step 4: Merge normalized businesses + LLM extractions into final site data JSONs.

Produces:
  - businesses.json — Full array of all business objects
  - cities.json — City metadata with counts
  - categories.json — Category metadata with counts
  - city_category.json — Cross-reference combos
  - search_index.json — Lightweight index for client-side Fuse.js search
"""

import json
from collections import Counter, defaultdict
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
SITE_DATA_DIR = Path(__file__).parent.parent / "site" / "src" / "data"

BUSINESSES_FILE = DATA_DIR / "normalized_businesses.json"
LLM_FILE = DATA_DIR / "llm_extracted.json"

# Category display info
CATEGORY_META = {
    "Nursing Homes": {
        "display_name": "Nursing Homes",
        "slug": "nursing-homes",
        "icon": "building-2",
        "color": "#2563EB",
        "description": "Professional nursing care facilities providing 24/7 medical attention, rehabilitation support, and compassionate care for patients recovering from surgery, illness, or managing chronic conditions.",
        "seo_title": "Best Nursing Homes in Delhi NCR - Ratings & Services",
        "seo_description": "Find top-rated nursing homes in Delhi NCR. Compare facilities, check ratings, compare services, and contact nursing homes near you.",
    },
    "Elder Care": {
        "display_name": "Elder Care",
        "slug": "elder-care",
        "icon": "heart-handshake",
        "color": "#7C3AED",
        "description": "Dedicated elder care facilities and old age homes providing dignified living, medical support, recreational activities, and companionship for senior citizens in Delhi NCR.",
        "seo_title": "Best Elder Care Facilities in Delhi NCR - Old Age Homes",
        "seo_description": "Find trusted elder care facilities and old age homes in Delhi NCR. Compare services, amenities, and ratings for senior living.",
    },
    "Post-Hospital Care": {
        "display_name": "Post-Hospital Care",
        "slug": "post-hospital-care",
        "icon": "activity",
        "color": "#059669",
        "description": "Specialized post-hospital care centers offering physiotherapy, occupational therapy, stroke recovery, post-surgical rehabilitation, and neurological recovery programs.",
        "seo_title": "Best Post-Hospital Care in Delhi NCR - Recovery & Rehab",
        "seo_description": "Find top post-hospital care centers in Delhi NCR. Physiotherapy, post-surgical rehab, stroke recovery, and neurological rehabilitation.",
    },
    "Home Health Care": {
        "display_name": "Home Health Care",
        "slug": "home-health-care",
        "icon": "home",
        "color": "#DC2626",
        "description": "Professional home health care services bringing medical care, nursing, physiotherapy, and elder care support to your doorstep across Delhi NCR.",
        "seo_title": "Best Home Health Care Services in Delhi NCR",
        "seo_description": "Find professional home health care services in Delhi NCR. Nursing at home, physiotherapy, elder care, and post-surgical support.",
    },
}

# City display info
CITY_META = {
    "Delhi": {
        "display_name": "Delhi",
        "slug": "delhi",
        "description": "India's capital territory with the highest concentration of healthcare facilities in NCR.",
        "seo_title": "Best Care Facilities in Delhi - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Delhi. Compare ratings and services.",
    },
    "Gurgaon": {
        "display_name": "Gurgaon",
        "slug": "gurgaon",
        "description": "Millennium City with world-class healthcare infrastructure and modern care facilities.",
        "seo_title": "Best Care Facilities in Gurgaon - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Gurgaon. Compare ratings and services.",
    },
    "Noida": {
        "display_name": "Noida",
        "slug": "noida",
        "description": "Growing hub of quality healthcare services in the NCR region.",
        "seo_title": "Best Care Facilities in Noida - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Noida.",
    },
    "Ghaziabad": {
        "display_name": "Ghaziabad",
        "slug": "ghaziabad",
        "description": "Gateway to UP with expanding healthcare infrastructure.",
        "seo_title": "Best Care Facilities in Ghaziabad - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, and post-hospital care in Ghaziabad.",
    },
    "Faridabad": {
        "display_name": "Faridabad",
        "slug": "faridabad",
        "description": "Major Haryana city with growing healthcare and care facility network.",
        "seo_title": "Best Care Facilities in Faridabad - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, and post-hospital care in Faridabad.",
    },
    "Greater Noida": {
        "display_name": "Greater Noida",
        "slug": "greater-noida",
        "description": "Emerging residential and healthcare hub in the NCR.",
        "seo_title": "Best Care Facilities in Greater Noida",
        "seo_description": "Find care facilities in Greater Noida including nursing homes, elder care, and rehabilitation.",
    },
}


def merge_business(biz: dict, llm_data: dict) -> dict:
    """Merge normalized business data with LLM-extracted content."""
    # Start with the normalized business
    merged = dict(biz)

    if not llm_data or llm_data.get("_source") == "error":
        return merged

    # Merge LLM fields (only overwrite if LLM has non-empty data)
    llm_fields = [
        "about_description", "founding_year", "mission_statement",
        "services", "specializations", "doctors", "team_size",
        "facilities", "bed_count", "testimonials",
        "insurance_accepted", "languages_spoken", "accreditations",
        "faqs", "meta_description", "seo_title", "long_description",
    ]

    for field in llm_fields:
        llm_val = llm_data.get(field)
        if llm_val:  # Non-empty, non-None
            if isinstance(llm_val, list) and len(llm_val) == 0:
                continue
            if isinstance(llm_val, str) and not llm_val.strip():
                continue
            merged[field] = llm_val

    merged["content_source"] = llm_data.get("_source", "unknown")

    # Generate fallback SEO fields if not provided
    if not merged.get("seo_title"):
        merged["seo_title"] = f"{merged['name']} - {merged['category']} in {merged['city']}"[:60]

    if not merged.get("meta_description"):
        merged["meta_description"] = (
            f"{merged['name']} is a {merged['category'].lower()} facility in {merged['city']}. "
            f"Find ratings, services, and contact information."
        )[:155]

    if not merged.get("long_description"):
        merged["long_description"] = merged.get("about_description", "") or merged.get("business_summary", "")

    return merged


def build_search_index(businesses: list) -> list:
    """Build lightweight search index for client-side Fuse.js."""
    index = []
    for biz in businesses:
        entry = {
            "slug": biz["slug"],
            "name": biz["name"],
            "category": biz["category"],
            "category_slug": biz["category_slug"],
            "city": biz["city"],
            "city_slug": biz["city_slug"],
            "rating": biz.get("rating"),
            "reviews": biz.get("reviews", 0),
            "verified": biz.get("verified", False),
            "has_website": bool(biz.get("website")),
            "phone": biz.get("phone", ""),
            "specializations": biz.get("specializations", []),
        }

        # Add first 3 services for search
        services = biz.get("services", [])
        if services:
            entry["service_names"] = [s["name"] for s in services[:5]]

        index.append(entry)

    return index


def main():
    SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("  SITE DATA GENERATOR")
    print("=" * 70)

    # Load sources
    with open(BUSINESSES_FILE, "r") as f:
        businesses_raw = json.load(f)

    llm_data = {}
    if LLM_FILE.exists():
        with open(LLM_FILE, "r") as f:
            llm_data = json.load(f)
        print(f"  LLM extractions loaded: {len(llm_data)}")
    else:
        print("  WARNING: No LLM extraction data found. Using base data only.")

    # ─── Merge businesses ───
    businesses = []
    for biz in businesses_raw:
        slug = biz["slug"]
        llm = llm_data.get(slug, {})
        merged = merge_business(biz, llm)
        businesses.append(merged)

    # Sort by rating desc, reviews desc
    businesses.sort(key=lambda b: (-(b.get("rating") or 0), -(b.get("reviews") or 0)))

    print(f"\n  Total businesses: {len(businesses)}")

    # ─── Build cities.json ───
    city_data = {}
    city_businesses = defaultdict(list)
    for biz in businesses:
        city_businesses[biz["city"]].append(biz)

    for city, bizs in city_businesses.items():
        meta = CITY_META.get(city, {
            "display_name": city,
            "slug": biz["city_slug"] if bizs else city.lower().replace(" ", "-"),
            "description": f"Care facilities in {city}.",
            "seo_title": f"Best Care Facilities in {city}",
            "seo_description": f"Find care facilities in {city}.",
        })

        # Category breakdown for this city
        cat_counts = Counter(b["category"] for b in bizs)

        # Top-rated businesses
        top_rated = sorted(bizs, key=lambda b: (-(b.get("rating") or 0), -(b.get("reviews") or 0)))[:5]

        city_data[meta.get("slug", city.lower())] = {
            **meta,
            "count": len(bizs),
            "category_counts": dict(cat_counts),
            "top_rated_slugs": [b["slug"] for b in top_rated],
            "avg_rating": round(
                sum(b["rating"] for b in bizs if b.get("rating")) /
                max(1, sum(1 for b in bizs if b.get("rating"))),
                2
            ),
        }

    print(f"  Cities: {len(city_data)}")

    # ─── Build categories.json ───
    cat_data = {}
    cat_businesses = defaultdict(list)
    for biz in businesses:
        cat_businesses[biz["category"]].append(biz)

    for cat, bizs in cat_businesses.items():
        meta = CATEGORY_META.get(cat, {
            "display_name": cat,
            "slug": bizs[0]["category_slug"] if bizs else cat.lower().replace(" ", "-"),
            "description": f"{cat} facilities in Delhi NCR.",
        })

        # City breakdown
        city_counts = Counter(b["city"] for b in bizs)

        cat_data[meta.get("slug", cat.lower())] = {
            **meta,
            "category_name": cat,
            "count": len(bizs),
            "city_counts": dict(city_counts),
            "avg_rating": round(
                sum(b["rating"] for b in bizs if b.get("rating")) /
                max(1, sum(1 for b in bizs if b.get("rating"))),
                2
            ),
        }

    print(f"  Categories: {len(cat_data)}")

    # ─── Build city_category.json ───
    city_cat_combos = {}
    for biz in businesses:
        key = f"{biz['city_slug']}/{biz['category_slug']}"
        if key not in city_cat_combos:
            city_meta = CITY_META.get(biz["city"], {})
            cat_meta = CATEGORY_META.get(biz["category"], {})
            city_cat_combos[key] = {
                "city": biz["city"],
                "city_slug": biz["city_slug"],
                "category": biz["category"],
                "category_slug": biz["category_slug"],
                "slug": key,
                "seo_title": f"Best {biz['category']} in {biz['city']} - Ratings & Services",
                "seo_description": f"Find top-rated {biz['category'].lower()} in {biz['city']}. Compare facilities, compare services, and get contact information.",
                "business_slugs": [],
                "count": 0,
            }
        city_cat_combos[key]["business_slugs"].append(biz["slug"])
        city_cat_combos[key]["count"] += 1

    print(f"  City+Category combos: {len(city_cat_combos)}")

    # ─── Build search index ───
    search_index = build_search_index(businesses)

    # ─── Save all files ───
    files = {
        "businesses.json": businesses,
        "cities.json": city_data,
        "categories.json": cat_data,
        "city_category.json": city_cat_combos,
        "search_index.json": search_index,
    }

    for filename, data in files.items():
        filepath = SITE_DATA_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        size_kb = filepath.stat().st_size / 1024
        print(f"  Wrote {filename} ({size_kb:.1f} KB)")

    # ─── Summary ───
    print(f"\n{'='*70}")
    print(f"  SITE DATA GENERATED")
    print(f"{'='*70}")
    print(f"  Businesses: {len(businesses)}")
    print(f"  Cities: {len(city_data)}")
    print(f"  Categories: {len(cat_data)}")
    print(f"  City+Category pages: {len(city_cat_combos)}")

    # Content quality stats
    with_long_desc = sum(1 for b in businesses if len(b.get("long_description", "")) > 100)
    with_services = sum(1 for b in businesses if len(b.get("services", [])) > 0)
    with_doctors = sum(1 for b in businesses if len(b.get("doctors", [])) > 0)
    with_faqs = sum(1 for b in businesses if len(b.get("faqs", [])) > 0)

    print(f"\n  Content quality:")
    print(f"  With long description: {with_long_desc}/{len(businesses)}")
    print(f"  With services: {with_services}/{len(businesses)}")
    print(f"  With doctors: {with_doctors}/{len(businesses)}")
    print(f"  With FAQs: {with_faqs}/{len(businesses)}")

    total_pages = 1 + 1 + len(city_data) + len(cat_data) + len(city_cat_combos) + len(businesses) + 3
    print(f"\n  Estimated total site pages: ~{total_pages}")


if __name__ == "__main__":
    main()
