import { Metadata } from "next";
import { getAllBusinesses, getAllSpecialities, getAllFacilityTypes } from "@/lib/data";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { MapPageClient } from "@/components/MapPageClient";
import type { Business } from "@/lib/types";

// Render map page on demand — passing all businesses inline makes it 18 MB+ static.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Map - Find Care Facilities Near You",
  description:
    "Interactive map of all care facilities in India. Find senior care, post hospital care, nursing homes, and at-home care near your location.",
  alternates: {
    canonical: "/map",
  },
};

/** Slim a business to only the fields the map needs (lat, lng, name, etc.) */
function toMapItem(b: Business): Business {
  return {
    slug: b.slug,
    name: b.name,
    category: b.category,
    category_slug: b.category_slug,
    city: b.city,
    city_slug: b.city_slug,
    formatted_address: "",
    short_address: b.short_address || "",
    phone: b.phone || "",
    phone_international: "",
    website: "",
    lat: b.lat,
    lng: b.lng,
    google_maps_link: "",
    rating: b.rating,
    reviews: 0,
    working_hours: [],
    description: "",
    specialities: b.specialities || [],
    services: [],
    facility_features: [],
    facility_type: b.facility_type || "",
    bed_count: null,
    trust_signals: [],
    is_premium: b.is_premium,
  };
}

export default function MapPage() {
  const businesses = getAllBusinesses().filter((b) => b.lat && b.lng).map(toMapItem);
  const allSpecialities = getAllSpecialities();
  const allFacilityTypes = getAllFacilityTypes();
  const breadcrumbs = [{ label: "Map" }];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="relative">
        <MapPageClient
          businesses={businesses}
          allSpecialities={allSpecialities}
          allFacilityTypes={allFacilityTypes}
        />
      </div>
    </>
  );
}
