import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, Crown, MapPin } from "lucide-react";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import {
  getAllCitySpecialityCombos,
  getCityBySlug,
  getSpecialityBySlug,
  getBusinessesByCityAndSpeciality,
  getAllCities,
  slugifySpeciality,
  getAllSpecialities,
} from "@/lib/data";

interface PageProps {
  params: Promise<{ city: string; speciality: string }>;
}

export async function generateStaticParams() {
  return getAllCitySpecialityCombos().map((combo) => ({
    city: combo.city_slug,
    speciality: combo.speciality_slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, speciality } = await params;
  const cityData = getCityBySlug(city);
  const specName = getSpecialityBySlug(speciality);
  if (!cityData || !specName) return { title: "Not Found" };

  const count = getBusinessesByCityAndSpeciality(city, specName).length;

  return {
    title: `${specName} in ${cityData.display_name} - ${count} Facilities | Karo Care`,
    description: `Find ${count} ${specName.toLowerCase()} facilities in ${cityData.display_name}. Compare ratings, services, and contact information for the best ${specName.toLowerCase()} providers.`,
    alternates: {
      canonical: `/${city}/speciality/${speciality}`,
    },
  };
}

export default async function SpecialityPage({ params }: PageProps) {
  const { city, speciality } = await params;
  const cityData = getCityBySlug(city);
  const specName = getSpecialityBySlug(speciality);

  if (!cityData || !specName) notFound();

  const facilities = getBusinessesByCityAndSpeciality(city, specName);

  // Sort: premium first, then by rating
  const sorted = [...facilities].sort((a, b) => {
    if (a.is_premium && !b.is_premium) return -1;
    if (!a.is_premium && b.is_premium) return 1;
    return (b.rating || 0) - (a.rating || 0);
  });

  const topRated = sorted.filter((b) => b.rating && b.rating >= 3.0).slice(0, 12);
  const premiumCount = facilities.filter((b) => b.is_premium).length;
  const ratedBizs = facilities.filter((b) => b.rating);
  const avgRating =
    ratedBizs.length > 0
      ? (ratedBizs.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBizs.length).toFixed(1)
      : null;

  // Category breakdown
  const catCounts: Record<string, number> = {};
  for (const b of facilities) {
    catCounts[b.category] = (catCounts[b.category] || 0) + 1;
  }

  // Facility type breakdown
  const ftCounts: Record<string, number> = {};
  for (const b of facilities) {
    if (b.facility_type && b.facility_type !== "Unknown") {
      ftCounts[b.facility_type] = (ftCounts[b.facility_type] || 0) + 1;
    }
  }

  // Same speciality in other cities
  const allCities = getAllCities();
  const otherCityCombos = getAllCitySpecialityCombos()
    .filter((c) => c.speciality_slug === speciality && c.city_slug !== city)
    .sort((a, b) => b.count - a.count);

  // Other specialities in this city
  const allSpecs = getAllSpecialities();
  const otherSpecs = allSpecs
    .filter((s) => s !== specName)
    .map((s) => ({
      name: s,
      slug: slugifySpeciality(s),
      count: getBusinessesByCityAndSpeciality(city, s).length,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const breadcrumbs = [
    { label: cityData.display_name, href: `/${city}` },
    { label: specName },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {specName} in {cityData.display_name}
          </h1>
          <p className="mt-2 text-gray-600 max-w-3xl">
            Browse {facilities.length} {specName.toLowerCase()} facilities in{" "}
            {cityData.display_name}.
            {avgRating && ` Average rating: ${avgRating}/5.`}
            {premiumCount > 0 && ` ${premiumCount} premium-verified facilities.`}
            {" "}Compare ratings, specialities, and services to find the right care provider.
          </p>

          {/* Facility type & category breakdowns */}
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(catCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <span
                  key={cat}
                  className="px-3 py-1 rounded-full text-sm bg-[#FFF5EE] text-gray-600 border border-[#F0E0D6]"
                >
                  {cat} <span className="text-gray-400">({count})</span>
                </span>
              ))}
            {Object.entries(ftCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([ft, count]) => (
                <span
                  key={ft}
                  className="px-3 py-1 rounded-full text-xs bg-white text-gray-500 border border-[#E8D5CB]"
                >
                  {ft} <span className="text-gray-400">({count})</span>
                </span>
              ))}
          </div>
        </div>

        {/* Full facility listing — server-rendered for SEO */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            All {specName} Facilities in {cityData.display_name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((biz) => (
              <Link
                key={biz.slug}
                href={`/${biz.city_slug}/${biz.category_slug}/${biz.slug}`}
                className="flex flex-col p-4 rounded-lg bg-white border border-[#F0E0D6] hover:border-[#E8927C] hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-[#D4785F] transition-colors line-clamp-2">
                    {biz.name}
                  </h3>
                  {biz.is_premium && (
                    <Crown className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  )}
                </div>

                {(biz.short_address || biz.formatted_address) && (
                  <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {biz.short_address || biz.formatted_address}
                    </span>
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  {biz.rating && (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 text-amber-400" fill="currentColor" />
                      <span className="text-xs font-medium text-gray-700">
                        {biz.rating.toFixed(1)}
                      </span>
                      {biz.reviews > 0 && (
                        <span className="text-xs text-gray-400">
                          ({biz.reviews})
                        </span>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{biz.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Same speciality in other cities */}
        {otherCityCombos.length > 0 && (
          <section className="mb-6 pt-6 border-t border-[#F0E0D6]">
            <h2 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
              {specName} in Other Cities
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherCityCombos.map((combo) => {
                const c = allCities[combo.city_slug];
                return c ? (
                  <Link
                    key={combo.city_slug}
                    href={`/${combo.city_slug}/speciality/${speciality}`}
                    className="px-3 py-1.5 rounded-full text-sm bg-[#FFF5EE] text-gray-700 border border-[#F0E0D6] hover:border-[#E8927C] hover:text-[#D4785F] transition-all"
                  >
                    {c.display_name}{" "}
                    <span className="text-gray-400">({combo.count})</span>
                  </Link>
                ) : null;
              })}
            </div>
          </section>
        )}

        {/* Other specialities in this city */}
        {otherSpecs.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Other Specialities in {cityData.display_name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherSpecs.map((spec) => (
                <Link
                  key={spec.slug}
                  href={`/${city}/speciality/${spec.slug}`}
                  className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#E8D5CB] text-gray-600 hover:bg-[#FFF0F0] hover:text-[#D4785F] hover:border-[#E8927C] transition-all"
                >
                  {spec.name} <span className="text-gray-400">({spec.count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ItemList JSON-LD */}
      {topRated.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `${specName} Facilities in ${cityData.display_name}`,
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
