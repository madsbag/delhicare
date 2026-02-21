import Link from "next/link";
import { Heart, Search, MapPin, ArrowRight } from "lucide-react";
import { getAllCities } from "@/lib/data";

export default function NotFound() {
  const cities = getAllCities();
  const topCities = Object.entries(cities)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Heart className="h-16 w-16 text-[#E8D5CB] mx-auto mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 mb-3">
        Page Not Found
      </h1>
      <p className="text-gray-500 text-lg max-w-md mx-auto mb-10">
        Sorry, the page you are looking for does not exist or may have been
        moved. Let us help you find the right care facility.
      </p>

      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <Link
          href="/directory"
          className="inline-flex items-center gap-2 bg-[#E8927C] text-white px-6 py-3 rounded-full font-medium hover:bg-[#D4785F] transition-colors"
        >
          <Search className="h-4 w-4" />
          Browse All Facilities
        </Link>
        <Link
          href="/map"
          className="inline-flex items-center gap-2 bg-white border border-[#E8D5CB] text-gray-700 px-6 py-3 rounded-full font-medium hover:border-[#E8927C] transition-colors"
        >
          <MapPin className="h-4 w-4 text-[#E8927C]" />
          View on Map
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Browse by City
        </h2>
        <div className="flex flex-wrap justify-center gap-2">
          {topCities.map(([slug, city]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="px-4 py-2 rounded-full bg-[#FFF5EE] text-sm text-gray-700 hover:bg-[#FFF0F0] hover:text-[#D4785F] border border-[#F0E0D6] hover:border-[#E8927C] transition-all"
            >
              {city.display_name}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Browse by Category
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/categories/elder-care" className="px-4 py-2 rounded-full bg-[#FFF5EE] text-sm text-gray-700 hover:bg-[#FFF0F0] hover:text-[#D4785F] border border-[#F0E0D6] hover:border-[#E8927C] transition-all">
              Senior Care
            </Link>
            <Link href="/categories/nursing-homes" className="px-4 py-2 rounded-full bg-[#FFF5EE] text-sm text-gray-700 hover:bg-[#FFF0F0] hover:text-[#D4785F] border border-[#F0E0D6] hover:border-[#E8927C] transition-all">
              Nursing Homes
            </Link>
            <Link href="/categories/post-hospital-care" className="px-4 py-2 rounded-full bg-[#FFF5EE] text-sm text-gray-700 hover:bg-[#FFF0F0] hover:text-[#D4785F] border border-[#F0E0D6] hover:border-[#E8927C] transition-all">
              Post Hospital Care
            </Link>
            <Link href="/categories/home-health-care" className="px-4 py-2 rounded-full bg-[#FFF5EE] text-sm text-gray-700 hover:bg-[#FFF0F0] hover:text-[#D4785F] border border-[#F0E0D6] hover:border-[#E8927C] transition-all">
              At-Home Care
            </Link>
          </div>
        </div>

        <p className="mt-10 text-sm text-gray-400">
          <Link href="/" className="text-[#E8927C] hover:text-[#D4785F]">
            Go to homepage
          </Link>{" "}
          &middot; If you believe this is an error, please{" "}
          <Link href="/contact" className="text-[#E8927C] hover:text-[#D4785F]">
            contact us
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
