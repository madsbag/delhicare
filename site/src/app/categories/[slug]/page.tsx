import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, Crown } from "lucide-react";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import {
  getAllCategorySlugs,
  getCategoryBySlug,
  getAllBusinesses,
  getAllCitySlugs,
  getAllSpecialities,
  getAllFacilityTypes,
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

  const allBusinesses = getAllBusinesses();
  const categoryBusinesses = allBusinesses.filter((b) => b.category_slug === slug);
  const allCategories = [...new Set(allBusinesses.map((b) => b.category))];
  const allCities = getAllCitySlugs();
  const allSpecialities = getAllSpecialities();
  const allFacilityTypes = getAllFacilityTypes();
  const cities = getAllCities();

  // City distribution for this category
  const cityCounts: Record<string, number> = {};
  const specCounts: Record<string, number> = {};
  for (const b of categoryBusinesses) {
    cityCounts[b.city_slug] = (cityCounts[b.city_slug] || 0) + 1;
    if (b.specialities) {
      for (const s of b.specialities) {
        specCounts[s] = (specCounts[s] || 0) + 1;
      }
    }
  }

  // Top-rated in this category
  const topRated = categoryBusinesses
    .filter((b) => b.rating && b.rating >= 4.0)
    .sort((a, b) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 6);

  const topSpecs = Object.entries(specCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const premiumCount = categoryBusinesses.filter((b) => b.is_premium).length;

  const breadcrumbs = [{ label: catData.display_name }];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {catData.seo_title || `Best ${catData.display_name} in India`}
          </h1>
          <p className="mt-2 text-gray-600 max-w-3xl">
            {catData.description} Browse {categoryBusinesses.length}{" "}
            {catData.display_name.toLowerCase()} facilities across{" "}
            {Object.keys(cityCounts).length} cities in India.
            {premiumCount > 0 && ` ${premiumCount} premium-verified facilities available.`}
          </p>
        </div>

        {/* Browse by City — server-rendered links */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
            {catData.display_name} by City
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(cityCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([citySlug, count]) => {
                const city = cities[citySlug];
                return city ? (
                  <Link
                    key={citySlug}
                    href={`/${citySlug}/${slug}`}
                    className="px-3 py-1.5 rounded-full text-sm bg-[#FFF5EE] text-gray-700 border border-[#F0E0D6] hover:border-[#E8927C] hover:text-[#D4785F] transition-all"
                  >
                    {city.display_name}{" "}
                    <span className="text-gray-400">({count})</span>
                  </Link>
                ) : null;
              })}
          </div>
        </section>

        {/* Top-rated facilities */}
        {topRated.length > 0 && (
          <section className="mb-6 bg-[#FFFAF5] rounded-xl border border-[#F0E0D6] p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Top Rated {catData.display_name} in India
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {topRated.map((biz) => (
                <Link
                  key={biz.slug}
                  href={`/${biz.city_slug}/${biz.category_slug}/${biz.slug}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white border border-[#F0E0D6] hover:border-[#E8927C] hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-[#D4785F] truncate transition-colors">
                      {biz.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{biz.city}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {biz.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                          <span className="text-xs font-medium text-gray-700">
                            {biz.rating.toFixed(1)}
                          </span>
                        </span>
                      )}
                      {biz.is_premium && (
                        <Crown className="h-3 w-3 text-indigo-500" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Top specialities */}
        {topSpecs.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Common Specialities
            </h2>
            <div className="flex flex-wrap gap-2">
              {topSpecs.map(([spec, count]) => (
                <Link
                  key={spec}
                  href={`/directory?speciality=${encodeURIComponent(spec)}`}
                  className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#E8D5CB] text-gray-600 hover:bg-[#FFF0F0] hover:text-[#D4785F] hover:border-[#E8927C] transition-all"
                >
                  {spec} <span className="text-gray-400">({count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <FilterableDirectory
          businesses={allBusinesses}
          initialCategory={catData.category_name}
          allCategories={allCategories}
          allCities={allCities}
          allSpecialities={allSpecialities}
          allFacilityTypes={allFacilityTypes}
        />
      </div>

      {/* ItemList JSON-LD */}
      {topRated.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Top ${catData.display_name} in India`,
              numberOfItems: topRated.length,
              itemListElement: topRated.map((biz, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://karocare.in/${biz.city_slug}/${biz.category_slug}/${biz.slug}`,
                name: biz.name,
              })),
            }),
          }}
        />
      )}
    </>
  );
}
