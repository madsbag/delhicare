import { Metadata } from "next";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import { getAllBusinesses, getAllCitySlugs } from "@/lib/data";

export const metadata: Metadata = {
  title: "Find Care Facilities in Delhi NCR - Complete Directory",
  description:
    "Browse 180+ verified nursing homes, elder care, post-hospital care, and home health care in Delhi NCR. Filter by city, category, and ratings.",
  alternates: {
    canonical: "/directory",
  },
};

export default function DirectoryPage() {
  const businesses = getAllBusinesses();
  const allCategories = [...new Set(businesses.map((b) => b.category))];
  const allCities = getAllCitySlugs();

  const breadcrumbs = [{ label: "Directory" }];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Care Facilities in Delhi NCR
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Browse our complete directory of {businesses.length} verified
            nursing homes, elder care facilities, post-hospital care, and
            home health care services across Delhi NCR.
          </p>
        </div>

        <FilterableDirectory
          businesses={businesses}
          allCategories={allCategories}
          allCities={allCities}
        />
      </div>
    </>
  );
}
