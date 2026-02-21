#!/usr/bin/env python3
"""
Step 0: Discover healthcare businesses using Google Places API (New) Text Search.

Searches across all configured cities using all search terms per category.
Results are deduplicated by Google Place ID and cached for resume support.

Usage:
    export GOOGLE_PLACES_API_KEY="your-key-here"
    python3 pipeline/00_places_search.py [--sub-areas] [--dry-run]

    --sub-areas: Also search within sub-areas of major metros (e.g., Dwarka, Koramangala)
    --dry-run:   Print query plan without making API calls
"""

import argparse
import json
import os
import sys
import time
from collections import Counter
from pathlib import Path

import requests

# ─── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
CONFIG_DIR = SCRIPT_DIR / "config"
DATA_DIR = SCRIPT_DIR / "data"

SEARCH_QUERIES_FILE = CONFIG_DIR / "search_queries.json"
CITY_AREAS_FILE = CONFIG_DIR / "city_areas.json"

OUTPUT_FILE = DATA_DIR / "places_search_raw.json"
CACHE_FILE = DATA_DIR / "places_search_cache.json"

API_BASE_URL = "https://places.googleapis.com/v1/places:searchText"

# Fields to request (Pro tier — includes contact info and hours)
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.regularOpeningHours",
    "places.businessStatus",
    "places.googleMapsUri",
    "places.types",
    "places.primaryType",
    "places.primaryTypeDisplayName",
    "nextPageToken",
])

MAX_PAGES_PER_QUERY = 3  # Up to 60 results per query
PAGE_SIZE = 20
RATE_LIMIT_SECONDS = 0.5  # 2 requests per second (conservative)


class RateLimiter:
    """Simple rate limiter to stay within API quotas."""

    def __init__(self, min_interval: float = RATE_LIMIT_SECONDS):
        self.min_interval = min_interval
        self.last_request_time = 0.0

    def wait(self):
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()


class PlacesSearchPipeline:
    """Searches for healthcare businesses using Google Places Text Search API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.rate_limiter = RateLimiter()
        self.results: dict = {}  # place_id -> place data
        self.cache: dict = {"completed_queries": [], "total_api_calls": 0}
        self.stats = Counter()

        # Load config
        with open(SEARCH_QUERIES_FILE) as f:
            self.search_queries = json.load(f)
        with open(CITY_AREAS_FILE) as f:
            self.city_areas = json.load(f)

        # Load existing results and cache for resume
        if OUTPUT_FILE.exists():
            with open(OUTPUT_FILE) as f:
                self.results = json.load(f)
            print(f"  Loaded {len(self.results)} existing places from cache")

        if CACHE_FILE.exists():
            with open(CACHE_FILE) as f:
                self.cache = json.load(f)
            print(f"  Loaded cache: {len(self.cache['completed_queries'])} queries completed previously")

    def _make_request(self, text_query: str, location_bias: dict, page_token: str = None) -> dict:
        """Execute a single Text Search API request with retry logic."""
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        }

        body = {
            "textQuery": text_query,
            "languageCode": "en",
            "regionCode": "IN",
            "pageSize": PAGE_SIZE,
        }

        if location_bias:
            body["locationBias"] = {
                "circle": {
                    "center": {
                        "latitude": location_bias["lat"],
                        "longitude": location_bias["lng"],
                    },
                    "radius": float(location_bias["radius"]),
                }
            }

        if page_token:
            body["pageToken"] = page_token

        max_retries = 3
        for attempt in range(max_retries):
            self.rate_limiter.wait()
            try:
                response = requests.post(API_BASE_URL, headers=headers, json=body, timeout=30)

                if response.status_code == 200:
                    self.cache["total_api_calls"] = self.cache.get("total_api_calls", 0) + 1
                    return response.json()
                elif response.status_code == 429:
                    wait_time = (2 ** attempt) * 5
                    print(f"    Rate limited. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                elif response.status_code >= 500:
                    wait_time = 2 ** attempt
                    print(f"    Server error {response.status_code}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"    API error {response.status_code}: {response.text[:200]}")
                    return {}
            except requests.exceptions.RequestException as e:
                wait_time = 2 ** attempt
                print(f"    Request error: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)

        print(f"    Failed after {max_retries} retries")
        return {}

    def _process_places(self, places: list, query_text: str, city_name: str, category: str):
        """Process and store places from API response, deduplicating by place ID."""
        for place in places:
            place_id = place.get("id")
            if not place_id:
                continue

            if place_id in self.results:
                # Already seen — just add this query to the discovery context
                existing = self.results[place_id]
                if query_text not in existing.get("_found_via_queries", []):
                    existing["_found_via_queries"].append(query_text)
                if category not in existing.get("_found_via_categories", []):
                    existing["_found_via_categories"].append(category)
                self.stats["duplicates"] += 1
                continue

            # New place — extract and store
            display_name = place.get("displayName", {})
            location = place.get("location", {})
            opening_hours = place.get("regularOpeningHours", {})

            self.results[place_id] = {
                "google_place_id": place_id,
                "name": display_name.get("text", ""),
                "name_language": display_name.get("languageCode", "en"),
                "formatted_address": place.get("formattedAddress", ""),
                "short_address": place.get("shortFormattedAddress", ""),
                "lat": location.get("latitude"),
                "lng": location.get("longitude"),
                "rating": place.get("rating"),
                "reviews": place.get("userRatingCount", 0),
                "website": place.get("websiteUri", ""),
                "phone": place.get("nationalPhoneNumber", ""),
                "phone_international": place.get("internationalPhoneNumber", ""),
                "working_hours_text": opening_hours.get("weekdayDescriptions", []),
                "business_status": place.get("businessStatus", ""),
                "google_maps_link": place.get("googleMapsUri", ""),
                "types": place.get("types", []),
                "primary_type": place.get("primaryType", ""),
                "primary_type_display": place.get("primaryTypeDisplayName", {}).get("text", ""),
                # Discovery metadata
                "_found_via_queries": [query_text],
                "_found_via_categories": [category],
                "_found_in_city": city_name,
                "_search_city": city_name,
            }
            self.stats["new_places"] += 1

    def _run_query(self, query_text: str, city_name: str, city_config: dict, category: str):
        """Run a single search query with pagination."""
        cache_key = f"{query_text}|{city_name}"

        if cache_key in self.cache["completed_queries"]:
            self.stats["skipped_cached"] += 1
            return

        location_bias = {
            "lat": city_config["center"]["lat"],
            "lng": city_config["center"]["lng"],
            "radius": city_config.get("radius", 15000),
        }

        page_token = None
        for page in range(MAX_PAGES_PER_QUERY):
            result = self._make_request(query_text, location_bias, page_token)

            places = result.get("places", [])
            if places:
                self._process_places(places, query_text, city_name, category)
                self.stats["queries_with_results"] += 1

            page_token = result.get("nextPageToken")
            if not page_token:
                break

            self.stats["pagination_requests"] += 1

        self.cache["completed_queries"].append(cache_key)
        self.stats["queries_completed"] += 1

    def _build_query_plan(self, include_sub_areas: bool = False) -> list:
        """Build the full list of (query_text, city_name, city_config, category) tuples."""
        queries = []

        all_cities = self.city_areas.get("cities", {})
        all_terms = self.search_queries.get("terms", {})

        # All search terms × all cities
        for category, terms in all_terms.items():
            for term in terms:
                for city_name, city_config in all_cities.items():
                    query_text = f"{term} in {city_name}"
                    queries.append((query_text, city_name, city_config, category))

        # Sub-area queries for cities that have sub_areas defined
        if include_sub_areas:
            for category, terms in all_terms.items():
                for term in terms:
                    for city_name, city_config in all_cities.items():
                        for area in city_config.get("sub_areas", []):
                            query_text = f"{term} in {area}"
                            queries.append((query_text, city_name, city_config, category))

        return queries

    def search_all(self, include_sub_areas: bool = False, dry_run: bool = False):
        """Run all search queries."""
        queries = self._build_query_plan(include_sub_areas)

        # Count how many are already cached
        cached_count = sum(
            1 for q, c, _, _ in queries
            if f"{q}|{c}" in self.cache["completed_queries"]
        )

        print(f"\n{'='*70}")
        print(f"  GOOGLE PLACES TEXT SEARCH")
        print(f"{'='*70}")
        print(f"  Total queries planned: {len(queries)}")
        print(f"  Already completed: {cached_count}")
        print(f"  Remaining: {len(queries) - cached_count}")
        print(f"  Sub-areas: {'yes' if include_sub_areas else 'no'}")
        print(f"  Existing places in database: {len(self.results)}")

        if dry_run:
            city_counts = Counter()
            cat_counts = Counter()
            for query_text, city_name, _, category in queries:
                city_counts[city_name] += 1
                cat_counts[category] += 1

            print(f"\n  Queries by city (top 20):")
            for city, count in city_counts.most_common(20):
                print(f"    {city}: {count}")

            print(f"\n  Queries by category:")
            for cat, count in cat_counts.most_common():
                print(f"    {cat}: {count}")

            est_cost_india = len(queries) * 9.60 / 1000
            print(f"\n  Estimated API cost (India billing): ${est_cost_india:.2f}")
            print(f"  Free tier (35,000/month): {'WITHIN FREE TIER' if len(queries) < 35000 else 'EXCEEDS FREE TIER'}")
            return

        # Run queries
        for i, (query_text, city_name, city_config, category) in enumerate(queries):
            cache_key = f"{query_text}|{city_name}"
            if cache_key in self.cache["completed_queries"]:
                continue

            progress = f"[{i+1}/{len(queries)}]"
            print(f"  {progress} {query_text} ({category})")

            self._run_query(query_text, city_name, city_config, category)

            # Save periodically (every 50 queries)
            if (i + 1) % 50 == 0:
                self._save()
                print(f"    --- Checkpoint: {len(self.results)} unique places, {self.cache['total_api_calls']} API calls ---")

        # Final save
        self._save()

    def _save(self):
        """Save results and cache to disk."""
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)

        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def print_summary(self):
        """Print summary statistics."""
        print(f"\n{'='*70}")
        print(f"  SEARCH COMPLETE")
        print(f"{'='*70}")
        print(f"  Total unique places: {len(self.results)}")
        print(f"  Total API calls: {self.cache.get('total_api_calls', 0)}")
        print(f"  New places found this run: {self.stats['new_places']}")
        print(f"  Duplicate hits: {self.stats['duplicates']}")
        print(f"  Queries completed: {self.stats['queries_completed']}")
        print(f"  Queries skipped (cached): {self.stats['skipped_cached']}")

        # City breakdown
        city_counts = Counter()
        for place in self.results.values():
            city_counts[place.get("_search_city", "Unknown")] += 1

        print(f"\n  Places by city (top 20):")
        for city, count in city_counts.most_common(20):
            print(f"    {city}: {count}")

        # Category breakdown (from search queries)
        cat_counts = Counter()
        for place in self.results.values():
            for cat in place.get("_found_via_categories", []):
                cat_counts[cat] += 1

        print(f"\n  Places by category (may overlap):")
        for cat, count in cat_counts.most_common():
            print(f"    {cat}: {count}")

        # Data quality
        with_rating = sum(1 for p in self.results.values() if p.get("rating"))
        with_website = sum(1 for p in self.results.values() if p.get("website"))
        with_phone = sum(1 for p in self.results.values() if p.get("phone"))
        operational = sum(1 for p in self.results.values() if p.get("business_status") == "OPERATIONAL")

        print(f"\n  Data quality:")
        print(f"    With rating: {with_rating}")
        print(f"    With website: {with_website}")
        print(f"    With phone: {with_phone}")
        print(f"    Operational: {operational}")

        print(f"\n  Output: {OUTPUT_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Google Places Text Search pipeline")
    parser.add_argument("--sub-areas", action="store_true", help="Also search within sub-areas of major metros")
    parser.add_argument("--dry-run", action="store_true", help="Print query plan without making API calls")
    args = parser.parse_args()

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: Set GOOGLE_PLACES_API_KEY environment variable")
        sys.exit(1)

    pipeline = PlacesSearchPipeline(api_key or "dry-run-key")
    pipeline.search_all(include_sub_areas=args.sub_areas, dry_run=args.dry_run)
    pipeline.print_summary()


if __name__ == "__main__":
    main()
