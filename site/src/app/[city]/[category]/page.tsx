import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, Crown } from "lucide-react";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import {
  getAllCityCategoryCombos,
  getCityBySlug,
  getCategoryBySlug,
  getAllCitySlugs,
  getAllCities,
  getAllCategories,
  getAllSpecialities,
  getAllFacilityTypes,
  getBusinessesByCityAndCategory,
  toListItem,
} from "@/lib/data";

export const dynamicParams = false;

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

  const count = getBusinessesByCityAndCategory(city, category).length;

  return {
    title: `Best ${catData.display_name} in ${cityData.display_name} - Ratings & Services`,
    description: `Find and compare ${count} top-rated ${catData.display_name.toLowerCase()} in ${cityData.display_name}. Check ratings, specialities, and contact information.`,
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

  const specificBusinesses = getBusinessesByCityAndCategory(city, category);
  const allCategories = [...new Set(specificBusinesses.map((b) => b.category))];
  const allCities = getAllCitySlugs();
  const allSpecialities = getAllSpecialities();
  const allFacilityTypes = getAllFacilityTypes();

  // Facility type breakdown
  const ftCounts: Record<string, number> = {};
  const specCounts: Record<string, number> = {};
  for (const b of specificBusinesses) {
    if (b.facility_type && b.facility_type !== "Unknown") {
      ftCounts[b.facility_type] = (ftCounts[b.facility_type] || 0) + 1;
    }
    if (b.specialities) {
      for (const s of b.specialities) {
        specCounts[s] = (specCounts[s] || 0) + 1;
      }
    }
  }

  // Top-rated in this city+category
  const topRated = specificBusinesses
    .filter((b) => b.rating && b.rating >= 3.0)
    .sort((a, b) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 6);

  const topSpecs = Object.entries(specCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const premiumCount = specificBusinesses.filter((b) => b.is_premium).length;
  const ratedBizs = specificBusinesses.filter((b) => b.rating);
  const avgRating = ratedBizs.length > 0
    ? (ratedBizs.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBizs.length).toFixed(1)
    : null;

  const breadcrumbs = [
    { label: cityData.display_name, href: `/${city}` },
    { label: catData.display_name },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Best {catData.display_name} in {cityData.display_name}
          </h1>
          <p className="mt-2 text-gray-600 max-w-3xl">
            Find and compare {specificBusinesses.length}{" "}
            {catData.display_name.toLowerCase()} facilities in {cityData.display_name}.
            {avgRating && ` Average rating: ${avgRating}/5.`}
            {premiumCount > 0 && ` ${premiumCount} premium-verified facilities.`}
            {" "}Check ratings, specialities, and contact information.
          </p>

          {/* Facility type stats */}
          {Object.keys(ftCounts).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(ftCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([ft, count]) => (
                  <span key={ft} className="px-3 py-1 rounded-full text-sm bg-[#FFF5EE] text-gray-600 border border-[#F0E0D6]">
                    {ft} <span className="text-gray-400">({count})</span>
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Top-rated facilities — server-rendered for SEO */}
        {topRated.length > 0 && (
          <section className="mb-6 bg-[#FFFAF5] rounded-xl border border-[#F0E0D6] p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Top Rated {catData.display_name} in {cityData.display_name}
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
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {biz.short_address || biz.formatted_address || biz.city}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {biz.rating && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                          <span className="text-xs font-medium text-gray-700">
                            {biz.rating.toFixed(1)}
                          </span>
                          {biz.reviews ? (
                            <span className="text-xs text-gray-400">({biz.reviews})</span>
                          ) : null}
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

        {/* Common specialities */}
        {topSpecs.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Common Specialities
            </h2>
            <div className="flex flex-wrap gap-2">
              {topSpecs.map(([spec, count]) => (
                <Link
                  key={spec}
                  href={`/directory?speciality=${encodeURIComponent(spec)}&city=${city}`}
                  className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#E8D5CB] text-gray-600 hover:bg-[#FFF0F0] hover:text-[#D4785F] hover:border-[#E8927C] transition-all"
                >
                  {spec} <span className="text-gray-400">({count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <FilterableDirectory
          businesses={specificBusinesses.map(toListItem)}
          initialCategory={catData.category_name}
          initialCity={city}
          allCategories={allCategories}
          allCities={allCities}
          allSpecialities={allSpecialities}
          allFacilityTypes={allFacilityTypes}
        />

        {/* Cross-links for SEO */}
        <div className="mt-10 pt-6 border-t border-[#F0E0D6]">
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
                      className="text-sm text-[#E8927C] hover:text-[#D4785F] px-3 py-1.5 bg-[#FFF5EE] rounded-full"
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
                      className="text-sm text-[#E8927C] hover:text-[#D4785F] px-3 py-1.5 bg-[#FFF5EE] rounded-full"
                    >
                      {cat.display_name}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ItemList JSON-LD */}
      {topRated.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Best ${catData.display_name} in ${cityData.display_name}`,
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
