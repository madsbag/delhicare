#!/usr/bin/env python3
"""
Step 3: LLM Structured Extraction using GPT-4o-mini.

For each business, combines all crawled page markdown and sends to GPT-4o-mini
to extract structured listing data: services, doctors, facilities, testimonials,
FAQs, SEO content, and descriptions.

For businesses with thin/no website content, generates listing content from
existing Excel data (name, category, city, keywords, business_summary).
"""

import json
import os
import sys
import time
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
BUSINESSES_FILE = DATA_DIR / "normalized_businesses.json"
CRAWL_FILE = DATA_DIR / "deep_crawl_results.json"
OUTPUT_FILE = DATA_DIR / "llm_extracted.json"
CACHE_FILE = DATA_DIR / "llm_extract_cache.json"

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = "gpt-4o-mini"
MAX_CONTENT_CHARS = 12000  # max chars to send to LLM (combined from all pages)
MIN_USEFUL_CONTENT = 200  # minimum chars to consider content useful

EXTRACTION_PROMPT = """You are a healthcare facility data extraction expert. Analyze the following crawled web content for the business "{name}" located in {city}, India. This business is categorized as "{category}".

Extract the following structured data from the content. If information is not available, use empty strings/arrays. Be thorough — extract every piece of useful information.

Return a JSON object with these fields:

{{
  "about_description": "2-4 paragraph description of the facility (write naturally, include what makes them unique)",
  "founding_year": "year founded if mentioned, else empty string",
  "mission_statement": "their mission/vision if mentioned, else empty string",
  "services": [
    {{"name": "Service Name", "description": "Brief description of this service"}}
  ],
  "specializations": ["list of specializations, e.g. 'Geriatric Care', 'Stroke Rehab', 'Dementia Care'"],
  "doctors": [
    {{"name": "Dr. Name", "title": "Designation", "qualifications": "MBBS, MD etc", "specialization": "Their area"}}
  ],
  "team_size": "approximate team size if mentioned, else empty string",
  "facilities": [
    {{"name": "Facility Feature", "description": "Brief description"}}
  ],
  "bed_count": "number of beds if mentioned, else empty string",
  "testimonials": [
    {{"text": "Testimonial text", "author": "Author name", "rating": "rating if available"}}
  ],
  "insurance_accepted": ["list of insurance providers accepted"],
  "languages_spoken": ["list of languages"],
  "accreditations": ["list of accreditations/certifications"],
  "faqs": [
    {{"question": "FAQ question", "answer": "FAQ answer"}}
  ],
  "meta_description": "SEO meta description, max 155 characters. Include city name and key services.",
  "seo_title": "SEO title, max 60 characters. Format: 'Business Name - Category in City'",
  "long_description": "300-500 word unique description for the listing page. Write naturally, include services, location, and what sets them apart. Do NOT copy directly from the source — rewrite in your own words."
}}

Respond with valid JSON only, no markdown formatting.

--- CRAWLED CONTENT ---
{content}
"""

GENERATION_PROMPT = """You are a healthcare facility content writer. Generate listing content for the business "{name}" located in {city}, India. This business is categorized as "{category}".

Available information:
- Google Category: {google_category}
- Business Summary (from web presence): {summary}
- Keywords (from web analysis): {keywords}
- Rating: {rating}
- Reviews: {reviews}

Generate realistic and helpful listing content based on what you know about this type of facility in {city}. Do not fabricate specific claims — keep it general but useful.

Return a JSON object with these fields:

{{
  "about_description": "2-3 paragraph general description appropriate for a {category} facility in {city}",
  "founding_year": "",
  "mission_statement": "",
  "services": [
    {{"name": "Service Name", "description": "Brief description"}}
  ],
  "specializations": ["2-4 general specializations typical for {category}"],
  "doctors": [],
  "team_size": "",
  "facilities": [
    {{"name": "Facility Feature", "description": "Brief description"}}
  ],
  "bed_count": "",
  "testimonials": [],
  "insurance_accepted": [],
  "languages_spoken": ["Hindi", "English"],
  "accreditations": [],
  "faqs": [
    {{"question": "General FAQ about {category} in {city}", "answer": "Helpful answer"}}
  ],
  "meta_description": "SEO meta description, max 155 characters. Include '{name}' and '{city}'.",
  "seo_title": "SEO title, max 60 characters. Format: '{name} - {category} in {city}'",
  "long_description": "200-400 word description for the listing page. Keep it factual and general."
}}

Respond with valid JSON only.
"""


def load_cache() -> dict:
    if CACHE_FILE.exists():
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}


def save_cache(cache: dict):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, ensure_ascii=False)


def get_crawl_content(crawl_data: dict) -> str:
    """Combine all successful crawled pages into a single content string."""
    if not crawl_data or not crawl_data.get("pages"):
        return ""

    parts = []
    for page in crawl_data["pages"]:
        if page.get("success") and page.get("markdown", "").strip():
            url = page.get("url", "")
            md = page["markdown"]
            parts.append(f"--- PAGE: {url} ---\n{md}")

    combined = "\n\n".join(parts)
    return combined[:MAX_CONTENT_CHARS]


def extract_with_llm(name: str, city: str, category: str, content: str) -> dict:
    """Use GPT-4o-mini to extract structured data from crawled content."""
    import openai

    client = openai.OpenAI(api_key=OPENAI_API_KEY)

    prompt = EXTRACTION_PROMPT.format(
        name=name, city=city, category=category, content=content
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
        print(f"    LLM extraction error: {e}")
        return {"_source": "error", "_error": str(e)}


def generate_with_llm(biz: dict) -> dict:
    """Use GPT-4o-mini to generate listing content for thin-content businesses."""
    import openai

    client = openai.OpenAI(api_key=OPENAI_API_KEY)

    prompt = GENERATION_PROMPT.format(
        name=biz["name"],
        city=biz["city"],
        category=biz["category"],
        google_category=biz.get("google_category", ""),
        summary=biz.get("business_summary", ""),
        keywords=biz.get("classification_keywords", ""),
        rating=biz.get("rating", "N/A"),
        reviews=biz.get("reviews", 0),
    )

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        result["_source"] = "generated"
        return result
    except Exception as e:
        print(f"    LLM generation error: {e}")
        return {"_source": "error", "_error": str(e)}


def main():
    start_time = time.time()

    print("=" * 70)
    print("  LLM STRUCTURED EXTRACTION")
    print(f"  Model: {OPENAI_MODEL}")
    print("=" * 70)

    # Load data
    with open(BUSINESSES_FILE, "r") as f:
        businesses = json.load(f)

    crawl_results = {}
    if CRAWL_FILE.exists():
        with open(CRAWL_FILE, "r") as f:
            crawl_results = json.load(f)
    else:
        print("  WARNING: No deep crawl results found. Will generate content for all businesses.")

    # Load cache
    cache = load_cache()
    print(f"\n  Total businesses: {len(businesses)}")
    print(f"  Crawl results available: {len(crawl_results)}")
    print(f"  Already processed (cached): {len(cache)}")

    # Process each business
    extracted = dict(cache)
    processed = 0
    extracted_count = 0
    generated_count = 0

    for i, biz in enumerate(businesses):
        slug = biz["slug"]

        if slug in cache:
            continue

        name = biz["name"]
        city = biz["city"]
        category = biz["category"]

        # Get crawled content
        crawl_data = crawl_results.get(slug, {})
        content = get_crawl_content(crawl_data)

        if len(content) >= MIN_USEFUL_CONTENT:
            # Extract from crawled content
            print(f"  [{i+1}/{len(businesses)}] EXTRACT {name[:45]:45s} ({len(content):,} chars)")
            result = extract_with_llm(name, city, category, content)
            extracted_count += 1
        else:
            # Generate content from existing data
            print(f"  [{i+1}/{len(businesses)}] GENERATE {name[:44]:44s} (thin content)")
            result = generate_with_llm(biz)
            generated_count += 1

        extracted[slug] = result
        processed += 1

        # Save cache every 10 businesses
        if processed % 10 == 0:
            save_cache(extracted)
            print(f"  Cache saved ({len(extracted)} entries)")

        # Rate limit: small delay every 20 requests
        if processed % 20 == 0:
            time.sleep(1)

    # Final save
    save_cache(extracted)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(extracted, f, indent=2, ensure_ascii=False)

    elapsed = time.time() - start_time
    print(f"\n{'='*70}")
    print(f"  LLM EXTRACTION COMPLETE in {elapsed:.0f}s")
    print(f"  Total processed: {len(extracted)}")
    print(f"  Extracted from content: {extracted_count}")
    print(f"  Generated (thin content): {generated_count}")
    print(f"  Output: {OUTPUT_FILE}")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
