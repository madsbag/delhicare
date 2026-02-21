import Link from "next/link";
import {
  Search,
  Building2,
  HeartHandshake,
  Activity,
  Home,
  Star,
  MapPin,
  ArrowRight,
  Phone,
  Crown,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllCategories,
  getAllCities,
  getSiteStats,
  getAllBusinesses,
  getAllSpecialities,
} from "@/lib/data";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "elder-care": <HeartHandshake className="h-8 w-8" />,
  "post-hospital-care": <Activity className="h-8 w-8" />,
  "nursing-homes": <Building2 className="h-8 w-8" />,
  "home-health-care": <Home className="h-8 w-8" />,
};

const CATEGORY_ORDER = [
  "elder-care",
  "post-hospital-care",
  "nursing-homes",
  "home-health-care",
];

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "elder-care": "Senior Care",
  "post-hospital-care": "Post Hospital Care",
  "nursing-homes": "Nursing Homes",
  "home-health-care": "At-Home Care",
};

// Relevant specialities shown under each category card
const CATEGORY_SPECIALITIES: Record<string, { label: string; speciality: string }[]> = {
  "elder-care": [
    { label: "Dementia & Alzheimer's", speciality: "Dementia & Alzheimer's Care" },
    { label: "Geriatric Care", speciality: "Geriatric Care" },
    { label: "Palliative Care", speciality: "Palliative Care" },
  ],
  "post-hospital-care": [
    { label: "Stroke Rehabilitation", speciality: "Stroke Rehabilitation" },
    { label: "Post-Operative Care", speciality: "Post-Operative Care" },
    { label: "Neuro Rehabilitation", speciality: "Neuro Rehabilitation" },
  ],
  "nursing-homes": [
    { label: "Chronic Disease Mgmt", speciality: "Chronic Disease Management" },
    { label: "Palliative Care", speciality: "Palliative Care" },
    { label: "Geriatric Care", speciality: "Geriatric Care" },
  ],
  "home-health-care": [
    { label: "Post-Operative Care", speciality: "Post-Operative Care" },
    { label: "Bedridden Patient Care", speciality: "Bedridden Patient Care" },
    { label: "Critical Care", speciality: "Critical Care" },
  ],
};

export default function HomePage() {
  const categories = getAllCategories();
  const cities = getAllCities();
  const stats = getSiteStats();
  const businesses = getAllBusinesses();
  const specialities = getAllSpecialities();

  const featured = businesses
    .filter((b) => b.is_premium || (b.rating && b.rating >= 4.0))
    .sort((a, b) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 6);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#F7C5B8] via-[#F5B0A0] to-[#E8927C] text-white">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Discover the Best Supportive
              <br />
              Health Care Facilities in India
            </h1>
            <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
              Senior Care, Post Hospital Care, Nursing Homes, At-Home Care
              &mdash; compare and find the right care for your loved ones.
            </p>

            <Link
              href="/directory"
              className="mt-8 inline-flex items-center gap-3 bg-white text-gray-700 rounded-full px-8 py-4 shadow-lg hover:shadow-xl transition-shadow text-lg"
            >
              <Search className="h-5 w-5 text-[#E8927C]" />
              <span>Find care facilities near you...</span>
              <ArrowRight className="h-5 w-5 text-[#E8927C]" />
            </Link>

            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.totalBusinesses.toLocaleString()}+</p>
                <p className="text-sm text-white/80">Care Facilities</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.totalCities}</p>
                <p className="text-sm text-white/80">Cities Covered</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">4</p>
                <p className="text-sm text-white/80">Care Categories</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 60L60 52C120 44 240 28 360 24C480 20 600 28 720 32C840 36 960 36 1080 32C1200 28 1320 20 1380 16L1440 12V60H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
          Browse by Category
        </h2>
        <p className="text-gray-500 text-center mt-2 max-w-lg mx-auto">
          Find the right type of care for your needs
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {CATEGORY_ORDER.map((slug) => {
            const cat = categories[slug];
            if (!cat) return null;
            const specs = CATEGORY_SPECIALITIES[slug] || [];
            return (
              <Card key={slug} className="group hover:shadow-lg transition-all duration-200 h-full border-2 border-[#F0E0D6] hover:border-[#E8927C]">
                <CardContent className="p-6 flex flex-col h-full">
                  <Link href={`/categories/${slug}`} className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-[#FFF5EE]">
                      <div className="text-[#E8927C]">
                        {CATEGORY_ICONS[slug] || <Activity className="h-8 w-8" />}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg group-hover:text-[#D4785F] transition-colors">
                      {CATEGORY_DISPLAY_NAMES[slug] || cat.display_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                      {cat.description.slice(0, 100)}...
                    </p>
                    <p className="mt-3 text-[#E8927C] font-medium text-sm">
                      {cat.count} facilities &rarr;
                    </p>
                  </Link>
                  {specs.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-4 pt-4 border-t border-[#F0E0D6]">
                      {specs.map((s) => (
                        <Link
                          key={s.speciality}
                          href={`/directory?speciality=${encodeURIComponent(s.speciality)}`}
                          className="px-2.5 py-1 rounded-full text-[11px] bg-[#FFF5EE] text-gray-600 hover:bg-[#FFF0F0] hover:text-[#D4785F] border border-[#F0E0D6] hover:border-[#E8927C] transition-all"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Browse by Speciality */}
      <section className="bg-[#FFF5EE] py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Browse by Speciality
          </h2>
          <p className="text-gray-500 text-center mt-2">
            Find facilities that match your specific care needs
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-10 max-w-4xl mx-auto">
            {specialities.slice(0, 21).map((spec) => (
              <Link
                key={spec}
                href={`/directory?speciality=${encodeURIComponent(spec)}`}
                className="px-4 py-2 rounded-full bg-white border border-[#E8D5CB] text-sm text-gray-700 hover:bg-[#FFF0F0] hover:border-[#E8927C] hover:text-[#D4785F] transition-all"
              >
                {spec}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by City */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Browse by City
          </h2>
          <p className="text-gray-500 text-center mt-2">
            Find care facilities across India
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-10">
            {Object.entries(cities)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([slug, city]) => (
                <Link key={slug} href={`/${slug}`}>
                  <Card className="group hover:shadow-md transition-shadow h-full border-[#F0E0D6]">
                    <CardContent className="p-4 text-center">
                      <MapPin className="h-6 w-6 text-[#E8927C] mx-auto mb-2" />
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#D4785F] transition-colors">
                        {city.display_name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {city.count} facilities
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Why Karo Care */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Why Karo Care?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#FFF5EE] rounded-2xl mb-4">
                <MapPin className="h-7 w-7 text-[#E8927C]" />
              </div>
              <h3 className="font-semibold text-gray-900">Search by City</h3>
              <p className="text-sm text-gray-500 mt-2">
                Find facilities across {stats.totalCities} cities in India,
                from metros to satellite towns.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#FFF5EE] rounded-2xl mb-4">
                <Filter className="h-7 w-7 text-[#E8927C]" />
              </div>
              <h3 className="font-semibold text-gray-900">Filter by Speciality</h3>
              <p className="text-sm text-gray-500 mt-2">
                Narrow down by specific care needs like dementia,
                cardiac rehab, palliative care, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#FFF5EE] rounded-2xl mb-4">
                <Star className="h-7 w-7 text-[#E8927C]" />
              </div>
              <h3 className="font-semibold text-gray-900">Compare by Reputation</h3>
              <p className="text-sm text-gray-500 mt-2">
                See real Google ratings and reviews to make
                informed decisions about care facilities.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#FFF5EE] rounded-2xl mb-4">
                <Crown className="h-7 w-7 text-[#E8927C]" />
              </div>
              <h3 className="font-semibold text-gray-900">Spot Premium Facilities</h3>
              <p className="text-sm text-gray-500 mt-2">
                Premium-tagged facilities have detailed profiles,
                accreditations, and rich facility information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="bg-[#FFFAF5] py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
              Featured Facilities
            </h2>
            <p className="text-gray-500 text-center mt-2">
              Top-rated and premium care facilities across India
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {featured.map((biz) => (
                <Link
                  key={biz.slug}
                  href={`/${biz.city_slug}/${biz.category_slug}/${biz.slug}`}
                >
                  <Card className="group hover:shadow-lg transition-shadow h-full border-[#F0E0D6]">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-[#D4785F] transition-colors truncate">
                            {biz.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#FFF0F0] text-[#C4705C] hover:bg-[#FFF0F0] text-xs border-0">
                              {biz.category}
                            </Badge>
                            {biz.is_premium && (
                              <Crown className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                        </div>
                        {biz.rating && (
                          <div className="flex items-center gap-1 bg-[#FFF5EE] px-2 py-1 rounded-lg">
                            <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
                            <span className="font-semibold text-sm">{biz.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {biz.city}
                      </p>
                      {biz.phone && (
                        <p className="text-sm text-[#E8927C] mt-1 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {biz.phone}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link
                href="/directory"
                className="inline-flex items-center gap-2 text-[#E8927C] hover:text-[#D4785F] font-medium"
              >
                View all facilities
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Homepage JSON-LD: WebSite + Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Karo Care",
              url: "https://karocare.in",
              description:
                "Discover the best supportive health care facilities in India. Senior care, post hospital care, nursing homes, and at-home care services.",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://karocare.in/directory?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Karo Care",
              url: "https://karocare.in",
              logo: "https://karocare.in/favicon.ico",
              description:
                "India's comprehensive directory for finding the best supportive health care facilities — Senior Care, Post Hospital Care, Nursing Homes, and At-Home Care services across 17 cities.",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                url: "https://karocare.in/contact",
              },
              sameAs: [],
              areaServed: {
                "@type": "Country",
                name: "India",
              },
            },
          ]),
        }}
      />
    </div>
  );
}
