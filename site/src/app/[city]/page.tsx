import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, MapPin, ArrowRight, Crown } from "lucide-react";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { FilterableDirectory } from "@/components/FilterBar";
import {
  getAllCitySlugs,
  getCityBySlug,
  getBusinessesByCitySlug,
  getAllSpecialities,
  getAllFacilityTypes,
  getAllCategories,
  toListItem,
  topBusinesses,
} from "@/lib/data";

// Render city pages on-demand with ISR (cache for 1 day).
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ city: string }>;
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
  const allCategories = [...new Set(businesses.map((b) => b.category))];
  const allCities = getAllCitySlugs();
  const allSpecialities = getAllSpecialities();
  const allFacilityTypes = getAllFacilityTypes();
  const categories = getAllCategories();

  // Category breakdown for this city
  const catCounts: Record<string, number> = {};
  const facilityTypeCounts: Record<string, number> = {};
  const specCounts: Record<string, number> = {};
  for (const b of businesses) {
    catCounts[b.category] = (catCounts[b.category] || 0) + 1;
    if (b.facility_type && b.facility_type !== "Unknown") {
      facilityTypeCounts[b.facility_type] = (facilityTypeCounts[b.facility_type] || 0) + 1;
    }
    if (b.specialities) {
      for (const s of b.specialities) {
        specCounts[s] = (specCounts[s] || 0) + 1;
      }
    }
  }

  // Top-rated facilities (server-rendered for crawlers)
  const topRated = businesses
    .filter((b) => b.rating && b.rating >= 3.5)
    .sort((a, b) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 5);

  // Top specialities in this city
  const topSpecs = Object.entries(specCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

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
          <p className="mt-2 text-gray-600 max-w-3xl">
            {cityData.description} Browse and compare {businesses.length} care
            facilities across senior care, nursing homes, post-hospital care, and
            at-home care services in {cityData.display_name}.
          </p>

          {/* Category stats bar — crawlable summary */}
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(catCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => {
                const catSlug = Object.entries(categories).find(
                  ([, v]) => v.category_name === cat
                )?.[0];
                return (
                  <Link
                    key={cat}
                    href={`/${city}/${catSlug}`}
                    className="px-3 py-1.5 rounded-full text-sm bg-[#FFF5EE] text-gray-700 border border-[#F0E0D6] hover:border-[#E8927C] hover:text-[#D4785F] transition-all"
                  >
                    {cat} <span className="text-gray-400 ml-1">({count})</span>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Top-rated facilities — server-rendered for SEO */}
        {topRated.length > 0 && (
          <section className="mb-8 bg-[#FFFAF5] rounded-xl border border-[#F0E0D6] p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Rated in {cityData.display_name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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
                    <p className="text-xs text-gray-500 mt-0.5">{biz.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {biz.rating && (
                        <>
                          <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                          <span className="text-xs font-medium text-gray-700">
                            {biz.rating.toFixed(1)}
                          </span>
                        </>
                      )}
                      {biz.is_premium && (
                        <Crown className="h-3 w-3 text-indigo-500 ml-1" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Popular specialities in this city */}
        {topSpecs.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Popular Specialities in {cityData.display_name}
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
          businesses={topBusinesses(businesses, 100).map(toListItem)}
          initialCity={city}
          allCategories={allCategories}
          allCities={allCities}
          allSpecialities={allSpecialities}
          allFacilityTypes={allFacilityTypes}
        />

        {/* Cross-links for SEO */}
        <div className="mt-10 pt-6 border-t border-[#F0E0D6]">
          <h2 className="text-sm font-medium text-gray-500 mb-3">
            Care Facilities in Other Cities
          </h2>
          <div className="flex flex-wrap gap-2">
            {getAllCitySlugs()
              .filter((s) => s !== city)
              .map((s) => {
                const c = getCityBySlug(s);
                return c ? (
                  <Link
                    key={s}
                    href={`/${s}`}
                    className="text-sm text-[#E8927C] hover:text-[#D4785F] px-3 py-1.5 bg-[#FFF5EE] rounded-full"
                  >
                    {c.display_name}
                  </Link>
                ) : null;
              })}
          </div>
        </div>
      </div>

      {/* ItemList JSON-LD for top facilities */}
      {topRated.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Top Care Facilities in ${cityData.display_name}`,
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
