import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAllCitySlugs,
  getCityBySlug,
  getBusinessesByCitySlug,
  getAllBusinesses,
  getAllCategories,
} from "@/lib/data";

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return getAllCitySlugs().map((slug) => ({ city: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const cityData = getCityBySlug(city);
  if (!cityData) return { title: "Not Found" };

  return {
    title: cityData.seo_title,
    description: cityData.seo_description,
    alternates: {
      canonical: `/${city}`,
    },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { city } = await params;
  const cityData = getCityBySlug(city);
  if (!cityData) notFound();

  const businesses = getBusinessesByCitySlug(city);
  const categories = getAllCategories();
  const allCategories = [...new Set(getAllBusinesses().map((b) => b.category))];
  const allCities = getAllCitySlugs();

  const breadcrumbs = [{ label: cityData.display_name }];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Best Care Facilities in {cityData.display_name}
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            {cityData.description} Browse {businesses.length} verified care
            facilities.
          </p>
        </div>

        {/* Category summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(cityData.category_counts).map(([cat, count]) => {
            const catSlug = cat.toLowerCase().replace(/\s+/g, "-");
            const catData = Object.values(categories).find(
              (c) => c.category_name === cat
            );
            return (
              <Link key={cat} href={`/${city}/${catSlug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {catData?.display_name || cat}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <FilterableDirectory
          businesses={businesses}
          initialCity={city}
          allCategories={allCategories}
          allCities={allCities}
        />
      </div>
    </>
  );
}
