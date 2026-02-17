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

// ─── Stats ───────────────────────────────────────────────────────────────────

export function getSiteStats() {
  return {
    totalBusinesses: businesses.length,
    totalCities: Object.keys(cities).length,
    totalCategories: Object.keys(categories).length,
    totalCityCategoryCombos: Object.keys(cityCategories).length,
    withPhone: businesses.filter((b) => b.phone).length,
    withEmail: businesses.filter((b) => b.email).length,
    withWebsite: businesses.filter((b) => b.website).length,
    verified: businesses.filter((b) => b.verified).length,
    avgRating:
      Math.round(
        (businesses
          .filter((b) => b.rating)
          .reduce((sum, b) => sum + (b.rating || 0), 0) /
          Math.max(1, businesses.filter((b) => b.rating).length)) *
          10
      ) / 10,
  };
}
