import { Metadata } from "next";
import { getAllBusinesses } from "@/lib/data";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { MapPageClient } from "@/components/MapPageClient";

export const metadata: Metadata = {
  title: "Map - Find Care Facilities Near You",
  description:
    "Interactive map of all care facilities in Delhi NCR. Find nursing homes, elder care, post-hospital care, and home health care near your location.",
};

export default function MapPage() {
  const businesses = getAllBusinesses();
  const breadcrumbs = [{ label: "Map" }];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="relative">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-white/90 backdrop-blur rounded-full px-4 py-1.5 shadow-md">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        </div>
        <MapPageClient businesses={businesses} />
      </div>
    </>
  );
}
