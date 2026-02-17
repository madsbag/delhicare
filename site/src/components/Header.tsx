import Link from "next/link";
import { Heart } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Heart className="h-7 w-7 text-blue-600" fill="currentColor" />
          <span className="text-xl font-bold text-gray-900">
            Karo<span className="text-blue-600">Care</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/directory"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Directory
          </Link>
          <Link
            href="/categories/nursing-homes"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Nursing Homes
          </Link>
          <Link
            href="/categories/elder-care"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Elder Care
          </Link>
          <Link
            href="/categories/post-hospital-care"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Post-Hospital Care
          </Link>
          <Link
            href="/categories/home-health-care"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            Home Health Care
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/map"
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
            Map
          </Link>
          <Link
            href="/directory"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Find Care
          </Link>
        </div>
      </div>
    </header>
  );
}
