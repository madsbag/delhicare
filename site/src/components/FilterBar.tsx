"use client";

import { useState, useMemo } from "react";
import { ListingCard } from "@/components/ListingCard";
import type { Business } from "@/lib/types";

interface FilterBarProps {
  businesses: Business[];
  initialCategory?: string;
  initialCity?: string;
  allCategories: string[];
  allCities: string[];
}

type SortOption = "rating" | "name";

export function FilterableDirectory({
  businesses,
  initialCategory,
  initialCity,
  allCategories,
  allCities,
}: FilterBarProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    initialCategory ? new Set([initialCategory]) : new Set(allCategories)
  );
  const [selectedCity, setSelectedCity] = useState<string>(
    initialCity || "all"
  );
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = businesses.filter((b) => {
      if (!selectedCategories.has(b.category)) return false;
      if (selectedCity !== "all" && b.city_slug !== selectedCity) return false;
      if (verifiedOnly && !b.verified) return false;
      if (hasWebsiteOnly && !b.website) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [businesses, selectedCategories, selectedCity, sortBy, verifiedOnly, hasWebsiteOnly]);

  return (
    <div>
      {/* Filter Bar */}
      <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm sticky top-18 z-40">
        <div className="flex flex-wrap items-center gap-4">
          {/* Category checkboxes */}
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => (
              <label
                key={cat}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors ${
                  selectedCategories.has(cat)
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.has(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="sr-only"
                />
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedCategories.has(cat) ? "bg-blue-500" : "bg-gray-300"
                  }`}
                />
                {cat}
              </label>
            ))}
          </div>

          {/* City dropdown */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-sm bg-white text-gray-700"
          >
            <option value="all">All Cities</option>
            {allCities.map((city) => (
              <option key={city} value={city}>
                {city.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 rounded-lg border text-sm bg-white text-gray-700"
          >
            <option value="rating">Sort: Rating</option>
            <option value="name">Sort: Name A-Z</option>
          </select>

          {/* Toggles */}
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded"
            />
            Verified only
          </label>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hasWebsiteOnly}
              onChange={(e) => setHasWebsiteOnly(e.target.checked)}
              className="rounded"
            />
            Has website
          </label>
        </div>

        <div className="mt-2 text-sm text-gray-400">
          Showing {filtered.length} of {businesses.length} facilities
        </div>
      </div>

      {/* Results grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((business) => (
            <ListingCard key={business.slug} business={business} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            No facilities match your filters.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
