import businessesData from "@/data/businesses.json";
import citiesData from "@/data/cities.json";
import categoriesData from "@/data/categories.json";
import cityCategoryData from "@/data/city_category.json";
import searchIndexData from "@/data/search_index.json";
import type {
  Business,
  CityData,
  CategoryData,
  CityCategoryData,
  SearchEntry,
} from "./types";

// Type assertions for imported JSON (use unknown intermediate to avoid strict type checking on JSON shape)
const businesses = businessesData as unknown as Business[];
const cities = citiesData as unknown as Record<string, CityData>;
const categories = categoriesData as unknown as Record<string, CategoryData>;
const cityCategories = cityCategoryData as unknown as Record<string, CityCategoryData>;
const searchIndex = searchIndexData as unknown as SearchEntry[];

// ─── Business queries ────────────────────────────────────────────────────────

export function getAllBusinesses(): Business[] {
  return businesses;
}

export function getBusinessBySlug(slug: string): Business | undefined {
  return businesses.find((b) => b.slug === slug);
}

export function getBusinessesByCategory(category: string): Business[] {
  return businesses.filter((b) => b.category === category);
}

export function getBusinessesByCategorySlug(categorySlug: string): Business[] {
  return businesses.filter((b) => b.category_slug === categorySlug);
}

export function getBusinessesByCity(city: string): Business[] {
  return businesses.filter((b) => b.city === city);
}

export function getBusinessesByCitySlug(citySlug: string): Business[] {
  return businesses.filter((b) => b.city_slug === citySlug);
}

export function getBusinessesByCityAndCategory(
  citySlug: string,
  categorySlug: string
): Business[] {
  return businesses.filter(
    (b) => b.city_slug === citySlug && b.category_slug === categorySlug
  );
}

export function getRelatedBusinesses(
  business: Business,
  limit: number = 4
): Business[] {
  // Same category & city first, then same category other cities
  const sameCityCategory = businesses.filter(
    (b) =>
      b.slug !== business.slug &&
      b.category === business.category &&
      b.city === business.city
  );
  const sameCategoryOther = businesses.filter(
    (b) =>
      b.slug !== business.slug &&
      b.category === business.category &&
      b.city !== business.city
  );

  return [...sameCityCategory, ...sameCategoryOther].slice(0, limit);
}

export function getAllBusinessSlugs(): string[] {
  return businesses.map((b) => b.slug);
}

// ─── Speciality queries ─────────────────────────────────────────────────────

let _specialitiesCache: string[] | null = null;

export function getAllSpecialities(): string[] {
  if (_specialitiesCache) return _specialitiesCache;
  const set = new Set<string>();
  for (const b of businesses) {
    if (b.specialities) {
      for (const s of b.specialities) {
        set.add(s);
      }
    }
  }
  _specialitiesCache = Array.from(set).sort();
  return _specialitiesCache;
}

export function getBusinessesBySpeciality(speciality: string): Business[] {
  return businesses.filter(
    (b) => b.specialities && b.specialities.includes(speciality)
  );
}

// ─── Facility type queries ───────────────────────────────────────────────────

let _facilityTypesCache: string[] | null = null;

export function getAllFacilityTypes(): string[] {
  if (_facilityTypesCache) return _facilityTypesCache;
  const set = new Set<string>();
  for (const b of businesses) {
    if (b.facility_type && b.facility_type !== "Unknown") {
      set.add(b.facility_type);
    }
  }
  _facilityTypesCache = Array.from(set).sort();
  return _facilityTypesCache;
}

// ─── City queries ────────────────────────────────────────────────────────────

export function getAllCities(): Record<string, CityData> {
  return cities;
}

export function getCityBySlug(slug: string): CityData | undefined {
  return cities[slug];
}

export function getAllCitySlugs(): string[] {
  return Object.keys(cities);
}

// ─── Category queries ────────────────────────────────────────────────────────

export function getAllCategories(): Record<string, CategoryData> {
  return categories;
}

export function getCategoryBySlug(slug: string): CategoryData | undefined {
  return categories[slug];
}

export function getAllCategorySlugs(): string[] {
  return Object.keys(categories);
}

// ─── City+Category queries ───────────────────────────────────────────────────

export function getCityCategory(
  citySlug: string,
  categorySlug: string
): CityCategoryData | undefined {
  const key = `${citySlug}/${categorySlug}`;
  return cityCategories[key];
}

export function getAllCityCategoryCombos(): CityCategoryData[] {
  return Object.values(cityCategories);
}

// ─── Search index ────────────────────────────────────────────────────────────

export function getSearchIndex(): SearchEntry[] {
  return searchIndex;
}

// ─── Speciality + City queries ──────────────────────────────────────────────

export function slugifySpeciality(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let _specSlugMapCache: Record<string, string> | null = null;

/** Maps speciality slug → display name */
export function getSpecialitySlugMap(): Record<string, string> {
  if (_specSlugMapCache) return _specSlugMapCache;
  const map: Record<string, string> = {};
  for (const b of businesses) {
    if (b.specialities) {
      for (const s of b.specialities) {
        map[slugifySpeciality(s)] = s;
      }
    }
  }
  _specSlugMapCache = map;
  return map;
}

/** Get the display name for a speciality slug */
export function getSpecialityBySlug(slug: string): string | undefined {
  return getSpecialitySlugMap()[slug];
}

/** Get all city+speciality combos that have at least 1 facility */
export function getAllCitySpecialityCombos(): { city_slug: string; speciality_slug: string; speciality_name: string; count: number }[] {
  const combos: Record<string, { city_slug: string; speciality_slug: string; speciality_name: string; count: number }> = {};
  for (const b of businesses) {
    if (b.specialities) {
      for (const s of b.specialities) {
        const specSlug = slugifySpeciality(s);
        const key = `${b.city_slug}/${specSlug}`;
        if (!combos[key]) {
          combos[key] = { city_slug: b.city_slug, speciality_slug: specSlug, speciality_name: s, count: 0 };
        }
        combos[key].count++;
      }
    }
  }
  return Object.values(combos);
}

/** Get businesses for a specific city + speciality */
export function getBusinessesByCityAndSpeciality(citySlug: string, specialityName: string): Business[] {
  return businesses.filter(
    (b) => b.city_slug === citySlug && b.specialities && b.specialities.includes(specialityName)
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export function getSiteStats() {
  return {
    totalBusinesses: businesses.length,
    totalCities: Object.keys(cities).length,
    totalCategories: Object.keys(categories).length,
    totalCityCategoryCombos: Object.keys(cityCategories).length,
    withPhone: businesses.filter((b) => b.phone).length,
    withWebsite: businesses.filter((b) => b.website).length,
    premium: businesses.filter((b) => b.is_premium).length,
  };
}
