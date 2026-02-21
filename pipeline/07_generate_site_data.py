#!/usr/bin/env python3
"""
Step 7: Generate final site data JSONs from pipeline outputs.

Reads:
  - pipeline/data/llm_extracted.json         (LLM-enriched data, keyed by google_place_id)
  - pipeline/data/places_photos.json         (optional: Google Place photos)

Produces (in site/src/data/):
  - businesses.json     — Full Business[] array
  - cities.json         — Record<city_slug, CityData>
  - categories.json     — Record<category_slug, CategoryData>
  - city_category.json  — Record<"city_slug/category_slug", CityCategoryData>
  - search_index.json   — SearchEntry[] for client-side Fuse.js

Usage:
    python pipeline/07_generate_site_data.py
"""

import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
SITE_DATA_DIR = Path(__file__).parent.parent / "site" / "src" / "data"

LLM_FILE = DATA_DIR / "llm_extracted.json"
PHOTOS_FILE = DATA_DIR / "places_photos.json"

ACTIVE_CATEGORIES = {"Nursing Homes", "Elder Care", "Post-Hospital Care", "Home Health Care"}


# ─── Slug Generation ─────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    text = text.strip("-")
    return text[:80]  # cap length


def make_unique_slug(base_slug: str, existing: set) -> str:
    """Ensure slug uniqueness by appending -2, -3, etc."""
    if base_slug not in existing:
        return base_slug
    n = 2
    while f"{base_slug}-{n}" in existing:
        n += 1
    return f"{base_slug}-{n}"


# ─── Category Metadata ───────────────────────────────────────────────────────

CATEGORY_META = {
    "Nursing Homes": {
        "display_name": "Nursing Homes",
        "slug": "nursing-homes",
        "icon": "building-2",
        "color": "#2563EB",
        "description": "Professional nursing care facilities providing 24/7 medical attention, rehabilitation support, and compassionate care for patients recovering from surgery, illness, or managing chronic conditions.",
        "seo_title": "Best Nursing Homes in India - Ratings & Services",
        "seo_description": "Find top-rated nursing homes across India. Compare facilities, check ratings, compare services, and contact nursing homes near you.",
    },
    "Elder Care": {
        "display_name": "Elder Care",
        "slug": "elder-care",
        "icon": "heart-handshake",
        "color": "#7C3AED",
        "description": "Dedicated elder care facilities and old age homes providing dignified living, medical support, recreational activities, and companionship for senior citizens.",
        "seo_title": "Best Elder Care Facilities in India - Old Age Homes",
        "seo_description": "Find trusted elder care facilities and old age homes across India. Compare services, amenities, and ratings for senior living.",
    },
    "Post-Hospital Care": {
        "display_name": "Post-Hospital Care",
        "slug": "post-hospital-care",
        "icon": "activity",
        "color": "#059669",
        "description": "Specialized post-hospital care centers offering physiotherapy, occupational therapy, stroke recovery, post-surgical rehabilitation, and neurological recovery programs.",
        "seo_title": "Best Post-Hospital Care in India - Recovery & Rehab",
        "seo_description": "Find top post-hospital care centers across India. Physiotherapy, post-surgical rehab, stroke recovery, and neurological rehabilitation.",
    },
    "Home Health Care": {
        "display_name": "Home Health Care",
        "slug": "home-health-care",
        "icon": "home",
        "color": "#DC2626",
        "description": "Professional home health care services bringing medical care, nursing, physiotherapy, and elder care support to your doorstep.",
        "seo_title": "Best Home Health Care Services in India",
        "seo_description": "Find professional home health care services across India. Nursing at home, physiotherapy, elder care, and post-surgical support.",
    },
}


# ─── City Metadata ────────────────────────────────────────────────────────────

CITY_META = {
    "Delhi": {
        "display_name": "Delhi",
        "slug": "delhi",
        "description": "India's capital territory with the highest concentration of healthcare and care facilities.",
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
    "Mumbai": {
        "display_name": "Mumbai",
        "slug": "mumbai",
        "description": "India's financial capital with a comprehensive network of healthcare and care facilities.",
        "seo_title": "Best Care Facilities in Mumbai - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Mumbai.",
    },
    "Bangalore": {
        "display_name": "Bangalore",
        "slug": "bangalore",
        "description": "India's tech hub with world-class healthcare infrastructure and modern care facilities.",
        "seo_title": "Best Care Facilities in Bangalore - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Bangalore.",
    },
    "Chennai": {
        "display_name": "Chennai",
        "slug": "chennai",
        "description": "Major healthcare destination in South India with a wide range of care facilities.",
        "seo_title": "Best Care Facilities in Chennai - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Chennai.",
    },
    "Hyderabad": {
        "display_name": "Hyderabad",
        "slug": "hyderabad",
        "description": "Growing healthcare hub in Telangana with modern care facilities and services.",
        "seo_title": "Best Care Facilities in Hyderabad - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Hyderabad.",
    },
    "Pune": {
        "display_name": "Pune",
        "slug": "pune",
        "description": "Maharashtra's second-largest city with excellent healthcare and care facility options.",
        "seo_title": "Best Care Facilities in Pune - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Pune.",
    },
    "Kolkata": {
        "display_name": "Kolkata",
        "slug": "kolkata",
        "description": "Eastern India's premier city with established healthcare and elder care infrastructure.",
        "seo_title": "Best Care Facilities in Kolkata - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Kolkata.",
    },
    "Ahmedabad": {
        "display_name": "Ahmedabad",
        "slug": "ahmedabad",
        "description": "Gujarat's largest city with a growing network of healthcare and care facilities.",
        "seo_title": "Best Care Facilities in Ahmedabad - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Ahmedabad.",
    },
    "Jaipur": {
        "display_name": "Jaipur",
        "slug": "jaipur",
        "description": "Rajasthan's capital with expanding healthcare infrastructure and care facilities.",
        "seo_title": "Best Care Facilities in Jaipur - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Jaipur.",
    },
    "Lucknow": {
        "display_name": "Lucknow",
        "slug": "lucknow",
        "description": "Uttar Pradesh's capital with growing healthcare and elder care services.",
        "seo_title": "Best Care Facilities in Lucknow - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Lucknow.",
    },
    "Chandigarh": {
        "display_name": "Chandigarh",
        "slug": "chandigarh",
        "description": "Well-planned city with excellent healthcare infrastructure and care services.",
        "seo_title": "Best Care Facilities in Chandigarh - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Chandigarh.",
    },
    "Kochi": {
        "display_name": "Kochi",
        "slug": "kochi",
        "description": "Kerala's commercial capital with renowned healthcare and elder care facilities.",
        "seo_title": "Best Care Facilities in Kochi - Directory & Ratings",
        "seo_description": "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Kochi.",
    },
}


# ─── Build Functions ──────────────────────────────────────────────────────────

def build_businesses(llm_data: dict, photos_data: dict) -> list:
    """Build the full Business[] array from LLM-extracted data."""
    businesses = []
    slug_set = set()

    for pid, entry in llm_data.items():
        category = entry.get("category", "")
        if category not in ACTIVE_CATEGORIES:
            continue

        name = entry.get("name", "")
        city = entry.get("city", "")

        if not name or not city:
            continue

        # Generate unique slug
        base_slug = slugify(f"{name}-{city}")
        if not base_slug:
            base_slug = slugify(name) or f"facility-{pid[:8]}"
        slug = make_unique_slug(base_slug, slug_set)
        slug_set.add(slug)

        # Category and city slugs
        cat_meta = CATEGORY_META.get(category, {})
        category_slug = cat_meta.get("slug", slugify(category))

        city_meta = CITY_META.get(city, {})
        city_slug = city_meta.get("slug", slugify(city))

        # Build business object matching the Business interface in types.ts
        business = {
            # Identity
            "slug": slug,
            "name": name,
            "category": category,
            "category_slug": category_slug,
            "city": city,
            "city_slug": city_slug,

            # Contact & Location
            "formatted_address": entry.get("formatted_address", ""),
            "short_address": entry.get("short_address", ""),
            "phone": entry.get("phone", ""),
            "phone_international": entry.get("phone_international", ""),
            "website": entry.get("website", ""),
            "lat": entry.get("lat"),
            "lng": entry.get("lng"),
            "google_maps_link": entry.get("google_maps_link", ""),

            # Ratings
            "rating": entry.get("rating"),
            "reviews": entry.get("reviews", 0),

            # Operations
            "working_hours": entry.get("working_hours", []),

            # LLM-Extracted Content
            "description": entry.get("description", ""),
            "specialities": entry.get("specialities", []),
            "services": [],  # Dropped — generic and overlapping with categories
            "facility_features": entry.get("facility_features", []),
            "facility_type": entry.get("facility_type", "Unknown"),
            "bed_count": entry.get("bed_count"),
            "trust_signals": entry.get("trust_signals", []),
            "is_premium": entry.get("is_premium", False),

            # Google Places
            "google_place_id": pid,
        }

        # Add photos if available
        if pid in photos_data and photos_data[pid].get("photos"):
            business["photos"] = photos_data[pid]["photos"]

        businesses.append(business)

    # Sort: rating desc, reviews desc
    businesses.sort(key=lambda b: (-(b.get("rating") or 0), -(b.get("reviews") or 0)))

    return businesses


def build_cities(businesses: list) -> dict:
    """Build cities.json — Record<city_slug, CityData>."""
    city_businesses = defaultdict(list)
    for biz in businesses:
        city_businesses[biz["city"]].append(biz)

    city_data = {}
    for city, bizs in city_businesses.items():
        meta = CITY_META.get(city, {
            "display_name": city,
            "slug": bizs[0]["city_slug"],
            "description": f"Find quality healthcare and care facilities in {city}.",
            "seo_title": f"Best Care Facilities in {city} - Directory & Ratings",
            "seo_description": f"Find top-rated nursing homes, elder care, post-hospital care, and home health care in {city}.",
        })

        cat_counts = Counter(b["category"] for b in bizs)
        top_rated = sorted(bizs, key=lambda b: (-(b.get("rating") or 0), -(b.get("reviews") or 0)))[:5]
        rated_bizs = [b for b in bizs if b.get("rating")]

        city_slug = meta.get("slug", bizs[0]["city_slug"])
        city_data[city_slug] = {
            **meta,
            "count": len(bizs),
            "category_counts": dict(cat_counts),
            "top_rated_slugs": [b["slug"] for b in top_rated],
            "avg_rating": round(
                sum(b["rating"] for b in rated_bizs) / max(1, len(rated_bizs)),
                2
            ),
        }

    return city_data


def build_categories(businesses: list) -> dict:
    """Build categories.json — Record<category_slug, CategoryData>."""
    cat_businesses = defaultdict(list)
    for biz in businesses:
        cat_businesses[biz["category"]].append(biz)

    cat_data = {}
    for cat, bizs in cat_businesses.items():
        meta = CATEGORY_META.get(cat, {
            "display_name": cat,
            "slug": bizs[0]["category_slug"],
            "description": f"{cat} facilities across India.",
        })

        city_counts = Counter(b["city"] for b in bizs)
        rated_bizs = [b for b in bizs if b.get("rating")]

        cat_slug = meta.get("slug", bizs[0]["category_slug"])
        cat_data[cat_slug] = {
            **meta,
            "category_name": cat,
            "count": len(bizs),
            "city_counts": dict(city_counts),
            "avg_rating": round(
                sum(b["rating"] for b in rated_bizs) / max(1, len(rated_bizs)),
                2
            ),
        }

    return cat_data


def build_city_categories(businesses: list) -> dict:
    """Build city_category.json — Record<"city_slug/category_slug", CityCategoryData>."""
    combos = {}
    for biz in businesses:
        key = f"{biz['city_slug']}/{biz['category_slug']}"
        if key not in combos:
            combos[key] = {
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
        combos[key]["business_slugs"].append(biz["slug"])
        combos[key]["count"] += 1

    return combos


def build_search_index(businesses: list) -> list:
    """Build lightweight SearchEntry[] for client-side Fuse.js search."""
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
            "has_website": bool(biz.get("website")),
            "phone": biz.get("phone", ""),
            "specialities": biz.get("specialities", []),
            "services": [],
            "is_premium": biz.get("is_premium", False),
        }
        index.append(entry)
    return index


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("  STEP 7: SITE DATA GENERATOR")
    print("=" * 70)

    # ── Load sources ──────────────────────────────────────────────────────
    print("\n  Loading data...")

    with open(LLM_FILE, "r") as f:
        llm_data = json.load(f)
    print(f"  LLM extractions: {len(llm_data)} entries")

    active_count = sum(1 for v in llm_data.values() if v.get("category") in ACTIVE_CATEGORIES)
    print(f"  Active listings: {active_count}")

    photos_data = {}
    if PHOTOS_FILE.exists():
        with open(PHOTOS_FILE, "r") as f:
            photos_data = json.load(f)
        with_photos = sum(1 for v in photos_data.values() if v.get("photos"))
        print(f"  Photos: {len(photos_data)} records ({with_photos} with photos)")
    else:
        print("  Photos: none (run 06_fetch_photos.py to add)")

    # ── Build all data ────────────────────────────────────────────────────
    print("\n  Building site data...")

    businesses = build_businesses(llm_data, photos_data)
    print(f"  Businesses: {len(businesses)}")

    city_data = build_cities(businesses)
    print(f"  Cities: {len(city_data)}")

    cat_data = build_categories(businesses)
    print(f"  Categories: {len(cat_data)}")

    city_cat_combos = build_city_categories(businesses)
    print(f"  City+Category combos: {len(city_cat_combos)}")

    search_index = build_search_index(businesses)
    print(f"  Search index entries: {len(search_index)}")

    # ── Save all files ────────────────────────────────────────────────────
    print("\n  Writing files...")

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
        print(f"    {filename:25s} {size_kb:8.1f} KB")

    # ── Summary stats ─────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"  SUMMARY")
    print(f"{'='*70}")

    # Category breakdown
    cat_counts = Counter(b["category"] for b in businesses)
    print(f"\n  By Category:")
    for cat in sorted(ACTIVE_CATEGORIES):
        print(f"    {cat:25s}: {cat_counts.get(cat, 0):5d}")

    # City breakdown
    city_counts = Counter(b["city"] for b in businesses)
    print(f"\n  By City (top 10):")
    for city, count in city_counts.most_common(10):
        print(f"    {city:25s}: {count:5d}")

    # Content quality
    premium = sum(1 for b in businesses if b.get("is_premium"))
    with_desc = sum(1 for b in businesses if len(b.get("description", "")) > 100)
    with_specs = sum(1 for b in businesses if b.get("specialities"))
    with_feats = sum(1 for b in businesses if b.get("facility_features"))
    with_phone = sum(1 for b in businesses if b.get("phone"))
    with_web = sum(1 for b in businesses if b.get("website"))

    print(f"\n  Content Quality:")
    print(f"    Premium listings:   {premium:5d}  ({premium/len(businesses)*100:.0f}%)")
    print(f"    With description:   {with_desc:5d}  ({with_desc/len(businesses)*100:.0f}%)")
    print(f"    With specialities:  {with_specs:5d}  ({with_specs/len(businesses)*100:.0f}%)")
    print(f"    With features:      {with_feats:5d}  ({with_feats/len(businesses)*100:.0f}%)")
    print(f"    With phone:         {with_phone:5d}  ({with_phone/len(businesses)*100:.0f}%)")
    print(f"    With website:       {with_web:5d}  ({with_web/len(businesses)*100:.0f}%)")

    # Facility types
    ft_counts = Counter(b.get("facility_type", "Unknown") for b in businesses)
    print(f"\n  Facility Types:")
    for ft, count in ft_counts.most_common():
        print(f"    {ft:20s}: {count:5d}")

    # Top specialities
    spec_counts = Counter()
    for b in businesses:
        for t in b.get("specialities", []):
            spec_counts[t] += 1
    print(f"\n  Top 10 Specialities:")
    for tag, count in spec_counts.most_common(10):
        print(f"    {tag:35s}: {count:5d}")

    # Estimated pages
    total_pages = (
        1  # homepage
        + 1  # directory
        + 1  # map
        + len(city_data)  # city pages
        + len(cat_data)  # category pages
        + len(city_cat_combos)  # city+category pages
        + len(businesses)  # detail pages
        + 4  # about, contact, feedback, etc.
    )
    print(f"\n  Estimated site pages: ~{total_pages}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
