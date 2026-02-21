import { Metadata } from "next";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import { getAllBusinessesSlim, getAllCitySlugs, getAllSpecialities, getAllFacilityTypes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Find Supportive Health Care Facilities in India - Complete Directory",
  description:
    "Browse senior care, post hospital care, nursing homes, and at-home care across 17 Indian cities. Filter by city, category, and speciality.",
  alternates: {
    canonical: "/directory",
  },
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ speciality?: string; city?: string; category?: string }>;
}) {
  const params = await searchParams;
  const businesses = getAllBusinessesSlim();
  const allCategories = [...new Set(businesses.map((b) => b.category))];
  const allCities = getAllCitySlugs();
  const allSpecialities = getAllSpecialities();
  const allFacilityTypes = getAllFacilityTypes();

  const breadcrumbs = [{ label: "Directory" }];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Supportive Health Care Facilities in India
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Browse our complete directory of {businesses.length} senior care,
            nursing homes, post hospital care, and at-home care facilities
            across India.
          </p>
        </div>

        <FilterableDirectory
          businesses={businesses}
          allCategories={allCategories}
          allCities={allCities}
          allSpecialities={allSpecialities}
          allFacilityTypes={allFacilityTypes}
          initialSpeciality={params.speciality}
          initialCity={params.city}
          initialCategory={params.category}
        />
      </div>
    </>
  );
}
