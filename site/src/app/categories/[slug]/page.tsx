import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAllCategorySlugs,
  getCategoryBySlug,
  getBusinessesByCategorySlug,
  getAllBusinesses,
  getAllCitySlugs,
  getAllCities,
} from "@/lib/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catData = getCategoryBySlug(slug);
  if (!catData) return { title: "Not Found" };

  return {
    title: catData.seo_title,
    description: catData.seo_description,
    alternates: {
      canonical: `/categories/${slug}`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const catData = getCategoryBySlug(slug);
  if (!catData) notFound();

  const businesses = getBusinessesByCategorySlug(slug);
  const cities = getAllCities();
  const allCategories = [...new Set(getAllBusinesses().map((b) => b.category))];
  const allCities = getAllCitySlugs();

  const breadcrumbs = [{ label: catData.display_name }];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {catData.seo_title || `Best ${catData.display_name} in Delhi NCR`}
          </h1>
          <p className="mt-2 text-gray-600 max-w-3xl">{catData.description}</p>
        </div>

        {/* City breakdown cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {Object.entries(catData.city_counts)
            .sort((a, b) => b[1] - a[1])
            .map(([city, count]) => {
              const citySlug = city.toLowerCase().replace(/\s+/g, "-");
              return (
                <Link key={city} href={`/${citySlug}/${slug}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold text-blue-600">
                        {count}
                      </p>
                      <p className="text-xs text-gray-500">{city}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
        </div>

        <FilterableDirectory
          businesses={businesses}
          initialCategory={catData.category_name}
          allCategories={allCategories}
          allCities={allCities}
        />
      </div>
    </>
  );
}
