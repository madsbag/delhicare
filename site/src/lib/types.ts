export interface Business {
  slug: string;
  name: string;
  category: string;
  category_slug: string;
  google_category: string;
  city: string;
  city_slug: string;
  state: string;
  full_address: string;
  phone: string;
  phone2: string;
  phone3: string;
  email: string;
  email2: string;
  website: string;
  rating: number | null;
  reviews: number;
  verified: boolean;
  working_hours: Record<string, string>;
  lat: number | null;
  lng: number | null;
  google_maps_link: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  whatsapp: string;
  contact_name: string;
  contact_title: string;
  // LLM-extracted content
  services: Service[];
  specializations: string[];
  doctors: Doctor[];
  facilities: Facility[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  about_description: string;
  long_description: string;
  meta_description: string;
  seo_title: string;
  founding_year?: string;
  mission_statement?: string;
  team_size?: string;
  bed_count?: string;
  insurance_accepted?: string[];
  languages_spoken?: string[];
  accreditations?: string[];
  content_source?: string;
  // Classification data
  original_sheet_category: string;
  category_match: string;
  inferred_category: string;
  classification_keywords: string;
  business_summary: string;
}

export interface Service {
  name: string;
  description: string;
}

export interface Doctor {
  name: string;
  title: string;
  qualifications: string;
  specialization: string;
}

export interface Facility {
  name: string;
  description: string;
}

export interface Testimonial {
  text: string;
  author: string;
  rating?: string;
}

export interface FAQ {
  question: string;
  answer: string;
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
  verified: boolean;
  has_website: boolean;
  phone: string;
  specializations?: string[];
  service_names?: string[];
}
