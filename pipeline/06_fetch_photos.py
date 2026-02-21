#!/usr/bin/env python3
"""
Step 6: Fetch Google Places photos for all active listings.

Runs AFTER LLM extraction (Step 5), fetching photos only for the ~3,724
active businesses — not all ~8,000 raw places.

Reads:  pipeline/data/llm_extracted.json  (from Step 5, keyed by google_place_id)
Writes: pipeline/data/places_photos.json  (place_id → photos array)

Usage:
    export GOOGLE_PLACES_API_KEY="your-key-here"
    python pipeline/06_fetch_photos.py [--limit N] [--dry-run]
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
DATA_DIR = SCRIPT_DIR / "data"

LLM_FILE = DATA_DIR / "llm_extracted.json"
OUTPUT_FILE = DATA_DIR / "places_photos.json"
CACHE_FILE = DATA_DIR / "places_photos_cache.json"

API_BASE_URL = "https://places.googleapis.com/v1/places"

# Only request photos metadata (Pro tier, included in free 35k/month)
FIELD_MASK = "id,photos"

RATE_LIMIT_SECONDS = 0.5


class RateLimiter:
    def __init__(self, min_interval: float = RATE_LIMIT_SECONDS):
        self.min_interval = min_interval
        self.last_request_time = 0.0

    def wait(self):
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()


class PhotoFetcher:
    """Fetches Google Places photo metadata for normalized businesses."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.rate_limiter = RateLimiter()
        self.results: dict = {}
        self.cache: dict = {"completed_ids": [], "total_api_calls": 0}
        self.stats = Counter()

        # Load LLM-extracted listings (keyed by google_place_id)
        if not LLM_FILE.exists():
            print(f"ERROR: {LLM_FILE} not found. Run 05_llm_extract.py first.")
            sys.exit(1)

        with open(LLM_FILE) as f:
            llm_data = json.load(f)

        # Extract place_id → name mapping
        self.place_ids = {}
        for pid, entry in llm_data.items():
            name = entry.get("name", "Unknown")
            self.place_ids[pid] = name

        print(f"  Loaded {len(llm_data)} LLM-extracted listings")
        print(f"  Unique Google Place IDs: {len(self.place_ids)}")

        # Load existing results and cache
        if OUTPUT_FILE.exists():
            with open(OUTPUT_FILE) as f:
                self.results = json.load(f)
            print(f"  Loaded {len(self.results)} existing photo records")

        if CACHE_FILE.exists():
            with open(CACHE_FILE) as f:
                self.cache = json.load(f)
            print(f"  Loaded cache: {len(self.cache['completed_ids'])} already fetched")

    def _fetch_photos(self, place_id: str) -> dict:
        """Fetch photo metadata for a single place."""
        url = f"{API_BASE_URL}/{place_id}"
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        }

        max_retries = 3
        for attempt in range(max_retries):
            self.rate_limiter.wait()
            try:
                response = requests.get(url, headers=headers, timeout=30)

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

        print(f"    Failed after {max_retries} retries for {place_id}")
        return {}

    def fetch_all(self, limit: int = 0, dry_run: bool = False):
        """Fetch photos for all normalized businesses not yet in cache."""
        all_ids = list(self.place_ids.keys())
        remaining = [pid for pid in all_ids if pid not in self.cache["completed_ids"]]

        if limit > 0:
            remaining = remaining[:limit]

        print(f"\n{'='*70}")
        print(f"  GOOGLE PLACES PHOTO FETCHER (post-normalization)")
        print(f"{'='*70}")
        print(f"  Clean listings with Place IDs: {len(all_ids)}")
        print(f"  Already fetched: {len(self.cache['completed_ids'])}")
        print(f"  Remaining: {len(remaining)}")

        if dry_run:
            est_cost = len(remaining) * 5.10 / 1000
            print(f"\n  Estimated API cost (India billing): ${est_cost:.2f}")
            print(f"  Free tier (35,000/month): {'WITHIN' if len(remaining) < 35000 else 'EXCEEDS'}")
            print(f"  (Photo metadata is a Place Details call — Pro tier)")
            return

        for i, place_id in enumerate(remaining):
            place_name = self.place_ids.get(place_id, "Unknown")
            progress = f"[{i+1}/{len(remaining)}]"
            print(f"  {progress} {place_name} ({place_id[:20]}...)")

            result = self._fetch_photos(place_id)

            if result:
                photos = result.get("photos", [])

                # Store up to 5 photos with full name + author attributions
                photo_entries = []
                for p in photos[:5]:
                    attributions = []
                    for attr in p.get("authorAttributions", []):
                        attributions.append({
                            "displayName": attr.get("displayName", ""),
                            "uri": attr.get("uri", ""),
                            "photoUri": attr.get("photoUri", ""),
                        })
                    photo_entries.append({
                        "name": p.get("name", ""),
                        "widthPx": p.get("widthPx", 0),
                        "heightPx": p.get("heightPx", 0),
                        "authorAttributions": attributions,
                    })

                self.results[place_id] = {
                    "photo_count": len(photos),
                    "photos": photo_entries,
                }
                self.stats["fetched"] += 1

                if photos:
                    self.stats["with_photos"] += 1
            else:
                self.results[place_id] = {"photo_count": 0, "photos": []}
                self.stats["failed"] += 1

            self.cache["completed_ids"].append(place_id)

            # Checkpoint every 100
            if (i + 1) % 100 == 0:
                self._save()
                print(f"    --- Checkpoint: {len(self.results)} photos fetched ---")

        self._save()

    def _save(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def print_summary(self):
        print(f"\n{'='*70}")
        print(f"  PHOTO FETCHING COMPLETE")
        print(f"{'='*70}")
        print(f"  Total photo records: {len(self.results)}")
        print(f"  Fetched this run: {self.stats['fetched']}")
        print(f"  With photos: {self.stats['with_photos']}")
        print(f"  Failed: {self.stats['failed']}")
        print(f"  Total API calls (cumulative): {self.cache.get('total_api_calls', 0)}")
        print(f"\n  Output: {OUTPUT_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Fetch Google Places photos for clean listings")
    parser.add_argument("--limit", type=int, default=0, help="Max places to fetch (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without making API calls")
    args = parser.parse_args()

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: Set GOOGLE_PLACES_API_KEY environment variable")
        sys.exit(1)

    fetcher = PhotoFetcher(api_key or "dry-run-key")
    fetcher.fetch_all(limit=args.limit, dry_run=args.dry_run)
    fetcher.print_summary()


if __name__ == "__main__":
    main()
