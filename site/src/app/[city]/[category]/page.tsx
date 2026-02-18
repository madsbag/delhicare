import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import {
  getAllCityCategoryCombos,
  getBusinessesByCityAndCategory,
  getCityBySlug,
  getCategoryBySlug,
  getAllCitySlugs,
  getAllBusinesses,
  getAllCities,
  getAllCategories,
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
    alternates: {
      canonical: `/${city}/${category}`,
    },
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

        {/* Cross-links for SEO */}
        <div className="mt-10 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                {catData.display_name} in Other Cities
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(getAllCities())
                  .filter(([slug]) => slug !== city)
                  .map(([slug, c]) => (
                    <Link
                      key={slug}
                      href={`/${slug}/${category}`}
                      className="text-sm text-blue-600 hover:underline px-3 py-1.5 bg-blue-50 rounded-full"
                    >
                      {c.display_name}
                    </Link>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Other Care in {cityData.display_name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(getAllCategories())
                  .filter(([slug]) => slug !== category)
                  .map(([slug, cat]) => (
                    <Link
                      key={slug}
                      href={`/${city}/${slug}`}
                      className="text-sm text-blue-600 hover:underline px-3 py-1.5 bg-blue-50 rounded-full"
                    >
                      {cat.display_name}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
