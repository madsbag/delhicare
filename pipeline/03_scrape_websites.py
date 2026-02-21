#!/usr/bin/env python3
"""
Step 3: Deep crawl business websites using crawl4ai BFSDeepCrawlStrategy.

Reads Stage 1 filtered places (post 04a_normalise.py) so we only crawl the
~8,600 businesses that survived junk filtering — not all ~20,000 raw places.

For each business with a website, crawls the main page + up to 10 subpages
(about, services, team, facilities, contact, testimonials, FAQ, pricing,
treatment pages).

Uses batching (10 domains at a time) with fresh browser contexts for stability.
Saves results with resume/cache support, keyed by google_place_id.

Reads:  pipeline/data/stage1_filtered.json      (from Step 4a)
Writes: pipeline/data/deep_crawl_results.json   (keyed by google_place_id)

Usage:
    python pipeline/03_scrape_websites.py [--limit N] [--batch-size N]
"""

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

# Add crawl4ai to path
sys.path.insert(0, "/Users/madhur/Documents/GitHub/crawl4ai")

from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CrawlerRunConfig,
    CacheMode,
)
from crawl4ai.deep_crawling import (
    BFSDeepCrawlStrategy,
    FilterChain,
    URLPatternFilter,
    DomainFilter,
)
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from crawl4ai.content_filter_strategy import PruningContentFilter

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
INPUT_FILE = DATA_DIR / "stage1_filtered.json"
OUTPUT_FILE = DATA_DIR / "deep_crawl_results.json"
CACHE_FILE = DATA_DIR / "deep_crawl_cache.json"

DOMAIN_BATCH_SIZE = 10  # Crawl 10 domains per batch (each may have up to 10 pages)
MAX_CONCURRENT_DOMAINS = 3  # Max domains crawled concurrently within a batch
MAX_DEPTH = 2  # Crawl up to 2 levels deep
MAX_PAGES_PER_DOMAIN = 10  # Max pages per business website
PAGE_TIMEOUT = 25000  # 25s per page

# URL patterns to prioritize for subpage discovery
PRIORITY_PATTERNS = [
    "*about*", "*service*", "*team*", "*doctor*", "*staff*",
    "*facilit*", "*contact*", "*testimonial*", "*review*",
    "*faq*", "*pricing*", "*treatment*", "*program*",
    "*gallery*", "*infrastructure*", "*specialit*", "*special*",
]


def load_cache() -> dict:
    """Load previously crawled results for resume support."""
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    """Save crawl cache incrementally."""
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, ensure_ascii=False)


def get_domain(url: str) -> str:
    """Extract domain from URL."""
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""


async def deep_crawl_one_domain(url: str, place_id: str, name: str) -> dict:
    """Deep crawl a single domain using BFS strategy."""
    domain = get_domain(url)
    if not domain:
        return {"place_id": place_id, "url": url, "pages": [], "error": "Invalid URL"}

    browser_config = BrowserConfig(
        headless=True,
        text_mode=True,
        viewport_width=1280,
    )

    # Set up URL filters
    url_filter = URLPatternFilter(patterns=PRIORITY_PATTERNS)
    domain_filter = DomainFilter(allowed_domains=[domain])

    crawl_config = CrawlerRunConfig(
        deep_crawl_strategy=BFSDeepCrawlStrategy(
            max_depth=MAX_DEPTH,
            max_pages=MAX_PAGES_PER_DOMAIN,
            include_external=False,
            filter_chain=FilterChain(filters=[domain_filter]),
        ),
        cache_mode=CacheMode.BYPASS,
        page_timeout=PAGE_TIMEOUT,
        word_count_threshold=10,
        excluded_tags=["nav", "footer", "aside", "header", "script", "style"],
        remove_overlay_elements=True,
        markdown_generator=DefaultMarkdownGenerator(
            content_filter=PruningContentFilter(
                threshold=0.4,
                threshold_type="fixed",
                min_word_threshold=5,
            ),
            options={"ignore_links": True},
        ),
        verbose=False,
    )

    pages = []
    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            results = await crawler.arun(url=url, config=crawl_config)

            # results is a list of CrawlResult when deep crawl is used
            if not isinstance(results, list):
                results = [results]

            for result in results:
                if result.success:
                    md = ""
                    if result.markdown:
                        md = result.markdown.fit_markdown or result.markdown.raw_markdown or ""

                    pages.append({
                        "url": result.url,
                        "depth": result.metadata.get("depth", 0) if result.metadata else 0,
                        "markdown": md,  # Full content, no truncation
                        "char_count": len(md),
                        "success": True,
                    })
                else:
                    pages.append({
                        "url": result.url,
                        "depth": result.metadata.get("depth", 0) if result.metadata else 0,
                        "markdown": "",
                        "char_count": 0,
                        "success": False,
                        "error": str(result.error_message or "Unknown")[:200],
                    })

    except Exception as e:
        return {
            "place_id": place_id,
            "url": url,
            "pages": [{
                "url": url,
                "depth": 0,
                "markdown": "",
                "char_count": 0,
                "success": False,
                "error": str(e)[:200],
            }],
            "error": str(e)[:200],
        }

    return {
        "place_id": place_id,
        "url": url,
        "pages": pages,
        "total_pages": len(pages),
        "successful_pages": sum(1 for p in pages if p["success"]),
        "total_chars": sum(p["char_count"] for p in pages),
    }


async def crawl_domain_batch(batch: list, cache: dict, total: int, completed: int) -> tuple:
    """Crawl a batch of domains concurrently."""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_DOMAINS)
    batch_results = {}

    async def crawl_with_semaphore(place):
        nonlocal completed
        place_id = place["google_place_id"]
        url = place["website"]
        name = place["name"]

        async with semaphore:
            result = await deep_crawl_one_domain(url, place_id, name)
            completed += 1

            success_pages = result.get("successful_pages", 0)
            total_pages = result.get("total_pages", 0)
            total_chars = result.get("total_chars", 0)
            status = "OK" if success_pages > 0 else "FAIL"

            print(f"  [{completed}/{total}] {status} {name[:40]:40s} → {success_pages}/{total_pages} pages, {total_chars:,} chars")

            batch_results[place_id] = result
            return result

    tasks = [crawl_with_semaphore(place) for place in batch]
    await asyncio.gather(*tasks, return_exceptions=True)

    return batch_results, completed


async def main():
    parser = argparse.ArgumentParser(description="Deep crawl business websites from raw places data")
    parser.add_argument("--limit", type=int, default=0, help="Max domains to crawl (0 = all)")
    parser.add_argument("--batch-size", type=int, default=DOMAIN_BATCH_SIZE, help=f"Domains per batch (default: {DOMAIN_BATCH_SIZE})")
    args = parser.parse_args()

    start_time = time.time()

    print("=" * 70)
    print("  DEEP CRAWL PIPELINE")
    print("  Using crawl4ai BFSDeepCrawlStrategy")
    print("  Reading Stage 1 filtered places")
    print("=" * 70)

    # Load Stage 1 filtered places
    with open(INPUT_FILE, "r") as f:
        filtered_places = json.load(f)

    # Filter to those with websites
    with_websites = [v for v in filtered_places.values() if v.get("website")]
    print(f"\n  Total filtered places: {len(filtered_places)}")
    print(f"  With websites: {len(with_websites)}")

    # Deduplicate by domain — many places share the same website
    seen_domains = {}
    unique_by_domain = []
    for place in with_websites:
        domain = get_domain(place["website"])
        if domain and domain not in seen_domains:
            seen_domains[domain] = place["google_place_id"]
            unique_by_domain.append(place)

    print(f"  Unique domains: {len(unique_by_domain)}")

    # Load cache for resume
    cache = load_cache()
    remaining = [p for p in unique_by_domain if p["google_place_id"] not in cache]
    cached_count = len(unique_by_domain) - len(remaining)

    if cached_count > 0:
        print(f"  Already cached: {cached_count}")
        print(f"  Remaining: {len(remaining)}")

    # Apply limit
    if args.limit > 0:
        remaining = remaining[:args.limit]
        print(f"  Limited to: {len(remaining)}")

    batch_size = args.batch_size

    if not remaining:
        print("\n  All domains already crawled! Loading from cache.")
        results = dict(cache)
    else:
        results = dict(cache)

        # Process in batches
        total = cached_count + len(remaining)
        completed = cached_count

        for batch_start in range(0, len(remaining), batch_size):
            batch = remaining[batch_start:batch_start + batch_size]
            batch_num = batch_start // batch_size + 1
            total_batches = (len(remaining) + batch_size - 1) // batch_size
            print(f"\n  --- Batch {batch_num}/{total_batches} ({len(batch)} domains) ---")

            batch_results, completed = await crawl_domain_batch(batch, cache, total, completed)

            # Update cache
            for place_id, result in batch_results.items():
                cache[place_id] = result
                results[place_id] = result

            save_cache(cache)
            print(f"  Cache saved ({len(cache)} domains)")

    # Also map non-unique domains to their crawl data
    # so that places sharing the same website get crawl results too
    domain_to_result = {}
    for place_id, result in results.items():
        url = result.get("url", "")
        domain = get_domain(url)
        if domain:
            domain_to_result[domain] = result

    # Map all places (not just unique domains) to their crawl data
    full_results = dict(results)
    mapped_count = 0
    for place in with_websites:
        pid = place["google_place_id"]
        if pid not in full_results:
            domain = get_domain(place["website"])
            if domain in domain_to_result:
                full_results[pid] = domain_to_result[domain]
                mapped_count += 1

    if mapped_count > 0:
        print(f"\n  Mapped {mapped_count} additional places to shared domain crawl data")

    # Save final results
    with open(OUTPUT_FILE, "w") as f:
        json.dump(full_results, f, ensure_ascii=False, indent=2)

    # Summary
    elapsed = time.time() - start_time
    total_pages = sum(r.get("total_pages", 0) for r in results.values())
    success_pages = sum(r.get("successful_pages", 0) for r in results.values())
    total_chars = sum(r.get("total_chars", 0) for r in results.values())

    print(f"\n{'='*70}")
    print(f"  DEEP CRAWL COMPLETE in {elapsed:.0f}s")
    print(f"  Unique domains crawled: {len(results)}")
    print(f"  Total place IDs mapped: {len(full_results)}")
    print(f"  Total pages: {total_pages} ({success_pages} successful)")
    print(f"  Total content: {total_chars:,} characters")
    print(f"  Output: {OUTPUT_FILE}")
    print(f"{'='*70}")


if __name__ == "__main__":
    asyncio.run(main())
