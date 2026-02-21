export interface Business {
  // Identity
  slug: string;
  name: string;
  category: string;
  category_slug: string;
  city: string;
  city_slug: string;

  // Contact & Location
  formatted_address: string;
  short_address: string;
  phone: string;
  phone_international: string;
  website: string;
  lat: number | null;
  lng: number | null;
  google_maps_link: string;

  // Ratings
  rating: number | null;
  reviews: number;

  // Operations
  working_hours: string[];

  // LLM-Extracted Content
  description: string;
  specialities: string[];
  services: string[];
  facility_features: string[];
  facility_type: string;
  bed_count: number | null;
  trust_signals: string[];
  is_premium: boolean;

  // Google Places Data
  google_place_id?: string;
  photos?: PlacePhoto[];
}

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: PhotoAttribution[];
}

export interface PhotoAttribution {
  displayName: string;
  uri: string;
  photoUri: string;
}

export interface CityData {
  display_name: string;
  slug: string;
  description: string;
  seo_title: string;
  seo_description: string;
  count: number;
  category_counts: Record<string, number>;
  top_rated_slugs: string[];
  avg_rating: number;
}

export interface CategoryData {
  display_name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  seo_title: string;
  seo_description: string;
  category_name: string;
  count: number;
  city_counts: Record<string, number>;
  avg_rating: number;
}

export interface CityCategoryData {
  city: string;
  city_slug: string;
  category: string;
  category_slug: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  business_slugs: string[];
  count: number;
}

export interface SearchEntry {
  slug: string;
  name: string;
  category: string;
  category_slug: string;
  city: string;
  city_slug: string;
  rating: number | null;
  reviews: number;
  has_website: boolean;
  phone: string;
  specialities?: string[];
  services?: string[];
  is_premium?: boolean;
}
