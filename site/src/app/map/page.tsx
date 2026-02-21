import { Metadata } from "next";
import { getAllBusinesses, getAllSpecialities, getAllFacilityTypes } from "@/lib/data";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { MapPageClient } from "@/components/MapPageClient";

export const metadata: Metadata = {
  title: "Map - Find Care Facilities Near You",
  description:
    "Interactive map of all care facilities in India. Find senior care, post hospital care, nursing homes, and at-home care near your location.",
  alternates: {
    canonical: "/map",
  },
};

export default function MapPage() {
  const businesses = getAllBusinesses();
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
