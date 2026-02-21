#!/usr/bin/env python3
"""
Step 4a: Stage 1 Normalizer — Fast three-pass filter to remove obvious junk.

Pass 1a: Name-based exclusion (negative keyword patterns)
Pass 1b: Google primary_type whitelist (only keep health/medical_clinic/service/medical_center/empty)
Pass 1c: Google sub-type exclusion (remove entries with junk secondary types)

Reads:  pipeline/data/places_search_raw.json   (19,821 entries from Step 1)
Writes: pipeline/data/stage1_filtered.json      (dict keyed by google_place_id)

Usage:
    python pipeline/04a_normalise.py
"""

import json
import re
import time
from collections import Counter
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"
INPUT_FILE = DATA_DIR / "places_search_raw.json"
OUTPUT_FILE = DATA_DIR / "stage1_filtered.json"

# ─── Stage 1a: Name-based exclusion patterns ─────────────────────────────────

# Hard exclusions — always exclude if name matches, no exceptions
HARD_EXCLUDE_PATTERNS = [
    # Hospitals — always exclude
    r"\bhospital\b",

    # Addiction / de-addiction / alcohol / drug
    r"(addict|de.?addict|deaddict|nasha|nashamukti|nasha\s*mukti)",
    r"\b(substance\s*abuse|sober\b|sobriety\b|detox)\b",
    r"\balcohol\b",
    r"\bdrug\b",

    # Education
    r"\b(school|college|university|vidyalaya)\b",
    r"\bacadem",  # academy, academic
    r"\binstitute\s+of\b",

    # Dental
    r"\b(dental|dentist)\b",
    r"\borthodont",  # orthodontist

    # Veterinary / animal
    r"\bveterinar",  # veterinary
    r"\banimal\s*(hospital|clinic|care)\b",
    r"\bpet\s*(care|clinic|hospital)\b",

    # Gym / fitness
    r"\b(gym\b|fitness|crossfit|zumba)\b",

    # Spa / beauty
    r"\bspa\b",
    r"\b(beauty|salon|parlour|parlor)\b",
    r"\bhair\s*transplant\b",

    # Insurance
    r"\b(insurance|bima)\b",

    # Legal
    r"\b(advocate|lawyer|legal\s*service)\b",

    # Construction / real estate
    r"\b(construction|builder|real\s*estate|property)\b",

    # IT / tech
    r"\b(software|technologies|infotech|it\s*solution)\b",

    # Food / restaurant
    r"\b(restaurant|dhaba|cafe\b|tiffin)\b",

    # Blood bank
    r"\bblood\s*bank\b",

    # Alternative medicine
    r"\b(ayurved|homeopath|unani|siddha|naturopath)",

    # Meditation
    r"\bmeditat",  # meditation, meditative

    # Sports
    r"\bsports?\b",

    # Counselling
    r"\bcounsell",  # counselling, counsellor

    # Andrology
    r"\bandrolog",  # andrology, andrologist

    # Scan / scanning
    r"\bscans?\b",

    # Pest control
    r"\bpest",

    # Domestic help
    r"\bdomestic\s*help",

    # Cleaning
    r"\bclean",  # clean, cleaning, cleaner, cleaners

    # Aya centre (nanny/babysitter placement)
    r"\bayas?\b",

    # Helper / domestic helper
    r"\bhelpers?\b",

    # Appliance
    r"\bappliance",

    # Repair
    r"\brepair",

    # Tutor
    r"\btutor",  # tutor, tutoring, tutors, tutorial

    # Religious
    r"\b(temple|mandir|masjid|mosque|church|gurudwara|dargah)\b",

    # Psychiatric
    r"\bpsychiatr",  # psychiatrist, psychiatry
    r"\bmental\s*(hospital|asylum)\b",

    # Pediatric / child
    r"\b(pediatric|paediatric)\b",
    r"\bchild\s*(care|health|hospital|clinic)\b",
    r"\bshishu\b",

    # IVF / fertility
    r"\b(ivf|fertility)\b",
    r"\binfertil",  # infertility

    # Maternity / gynae
    r"\b(maternity|obstetric)\b",
    r"\bpregnan",  # pregnancy, pregnant
    r"\b(gynae|gynaec|gynec)",  # gynaecologist, gynecologist

    # Misc specialist
    r"\bjyotish\b",
    r"\bastrol",  # astrology, astrologer
    r"\bsexolog",  # sexologist

    # Dermatology / skin / cosmetic
    r"\bdermatol",  # dermatology, dermatologist
    r"\bskin\b.*(?:clinic|care|specialist)\b",
    r"\bcosmet",  # cosmetic, cosmetology

    # Eye / optical
    r"\beye\b.*(?:hospital|centre|center|clinic|institute)\b",
    r"\b(optical|lasik|netralaya|cornea|retina|cataract)\b",
    r"\bophthalmol",  # ophthalmology, ophthalmologist

    # Diagnostic / pathology / imaging
    r"\bdiagnostic",  # diagnostic, diagnostics
    r"\bimaging\b",
    r"\bpatholog",  # pathology, pathologist
    r"\bx.?ray\b",
    r"\bsonograph",  # sonography

    # Surgery
    r"\b(surgery|surgeon)\b",
    r"\blaparoscop",  # laparoscopy, laparoscopic

    # Specialist medical
    r"\burolog",  # urology, urologist
    r"\boncolog",  # oncology, oncologist
    r"\bcancer\b.*(?:clinic|centre|center|hospital)\b",
    r"\b(orthopaedic|orthopedic)\b",
    r"\b(cardiol|nephrol|gastro|pulmonol)",  # cardiology, nephrology, etc.
    r"\b(endol|diabet|neurosurg)",  # endologist, diabetes, neurosurgery

    # Weight / diet
    r"\bweight\b.*(?:loss|management)\b",
    r"\b(slimming)\b",
    r"\bdiet\b.*(?:clinic|centre|center)\b",
    r"\bchiropr",  # chiropractor, chiropractic
    r"\bacupuncture\b",

    # Equipment rental / medical supplies
    r"\bequipment\b.*(?:rent|hire|on rent)\b",
    r"\bmedical\b.*(?:equipment|device|supply|store|shop)\b",

    # ENT
    r"\bent\b.*(?:clinic|doctor|specialist)\b",

    # Misc
    r"\bmarriage bureau\b",
    r"\b(kiwanis)\b",
    r"\brotary\b.*(?:club|foundation)\b",
    r"\blions club\b",
    r"\brehabilitation council\b",

    # Child development / special needs
    r"\bchild development\b",
    r"\b(autism|adhd)\b",
    r"\bcerebral palsy\b",
    r"\bdown.?syn",  # down syndrome, down's syndrome
    r"\bdelayed speech\b",
    r"\bspecial needs\b",
    r"\bspecial child\b",
    r"\blearning disabilit",  # disability, disabilities
    r"\bdyslexia\b",

    # Prison / correctional
    r"\bprisoner\b",
    r"\bprison\b.*(?:reform|rehab)\b",
    r"\bjuvenile\b.*(?:home|centre|center)\b",
    r"\bcorrection(?:al)?\b.*(?:home|centre|center|facility)\b",

    # Behavioral / mental
    r"\b(behavioral health|behavioural health)\b",
    r"\bmental hospital\b",
]

# Positive keywords — if name contains these alongside a soft-exclude word, keep it
POSITIVE_KEYWORDS = r"(nursing|elder|old.age|home.care|rehab|geriatric|palliative|hospice|senior|vridh)"

# Soft exclusions — exclude UNLESS name also contains positive keywords
SOFT_EXCLUDE_PATTERNS = [
    # (negative pattern, positive override pattern or None for always-exclude)
    (r"\bphysio|physiotherap", r"(rehab|nursing|stroke|neuro|paralysis|spinal|post)"),
    (r"\bfoundation\b", POSITIVE_KEYWORDS),
    (r"\bclinic\b", r"(nursing|elder|old.age|home.care|rehab|geriatric|palliative|hospice|physio|neuro|stroke|ortho)"),
    (r"\bambulance\b", POSITIVE_KEYWORDS),
    (r"\byoga\b", r"(physio|rehab|nursing|elder)"),
    (r"\bashram\b", r"(vridh|vriddhashram|old.age|elder|senior|aged)"),
    (r"\bcharitable trust\b", POSITIVE_KEYWORDS),
    (r"\b(hotel|hostel|paying\s*guest)\b", r"care"),
    (r"\b(ngo\b|society\b|samaj|samiti|sangathan)\b", POSITIVE_KEYWORDS),
    (r"\bluxury\b.*rehab", None),  # always exclude
    (r"\bspeech therapy\b", POSITIVE_KEYWORDS),
    (r"\boccupational therapy\b", POSITIVE_KEYWORDS),
    (r"\btech\b.*\bpvt\b", None),  # always exclude
    (r"\bclub\b", POSITIVE_KEYWORDS),
    (r"\bpsycho", r"(rehab|nursing|elder|old.age|home.care|senior|vridh)"),
    (r"\bmentally\b", POSITIVE_KEYWORDS),
    (r"\bmental\b", POSITIVE_KEYWORDS),
    (r"\btraining\b", POSITIVE_KEYWORDS),
    (r"\bmaids?\b", POSITIVE_KEYWORDS),
    (r"\beducat", POSITIVE_KEYWORDS),  # education, educator
]

# ─── Stage 1b: Primary type whitelist ─────────────────────────────────────────

KEEP_PRIMARY_TYPES = {"health", "medical_clinic", "service", "medical_center", ""}

# Primary types that are definitively healthcare — skip sub-type exclusion for these
HEALTHCARE_PRIMARY_TYPES = {"health", "medical_clinic", "medical_center"}

# ─── Stage 1c: Sub-type exclusion ─────────────────────────────────────────────

EXCLUDE_SUBTYPES = {
    # Childcare / education
    "child_care_agency", "preschool", "school", "university",
    "educational_institution",

    # Retail / commercial
    "store", "manufacturer", "electronics_store", "home_goods_store",
    "furniture_store", "home_improvement_store", "building_materials_store",
    "hardware_store", "shoe_store", "clothing_store", "cosmetics_store",
    "book_store", "grocery_store", "food_store", "drugstore",

    # Hospitality / lodging
    "lodging", "hostel", "guest_house", "hotel", "inn", "motel",
    "extended_stay_hotel", "resort_hotel", "bed_and_breakfast", "cottage",

    # Housing
    "apartment_building", "apartment_complex", "condominium_complex",
    "housing_complex",

    # Fitness / wellness
    "gym", "fitness_center", "spa", "massage_spa", "yoga_studio",

    # Beauty
    "beauty_salon", "hair_care", "hair_salon", "nail_salon", "barber_shop",
    "body_art_service",

    # Dental
    "dental_clinic", "dentist",

    # Pharmacy
    "pharmacy",

    # Skin
    "skin_care_clinic",

    # Veterinary / pets
    "pet_care", "veterinary_care",

    # Food / restaurant
    "food", "restaurant", "japanese_restaurant", "vegetarian_restaurant",
    "catering_service", "meal_delivery", "food_delivery",

    # Religion
    "place_of_worship", "hindu_temple",

    # Transport
    "taxi_service", "chauffeur_service", "car_rental", "car_repair",
    "car_wash", "car_dealer", "train_ticket_office", "transportation_service",

    # Insurance / finance / legal
    "insurance_agency",

    # Construction
    "general_contractor", "real_estate_agency",

    # Misc
    "travel_agency", "laundry", "event_venue", "garden", "market",
    "storage", "bar", "sports_bar", "sports_club", "courthouse", "police",
    "accounting", "electrician",
}


# ─── Filter functions ─────────────────────────────────────────────────────────

def check_stage1a(name_lower: str) -> str | None:
    """Check name against Stage 1a patterns. Returns matched pattern or None."""
    for pat in HARD_EXCLUDE_PATTERNS:
        if re.search(pat, name_lower):
            return pat
    for neg_pat, pos_pat in SOFT_EXCLUDE_PATTERNS:
        if re.search(neg_pat, name_lower):
            if pos_pat is None:
                return neg_pat
            if not re.search(pos_pat, name_lower):
                return neg_pat
    return None


def check_stage1b(primary_type: str) -> bool:
    """Returns True if excluded by primary type."""
    return primary_type not in KEEP_PRIMARY_TYPES


def check_stage1c(types: list) -> str | None:
    """Returns first bad sub-type found, or None."""
    for t in types:
        if t in EXCLUDE_SUBTYPES:
            return t
    return None


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    start_time = time.time()

    print("=" * 70)
    print("  STAGE 1 NORMALIZER — Three-Pass Junk Filter")
    print("=" * 70)

    # Load raw places
    with open(INPUT_FILE, "r") as f:
        raw_places = json.load(f)

    total = len(raw_places)
    print(f"\n  Input: {total} raw places from {INPUT_FILE.name}")

    # Counters
    stage1a_reasons = Counter()
    stage1b_reasons = Counter()
    stage1c_reasons = Counter()
    status_excluded = 0

    surviving = {}

    for pid, place in raw_places.items():
        name = place.get("name", "")
        name_lower = name.lower()
        primary_type = place.get("primary_type", "") or ""
        types = place.get("types", [])
        business_status = place.get("business_status", "OPERATIONAL") or "OPERATIONAL"

        # Stage 1a: Business status
        if business_status not in ("OPERATIONAL", ""):
            status_excluded += 1
            continue

        # Stage 1a: Name patterns
        matched_pattern = check_stage1a(name_lower)
        if matched_pattern:
            stage1a_reasons[matched_pattern] += 1
            continue

        # Stage 1b: Primary type whitelist
        if check_stage1b(primary_type):
            stage1b_reasons[primary_type] += 1
            continue

        # Stage 1c: Sub-type exclusion (skip if primary type is definitively healthcare)
        if primary_type not in HEALTHCARE_PRIMARY_TYPES:
            bad_subtype = check_stage1c(types)
            if bad_subtype:
                stage1c_reasons[bad_subtype] += 1
                continue

        surviving[pid] = place

    # Save output
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(surviving, f, indent=2, ensure_ascii=False)

    # ─── Print stats ───
    s1a_total = sum(stage1a_reasons.values()) + status_excluded
    s1b_total = sum(stage1b_reasons.values())
    s1c_total = sum(stage1c_reasons.values())
    total_excluded = s1a_total + s1b_total + s1c_total

    elapsed = time.time() - start_time

    print(f"\n{'='*70}")
    print(f"  STAGE 1 RESULTS")
    print(f"{'='*70}")
    print(f"  Total input:          {total:>6}")
    print(f"  Stage 1a (name):     -{s1a_total:>6}  ({100*s1a_total/total:.1f}%)")
    print(f"  Stage 1b (type):     -{s1b_total:>6}  ({100*s1b_total/total:.1f}%)")
    print(f"  Stage 1c (sub-type): -{s1c_total:>6}  ({100*s1c_total/total:.1f}%)")
    print(f"  Total excluded:      -{total_excluded:>6}  ({100*total_excluded/total:.1f}%)")
    print(f"  SURVIVING:            {len(surviving):>6}  ({100*len(surviving)/total:.1f}%)")

    # Stage 1a breakdown (top 20 patterns)
    print(f"\n  --- Stage 1a: Top name exclusion patterns ---")
    if status_excluded:
        print(f"    {'(non-operational)':<55} {status_excluded:>5}")
    for pat, count in stage1a_reasons.most_common(20):
        # Shorten pattern for display
        display = pat[:55]
        print(f"    {display:<55} {count:>5}")

    # Stage 1b breakdown
    print(f"\n  --- Stage 1b: Excluded primary_types ---")
    for pt, count in stage1b_reasons.most_common(20):
        print(f"    {pt:<55} {count:>5}")

    # Stage 1c breakdown
    print(f"\n  --- Stage 1c: Excluded sub-types ---")
    for st, count in stage1c_reasons.most_common(20):
        print(f"    {st:<55} {count:>5}")

    # Surviving primary type breakdown
    pt_counts = Counter()
    for v in surviving.values():
        pt_counts[v.get("primary_type", "") or "NONE"] += 1

    print(f"\n  --- Surviving by primary_type ---")
    for pt, count in pt_counts.most_common():
        print(f"    {pt:<55} {count:>5}")

    print(f"\n  Output: {OUTPUT_FILE}")
    print(f"  Completed in {elapsed:.1f}s")
    print(f"{'='*70}")


if __name__ == "__main__":
    main()
