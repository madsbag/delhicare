#!/usr/bin/env python3
"""
Step 1 (new): Normalize Google Places API data into the same format as
normalized_businesses.json that Steps 2-4 expect.

- Deduplicates by Google Place ID + fuzzy name/location matching
- Classifies into 4 categories using Google types + search query context
- Filters out non-operational, out-of-scope, and general hospitals
- Assigns city from address parsing + nearest city center
- Matches against existing businesses to preserve slugs and LLM data
- Generates URL slugs with collision detection

Usage:
    python pipeline/01_places_normalize.py [--match-existing]

    --match-existing: Try to match against existing normalized_businesses.json
                      to preserve slugs and enriched data
"""

import argparse
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
CONFIG_DIR = SCRIPT_DIR / "config"
DATA_DIR = SCRIPT_DIR / "data"

SEARCH_RAW_FILE = DATA_DIR / "places_search_raw.json"
DETAILS_RAW_FILE = DATA_DIR / "places_details_raw.json"
EXISTING_FILE = DATA_DIR / "normalized_businesses.json"
CATEGORY_MAPPING_FILE = CONFIG_DIR / "category_mapping.json"
CITY_AREAS_FILE = CONFIG_DIR / "city_areas.json"

OUTPUT_FILE = DATA_DIR / "normalized_businesses.json"
BACKUP_FILE = DATA_DIR / "normalized_businesses_backup.json"

# Our 4 directory categories
DIRECTORY_CATEGORIES = [
    "Nursing Homes",
    "Elder Care",
    "Post-Hospital Care",
    "Home Health Care",
]


# ─── Utility Functions ────────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Generate a URL-friendly slug from text."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    text = text.strip("-")
    return text


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two lat/lng points."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def normalize_phone(phone: str) -> str:
    """Normalize phone number to +91XXXXXXXXXX format."""
    if not phone:
        return ""
    phone = str(phone).strip()
    digits = re.sub(r"[^\d+]", "", phone)
    if not digits:
        return ""
    if digits.startswith("91") and len(digits) == 12:
        digits = "+" + digits
    elif digits.startswith("+91"):
        pass
    elif len(digits) == 10:
        digits = "+91" + digits
    return digits


def levenshtein_ratio(s1: str, s2: str) -> float:
    """Calculate normalized Levenshtein similarity (0-1) between two strings."""
    s1 = s1.lower().strip()
    s2 = s2.lower().strip()
    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    len1, len2 = len(s1), len(s2)
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]

    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            matrix[i][j] = min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost,
            )

    distance = matrix[len1][len2]
    max_len = max(len1, len2)
    return 1.0 - (distance / max_len)


def parse_working_hours(hours_list: list) -> dict:
    """Parse Google's weekdayDescriptions list into our working hours format.
    Input: ["Monday: 9:00 AM – 6:00 PM", "Tuesday: 9:00 AM – 6:00 PM", ...]
    Output: {"Monday": "9:00 AM – 6:00 PM", "Tuesday": "9:00 AM – 6:00 PM", ...}
    """
    hours = {}
    if not hours_list:
        return hours
    for entry in hours_list:
        if ":" in entry:
            day, _, time_range = entry.partition(":")
            hours[day.strip()] = time_range.strip()
    return hours


# ─── Main Pipeline ────────────────────────────────────────────────────────────

class PlacesNormalizer:
    """Normalizes Google Places data into the format expected by the site pipeline."""

    def __init__(self, match_existing: bool = False):
        self.match_existing = match_existing
        self.stats = Counter()

        # Load config
        with open(CATEGORY_MAPPING_FILE) as f:
            self.category_mapping = json.load(f)
        with open(CITY_AREAS_FILE) as f:
            self.city_areas = json.load(f)

        # Build city lookup from config
        self.city_configs = self.city_areas.get("cities", {})

        # Load search results
        with open(SEARCH_RAW_FILE) as f:
            self.search_data = json.load(f)
        print(f"  Loaded {len(self.search_data)} places from search results")

        # Load details (optional)
        self.details_data = {}
        if DETAILS_RAW_FILE.exists():
            with open(DETAILS_RAW_FILE) as f:
                self.details_data = json.load(f)
            print(f"  Loaded {len(self.details_data)} place details")

        # Load existing businesses for matching
        self.existing = []
        if match_existing and EXISTING_FILE.exists():
            with open(EXISTING_FILE) as f:
                self.existing = json.load(f)
            print(f"  Loaded {len(self.existing)} existing businesses for matching")

        # Build exclude patterns
        self.exclude_patterns = [
            re.compile(p) for p in self.category_mapping.get("exclude_name_patterns", [])
        ]

    def _should_exclude(self, place: dict) -> bool:
        """Check if a place should be excluded based on types and name patterns."""
        # Check business status
        status = place.get("business_status", "")
        if status and status != "OPERATIONAL":
            self.stats["excluded_not_operational"] += 1
            return True

        # Check excluded types
        place_types = set(place.get("types", []))
        exclude_types = set(self.category_mapping.get("exclude_types", []))

        # Only exclude if the place ONLY has excluded types (not if it also has relevant types)
        type_to_cat = self.category_mapping.get("type_to_category", {})
        has_relevant_type = any(t in type_to_cat for t in place_types)

        if not has_relevant_type:
            # If the primary type is an excluded type, skip
            primary = place.get("primary_type", "")
            if primary in exclude_types:
                self.stats["excluded_type"] += 1
                return True

        # Check name patterns
        name = place.get("name", "")
        for pattern in self.exclude_patterns:
            if pattern.search(name):
                self.stats["excluded_name_pattern"] += 1
                return True

        # Exclude pure physiotherapy clinics
        # Keep multi-specialty facilities that also offer physio (rehab centers, hospitals, etc.)
        if self._is_pure_physio(place):
            self.stats["excluded_pure_physio"] += 1
            return True

        return False

    def _is_pure_physio(self, place: dict) -> bool:
        """Check if a place is exclusively a physiotherapy clinic (not a multi-specialty
        rehab center that also offers physio).

        A place is considered pure physio if:
        - Its Google primary type is physiotherapist/physical_therapy_clinic, OR
        - Its name is dominated by physio terms without multi-specialty indicators
        """
        name_lower = place.get("name", "").lower()
        primary_type = place.get("primary_type", "")
        place_types = set(place.get("types", []))

        has_physio_in_name = any(
            term in name_lower
            for term in ["physio", "physiotherapy", "physical therapy"]
        )

        # If physio isn't even mentioned, not a physio place
        if not has_physio_in_name and primary_type not in ("physiotherapist", "physical_therapy_clinic"):
            return False

        # If Google says it's a physiotherapist/physical_therapy_clinic, it's pure physio
        # UNLESS it also has a relevant type like rehabilitation_center or nursing_home
        type_to_cat = self.category_mapping.get("type_to_category", {})
        has_relevant_type = any(t in type_to_cat for t in place_types)

        if primary_type in ("physiotherapist", "physical_therapy_clinic") and not has_relevant_type:
            return True

        # If physio in name, check for multi-specialty indicators that suggest
        # this is a larger facility where physio is just one service
        if has_physio_in_name:
            multi_specialty_indicators = [
                "neuro", "stroke", "post.?surg", "multi.?spec",
                "hospital", "nursing", "elder", "senior",
                "home care", "home health", "home visit", "home nursing",
                "icu at home", "attendant",
                "old age", "assisted living",
                "poly clinic", "polyclinic",
                "convalescent", "step down", "long term care",
                "palliative", "paralysis", "brain injury",
            ]
            has_multi = any(
                re.search(indicator, name_lower)
                for indicator in multi_specialty_indicators
            )
            if has_multi:
                return False  # It's multi-specialty, keep it

            # No multi-specialty indicators found — this is a pure physio facility
            return True

        return False

    def _classify_category(self, place: dict) -> str | None:
        """Determine which of our 4 categories this place belongs to.

        Strategy:
        1. If Google type directly maps to a category, use it (high confidence)
        2. Always try to infer category from the business name (high confidence)
        3. Only use search query context if the place has a Google type that
           suggests it's a care/health facility (not a random doctor or store)
        """
        type_to_cat = self.category_mapping.get("type_to_category", {})

        # 1. Check Google types for direct mapping
        for ptype in place.get("types", []):
            if ptype in type_to_cat:
                return type_to_cat[ptype]

        # 2. Check primary type for direct mapping
        primary = place.get("primary_type", "")
        if primary in type_to_cat:
            return type_to_cat[primary]

        # 3. Infer from name — most reliable signal after Google type
        name_lower = place.get("name", "").lower()

        # Nursing Homes
        if any(term in name_lower for term in [
            "nursing home", "nursing care", "nursing facility",
            "patient care center", "patient care centre",
            "convalescent", "step down",
            "long term care", "long-term care",
        ]):
            return "Nursing Homes"

        # Elder Care
        if any(term in name_lower for term in [
            "elder care", "elderly care", "old age home", "old age care",
            "senior living", "senior citizen", "senior care",
            "assisted living", "retirement home", "retirement community",
            "aged care", "vriddhashram", "vriddh", "vridh",
            "dementia care", "geriatric care", "geriatric",
            "palliative care", "palliative", "hospice",
        ]):
            return "Elder Care"

        # Post-Hospital Care — require specific post-hospital/medical-rehab terms
        # High-confidence: explicitly medical rehabilitation terms
        if any(re.search(term, name_lower) for term in [
            r"post.?surg", r"post.?hospital", r"post.?operative",
            r"\bstroke\b.*(?:rehab|recovery|care|centre|center)",
            r"\bneuro\b.*(?:rehab|recovery|care|centre|center)",
            r"\bparalysis\b.*(?:rehab|recovery|care|centre|center)",
            r"\bbrain injury\b",
            r"\bspinal\b.*(?:rehab|recovery|injury)",
            r"\bstep.?down\b",
            r"\bconvalescent\b",
        ]):
            return "Post-Hospital Care"

        # Medium-confidence: generic "rehabilitation centre/center" — only accept
        # if the name also contains a medical context word (not just "XYZ Rehabilitation Centre")
        if re.search(r"(?<!de.)(?<!de )rehabilitation\s*(?:centre|center|facility|home)", name_lower):
            medical_context = [
                "neuro", "stroke", "spine", "spinal", "ortho", "physio",
                "medical", "health", "clinical", "therapy", "nursing",
                "cardiac", "pulmonary", "surgical", "hospital",
                "paralysis", "brain", "injury", "recovery",
            ]
            if any(word in name_lower for word in medical_context):
                return "Post-Hospital Care"
            # No medical context — check if Google typed it as rehabilitation_center
            if "rehabilitation_center" in place.get("types", []):
                return "Post-Hospital Care"
            # Otherwise skip — it's likely a social/disability/generic rehab
            self.stats["skipped_generic_rehab"] += 1

        # Home Health Care
        if any(term in name_lower for term in [
            "home health", "home care", "home nursing",
            "home nurse", "nursing at home", "nurse at home",
            "icu at home", "attendant service",
            "home medical", "home patient care",
            "care at home", "at home service",
            "nursing service", "nursing bureau",
            "patient care service", "patient care bureau",
            "patient attendant", "patient caretaker",
            "caretaker service", "caregiver service",
        ]):
            return "Home Health Care"

        # 4. Use search query context ONLY for places with generic health types
        # (health, service, medical_clinic, medical_center) — these are likely
        # care facilities that just have a unique name
        generic_health_types = {"health", "service", "medical_clinic", "medical_center"}
        if primary in generic_health_types or (not primary and place.get("types")):
            categories = place.get("_found_via_categories", [])
            if categories:
                cat_counts = Counter(categories)
                best_cat = cat_counts.most_common(1)[0][0]
                # Only trust search context if the place was found by MULTIPLE
                # queries of the same category (reduces false positives)
                if best_cat in DIRECTORY_CATEGORIES and cat_counts[best_cat] >= 2:
                    return best_cat

        self.stats["unclassified"] += 1
        return None

    def _assign_city(self, place: dict) -> tuple:
        """Assign city name and state from address + coordinates.
        Returns (city_name, state).
        """
        address = place.get("formatted_address", "")
        lat = place.get("lat")
        lng = place.get("lng")
        search_city = place.get("_search_city", "")

        # 1. Try to find city name in the formatted address
        address_lower = address.lower()
        for city_name, config in self.city_configs.items():
            city_lower = city_name.lower()
            # Check both the city name and common variants
            variants = [city_lower]
            if city_lower == "gurgaon":
                variants.append("gurugram")
            elif city_lower == "bangalore":
                variants.append("bengaluru")
            elif city_lower == "kolkata":
                variants.append("calcutta")
            elif city_lower == "chennai":
                variants.append("madras")
            elif city_lower == "mumbai":
                variants.append("bombay")

            for variant in variants:
                if variant in address_lower:
                    return city_name, config.get("state", "")

        # 2. Fall back to nearest city center by coordinates
        if lat and lng:
            min_dist = float("inf")
            nearest_city = None
            for city_name, config in self.city_configs.items():
                center = config["center"]
                dist = haversine_distance(lat, lng, center["lat"], center["lng"])
                radius = config.get("radius", 15000)
                if dist < radius and dist < min_dist:
                    min_dist = dist
                    nearest_city = city_name

            if nearest_city:
                return nearest_city, self.city_configs[nearest_city].get("state", "")

        # 3. Fall back to the city used in the search query
        if search_city and search_city in self.city_configs:
            return search_city, self.city_configs[search_city].get("state", "")

        self.stats["city_unknown"] += 1
        return "Unknown", ""

    def _match_existing_business(self, place: dict, city: str) -> dict | None:
        """Try to match a new place against existing businesses.
        Returns the matching existing business dict, or None.
        """
        if not self.existing:
            return None

        phone = normalize_phone(place.get("phone", ""))
        website = place.get("website", "").strip().rstrip("/").lower()
        name = place.get("name", "")
        lat = place.get("lat")
        lng = place.get("lng")

        for existing in self.existing:
            # Match by phone
            if phone and existing.get("phone") and phone == existing["phone"]:
                return existing

            # Match by website domain
            if website and existing.get("website"):
                existing_domain = existing["website"].strip().rstrip("/").lower()
                # Compare domains (strip protocol)
                w1 = re.sub(r"^https?://", "", website).split("/")[0]
                w2 = re.sub(r"^https?://", "", existing_domain).split("/")[0]
                if w1 and w2 and w1 == w2:
                    return existing

            # Match by name + proximity
            if name and existing.get("name"):
                similarity = levenshtein_ratio(name, existing["name"])
                if similarity > 0.85:
                    # Also check they're in the same city or nearby
                    if existing.get("city") == city:
                        return existing
                    if lat and lng and existing.get("lat") and existing.get("lng"):
                        dist = haversine_distance(lat, lng, existing["lat"], existing["lng"])
                        if dist < 500:
                            return existing

        return None

    def _deduplicate_fuzzy(self, places: list) -> list:
        """Remove fuzzy duplicates (same name + nearby location) beyond Place ID dedup."""
        seen = []
        deduped = []

        for place in places:
            is_dupe = False
            name = place.get("name", "")
            lat = place.get("lat")
            lng = place.get("lng")

            for seen_place in seen:
                seen_name = seen_place.get("name", "")
                seen_lat = seen_place.get("lat")
                seen_lng = seen_place.get("lng")

                if levenshtein_ratio(name, seen_name) > 0.85:
                    if lat and lng and seen_lat and seen_lng:
                        dist = haversine_distance(lat, lng, seen_lat, seen_lng)
                        if dist < 200:
                            is_dupe = True
                            self.stats["fuzzy_duplicates"] += 1
                            break

            if not is_dupe:
                seen.append(place)
                deduped.append(place)

        return deduped

    def normalize_all(self) -> list:
        """Main normalization pipeline."""
        print(f"\n{'='*70}")
        print(f"  NORMALIZING GOOGLE PLACES DATA")
        print(f"{'='*70}")

        # 1. Filter out excluded places
        filtered = []
        for place_id, place in self.search_data.items():
            if self._should_exclude(place):
                continue
            filtered.append(place)

        print(f"  After filtering: {len(filtered)} (excluded {len(self.search_data) - len(filtered)})")

        # 2. Classify into categories
        classified = []
        for place in filtered:
            category = self._classify_category(place)
            if category:
                place["_assigned_category"] = category
                classified.append(place)
            else:
                self.stats["dropped_no_category"] += 1

        print(f"  After classification: {len(classified)} (dropped {len(filtered) - len(classified)} unclassifiable)")

        # 3. Fuzzy deduplication
        deduped = self._deduplicate_fuzzy(classified)
        print(f"  After fuzzy dedup: {len(deduped)} (removed {len(classified) - len(deduped)} fuzzy dupes)")

        # 4. Normalize into output format
        slug_set = set()
        normalized = []

        for place in deduped:
            city, state = self._assign_city(place)
            category = place["_assigned_category"]

            # Match against existing business
            existing_match = None
            if self.match_existing:
                existing_match = self._match_existing_business(place, city)
                if existing_match:
                    self.stats["matched_existing"] += 1

            # Generate slug (reuse existing if matched)
            if existing_match:
                slug = existing_match["slug"]
                if slug in slug_set:
                    # Collision with another matched slug — generate new one
                    base_slug = slugify(f"{place['name']}-{city}")
                    slug = base_slug
                    counter = 1
                    while slug in slug_set:
                        slug = f"{base_slug}-{counter}"
                        counter += 1
            else:
                base_slug = slugify(f"{place['name']}-{city}")
                slug = base_slug
                counter = 1
                while slug in slug_set:
                    slug = f"{base_slug}-{counter}"
                    counter += 1

            slug_set.add(slug)

            # Parse working hours
            hours = parse_working_hours(place.get("working_hours_text", []))

            # Get editorial summary from details
            details = self.details_data.get(place.get("google_place_id", ""), {})
            editorial_summary = details.get("editorial_summary", "")

            # Build normalized business object
            phone = normalize_phone(place.get("phone", ""))
            phone_intl = place.get("phone_international", "")

            business = {
                "slug": slug,
                "name": place.get("name", ""),
                "category": category,
                "category_slug": slugify(category),
                "google_category": place.get("primary_type_display", ""),
                "city": city,
                "city_slug": slugify(city),
                "state": state,
                "full_address": place.get("formatted_address", ""),
                "phone": phone or normalize_phone(phone_intl),
                "phone2": "",
                "phone3": "",
                "email": "",
                "email2": "",
                "website": place.get("website", ""),
                "rating": place.get("rating"),
                "reviews": place.get("reviews", 0) or 0,
                "verified": True,  # All Google Places results are verified listings
                "working_hours": hours,
                "lat": place.get("lat"),
                "lng": place.get("lng"),
                "google_maps_link": place.get("google_maps_link", ""),
                "facebook": "",
                "instagram": "",
                "linkedin": "",
                "twitter": "",
                "whatsapp": "",
                "contact_name": "",
                "contact_title": "",
                # Classification metadata
                "original_sheet_category": "",
                "category_match": "",
                "inferred_category": "",
                "classification_keywords": "",
                "business_summary": editorial_summary,
                # Placeholders for LLM extraction (Steps 3-4)
                "services": [],
                "specializations": [],
                "doctors": [],
                "facilities": [],
                "testimonials": [],
                "faqs": [],
                "about_description": editorial_summary,
                "long_description": "",
                "meta_description": "",
                "seo_title": "",
                # New fields from Google Places
                "google_place_id": place.get("google_place_id", ""),
                "google_types": place.get("types", []),
                "data_source": "google_places_api",
                "editorial_summary": editorial_summary,
                # Photos added later by 04_generate_site_data.py from 02_fetch_photos.py output
                "photos": [],
            }

            # Carry over existing enriched data if matched
            if existing_match:
                carry_over_fields = [
                    "phone2", "phone3", "email", "email2",
                    "facebook", "instagram", "linkedin", "twitter", "whatsapp",
                    "contact_name", "contact_title",
                    "services", "specializations", "doctors", "facilities",
                    "testimonials", "faqs",
                    "about_description", "long_description", "meta_description", "seo_title",
                    "business_summary", "classification_keywords",
                ]
                for field in carry_over_fields:
                    existing_val = existing_match.get(field)
                    if existing_val:
                        # Only carry over if existing has non-empty data
                        if isinstance(existing_val, list) and len(existing_val) > 0:
                            business[field] = existing_val
                        elif isinstance(existing_val, str) and existing_val.strip():
                            business[field] = existing_val

                business["data_source"] = "google_places_api+existing"

            normalized.append(business)

        return normalized

    def save(self, businesses: list):
        """Save normalized businesses, backing up existing file first."""
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        # Backup existing file
        if EXISTING_FILE.exists() and self.match_existing:
            import shutil
            shutil.copy2(EXISTING_FILE, BACKUP_FILE)
            print(f"  Backed up existing data to {BACKUP_FILE}")

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(businesses, f, indent=2, ensure_ascii=False)

        print(f"  Saved {len(businesses)} businesses to {OUTPUT_FILE}")

    def print_summary(self, businesses: list):
        print(f"\n{'='*70}")
        print(f"  NORMALIZATION COMPLETE")
        print(f"{'='*70}")
        print(f"  Total businesses: {len(businesses)}")

        cat_counts = Counter(b["category"] for b in businesses)
        print(f"\n  By category:")
        for cat, count in cat_counts.most_common():
            print(f"    {cat}: {count}")

        city_counts = Counter(b["city"] for b in businesses)
        print(f"\n  By city (top 20):")
        for city, count in city_counts.most_common(20):
            print(f"    {city}: {count}")

        with_website = sum(1 for b in businesses if b["website"])
        with_phone = sum(1 for b in businesses if b["phone"])
        with_rating = sum(1 for b in businesses if b["rating"])
        with_coords = sum(1 for b in businesses if b["lat"])

        print(f"\n  Data completeness:")
        print(f"    With website: {with_website}")
        print(f"    With phone: {with_phone}")
        print(f"    With rating: {with_rating}")
        print(f"    With coordinates: {with_coords}")

        source_counts = Counter(b["data_source"] for b in businesses)
        print(f"\n  Data source:")
        for src, count in source_counts.most_common():
            print(f"    {src}: {count}")

        print(f"\n  Pipeline stats:")
        for key, val in sorted(self.stats.items()):
            print(f"    {key}: {val}")

        print(f"\n  Output: {OUTPUT_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Normalize Google Places data")
    parser.add_argument(
        "--match-existing", action="store_true",
        help="Match against existing normalized_businesses.json to preserve slugs/data",
    )
    args = parser.parse_args()

    normalizer = PlacesNormalizer(match_existing=args.match_existing)
    businesses = normalizer.normalize_all()
    normalizer.save(businesses)
    normalizer.print_summary(businesses)


if __name__ == "__main__":
    main()
