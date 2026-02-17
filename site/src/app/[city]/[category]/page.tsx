import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import {
  getAllCityCategoryCombos,
  getBusinessesByCityAndCategory,
  getCityBySlug,
  getCategoryBySlug,
  getAllCitySlugs,
  getAllBusinesses,
} from "@/lib/data";

interface PageProps {
  params: Promise<{ city: string; category: string }>;
}

export async function generateStaticParams() {
  return getAllCityCategoryCombos().map((cc) => ({
    city: cc.city_slug,
    category: cc.category_slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, category } = await params;
  const cityData = getCityBySlug(city);
  const catData = getCategoryBySlug(category);
  if (!cityData || !catData) return { title: "Not Found" };

  return {
    title: `Best ${catData.display_name} in ${cityData.display_name} - Ratings & Services`,
    description: `Find top-rated ${catData.display_name.toLowerCase()} in ${cityData.display_name}. Compare facilities, check ratings, and get contact information.`,
  };
}

export default async function CityCategoryPage({ params }: PageProps) {
  const { city, category } = await params;
  const cityData = getCityBySlug(city);
  const catData = getCategoryBySlug(category);

  if (!cityData || !catData) notFound();

  const businesses = getBusinessesByCityAndCategory(city, category);
  const allCategories = [...new Set(getAllBusinesses().map((b) => b.category))];
  const allCities = getAllCitySlugs();

  const breadcrumbs = [
    { label: cityData.display_name, href: `/${city}` },
    { label: catData.display_name },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Best {catData.display_name} in {cityData.display_name}
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Find and compare {businesses.length} verified{" "}
            {catData.display_name.toLowerCase()} in {cityData.display_name}.
            Check ratings, compare services, and get contact information.
          </p>
        </div>

        <FilterableDirectory
          businesses={businesses}
          initialCategory={catData.category_name}
          initialCity={city}
          allCategories={allCategories}
          allCities={allCities}
        />
      </div>
    </>
  );
}
