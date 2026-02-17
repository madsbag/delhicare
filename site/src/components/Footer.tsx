import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-blue-600" fill="currentColor" />
              <span className="text-lg font-bold text-gray-900">
                Karo<span className="text-blue-600">Care</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500">
              Your trusted directory for finding the best care facilities in
              Delhi NCR. Nursing homes, elder care, rehabilitation centers, and
              home health care.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/categories/nursing-homes"
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Nursing Homes
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/elder-care"
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Elder Care
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/post-hospital-care"
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Post-Hospital Care
                </Link>
              </li>
              <li>
                <Link
                  href="/categories/home-health-care"
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Home Health Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Cities */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Cities</h3>
            <ul className="space-y-2">
              {["Delhi", "Gurgaon", "Noida", "Ghaziabad", "Faridabad", "Greater Noida"].map(
                (city) => (
                  <li key={city}>
                    <Link
                      href={`/${city.toLowerCase().replace(" ", "-")}`}
                      className="text-sm text-gray-500 hover:text-blue-600"
                    >
                      {city}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/directory"
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Browse All Facilities
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  About Karo Care
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Karo Care. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
