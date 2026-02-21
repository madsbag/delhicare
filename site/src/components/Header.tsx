import Link from "next/link";
import { Heart, Map } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#F0E0D6] bg-[#FFFAF5]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FFFAF5]/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Heart className="h-7 w-7 text-[#E8927C]" fill="currentColor" />
          <span className="text-xl font-bold text-gray-900">
            Karo<span className="text-[#E8927C]">Care</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/directory"
            className="text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors"
          >
            All Categories
          </Link>
          <Link
            href="/categories/elder-care"
            className="text-sm font-medium text-gray-600 hover:text-[#D4785F] transition-colors"
          >
            Elder Care
          </Link>
          <Link
            href="/categories/post-hospital-care"
            className="text-sm font-medium text-gray-600 hover:text-[#D4785F] transition-colors"
          >
            Post Hospital Care
          </Link>
          <Link
            href="/categories/nursing-homes"
            className="text-sm font-medium text-gray-600 hover:text-[#D4785F] transition-colors"
          >
            Nursing Homes
          </Link>
          <Link
            href="/categories/home-health-care"
            className="text-sm font-medium text-gray-600 hover:text-[#D4785F] transition-colors"
          >
            Home Health Care
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-gray-600 hover:text-[#D4785F] transition-colors"
          >
            Guides
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/map"
            className="flex items-center gap-2 rounded-lg bg-[#E8927C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D4785F] transition-colors shadow-sm"
          >
            <Map className="h-5 w-5" />
            Explore Map
          </Link>
        </div>
      </div>
    </header>
  );
}
