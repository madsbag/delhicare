import Link from "next/link";
import { Heart } from "lucide-react";
import { getAllCities } from "@/lib/data";

export function Footer() {
  const cities = getAllCities();

  return (
    <footer className="border-t border-[#F0E0D6] bg-[#FFFAF5]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-[#E8927C]" fill="currentColor" />
              <span className="text-lg font-bold text-gray-900">
                Karo<span className="text-[#E8927C]">Care</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500">
              Your trusted directory for finding the best supportive health care
              facilities across India. Senior care, nursing homes, post-hospital
              care, and at-home care services.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/categories/elder-care"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Senior Care
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/post-hospital-care"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Post Hospital Care
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/nursing-homes"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Nursing Homes
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/home-health-care"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  At-Home Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Cities (dynamic — all cities for SEO) */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Cities</h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(cities)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([slug, city]) => (
                  <li key={slug}>
                    <Link
                      href={`/${slug}`}
                      className="text-sm text-gray-500 hover:text-[#D4785F]"
                    >
                      {city.display_name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/directory"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Browse All Facilities
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Map View
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Guides & Articles
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  About Karo Care
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-sm text-gray-500 hover:text-[#D4785F]"
                >
                  Share Feedback
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#F0E0D6] text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Karo Care. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
