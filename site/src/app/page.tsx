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
  CheckCircle,
  Phone,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getAllCategories,
  getAllCities,
  getSiteStats,
  getAllBusinesses,
} from "@/lib/data";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "nursing-homes": <Building2 className="h-8 w-8" />,
  "elder-care": <HeartHandshake className="h-8 w-8" />,
  "post-hospital-care": <Activity className="h-8 w-8" />,
  "home-health-care": <Home className="h-8 w-8" />,
};

export default function HomePage() {
  const categories = getAllCategories();
  const cities = getAllCities();
  const stats = getSiteStats();
  const businesses = getAllBusinesses();

  // Top-rated businesses for featured section
  const featured = businesses
    .filter((b) => b.rating && b.rating >= 4.0)
    .slice(0, 6);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Find the Best Care Facilities
              <br />
              in Delhi NCR
            </h1>
            <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">
              Discover top-rated nursing homes, elder care, post-hospital care, and home health care services near you.
            </p>

            {/* Search-like CTA */}
            <Link
              href="/directory"
              className="mt-8 inline-flex items-center gap-3 bg-white text-gray-700 rounded-full px-8 py-4 shadow-lg hover:shadow-xl transition-shadow text-lg"
            >
              <Search className="h-5 w-5 text-blue-600" />
              <span>Search care facilities...</span>
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </Link>

            {/* Trust stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-12">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.totalBusinesses}+</p>
                <p className="text-sm text-blue-200">Verified Facilities</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.totalCities}</p>
                <p className="text-sm text-blue-200">Cities Covered</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.avgRating}</p>
                <p className="text-sm text-blue-200">Average Rating</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">4</p>
                <p className="text-sm text-blue-200">Care Categories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
          {Object.entries(categories).map(([slug, cat]) => (
            <Link key={slug} href={`/categories/${slug}`}>
              <Card className="group hover:shadow-lg transition-all duration-200 h-full border-2 hover:border-blue-200">
                <CardContent className="p-6 text-center">
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <div style={{ color: cat.color }}>
                      {CATEGORY_ICONS[slug] || <Activity className="h-8 w-8" />}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                    {cat.display_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {cat.description.slice(0, 100)}...
                  </p>
                  <p className="mt-3 text-blue-600 font-medium text-sm">
                    {cat.count} facilities &rarr;
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by City */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Browse by City
          </h2>
          <p className="text-gray-500 text-center mt-2">
            Find care facilities near you in Delhi NCR
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-10">
            {Object.entries(cities)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([slug, city]) => (
                <Link key={slug} href={`/${slug}`}>
                  <Card className="group hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-4 text-center">
                      <MapPin className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {city.display_name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {city.count} facilities
                      </p>
                      {city.avg_rating > 0 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Star
                            className="h-3.5 w-3.5 text-yellow-500"
                            fill="currentColor"
                          />
                          <span className="text-xs text-gray-500">
                            {city.avg_rating} avg
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Top-Rated Facilities
          </h2>
          <p className="text-gray-500 text-center mt-2">
            Highest rated care facilities across Delhi NCR
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {featured.map((biz) => (
              <Link
                key={biz.slug}
                href={`/${biz.city_slug}/${biz.category_slug}/${biz.slug}`}
              >
                <Card className="group hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {biz.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {biz.category}
                          </Badge>
                          {biz.verified && (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </div>
                      </div>
                      {biz.rating && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                          <Star
                            className="h-4 w-4 text-yellow-500"
                            fill="currentColor"
                          />
                          <span className="font-semibold text-sm">
                            {biz.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {biz.city}
                    </p>
                    {biz.phone && (
                      <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
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
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              View all facilities
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Why DelhiCare */}
      <section className="bg-blue-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Why DelhiCare?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
                <Shield className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Verified Listings</h3>
              <p className="text-sm text-gray-500 mt-2">
                Every facility is verified with accurate ratings,
                detailed services, and contact information.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
                <Star className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Trusted Ratings</h3>
              <p className="text-sm text-gray-500 mt-2">
                Ratings derived from real patient experiences to help you make
                informed decisions.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
                <Phone className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Direct Contact</h3>
              <p className="text-sm text-gray-500 mt-2">
                Call, email, or WhatsApp facilities directly. No middlemen, no
                commission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Homepage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "DelhiCare",
            url: "https://delhicare.in",
            description:
              "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Delhi NCR.",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://delhicare.in/directory?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
    </div>
  );
}
