"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Crown, Star } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import type { Business } from "@/lib/types";

interface FilterBarProps {
  businesses: Business[];
  initialCategory?: string;
  initialCity?: string;
  initialSpeciality?: string;
  allCategories: string[];
  allCities: string[];
  allSpecialities?: string[];
  allFacilityTypes?: string[];
}

// Facility type colours — muted teal/slate tones
const FACILITY_TYPE_COLORS: Record<string, string> = {
  Boarding: "bg-teal-50 text-teal-700 border-teal-200",
  "Home Visit": "bg-sky-50 text-sky-700 border-sky-200",
  "Day Care": "bg-violet-50 text-violet-700 border-violet-200",
  Consultation: "bg-amber-50 text-amber-700 border-amber-200",
  Mixed: "bg-slate-50 text-slate-600 border-slate-200",
};

const FACILITY_TYPE_DEFAULT = "bg-gray-50 text-gray-600 border-gray-200";

type SortOption = "rating" | "name";

export function FilterableDirectory({
  businesses,
  initialCategory,
  initialCity,
  initialSpeciality,
  allCategories,
  allCities,
  allSpecialities = [],
  allFacilityTypes = [],
}: FilterBarProps) {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    initialCategory ? new Set([initialCategory]) : new Set(allCategories)
  );
  const [selectedCity, setSelectedCity] = useState<string>(
    initialCity || "all"
  );
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>(
    initialSpeciality || "all"
  );
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [minRating, setMinRating] = useState(false); // 3.5+ filter

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
      if (selectedSpeciality !== "all" && !(b.specialities || []).includes(selectedSpeciality)) return false;
      if (selectedFacilityType !== "all" && b.facility_type !== selectedFacilityType) return false;
      if (premiumOnly && !b.is_premium) return false;
      if (minRating && (!b.rating || b.rating < 3.5)) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [businesses, selectedCategories, selectedCity, selectedSpeciality, selectedFacilityType, sortBy, premiumOnly, minRating]);

  const activeFilterCount =
    (selectedCategories.size < allCategories.length ? 1 : 0) +
    (selectedCity !== "all" ? 1 : 0) +
    (selectedSpeciality !== "all" ? 1 : 0) +
    (selectedFacilityType !== "all" ? 1 : 0) +
    (premiumOnly ? 1 : 0) +
    (minRating ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategories(new Set(allCategories));
    setSelectedCity("all");
    setSelectedSpeciality("all");
    setSelectedFacilityType("all");
    setPremiumOnly(false);
    setMinRating(false);
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="bg-white border border-[#F0E0D6] rounded-xl p-4 mb-6 shadow-sm sticky top-18 z-40 space-y-3">

        {/* Row 1: Categories (prominent) + City dropdown + Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                selectedCategories.has(cat)
                  ? "bg-[#E8927C] border-[#E8927C] text-white"
                  : "bg-white border-gray-200 text-gray-400 hover:border-[#E8D5CB] hover:text-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}

          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* City dropdown — navigates when on a city-specific page */}
          <select
            value={selectedCity}
            onChange={(e) => {
              const newCity = e.target.value;
              setSelectedCity(newCity);
              // Navigate to the city page if we're on a city-specific page
              if (initialCity) {
                if (newCity === "all") {
                  router.push("/directory");
                } else {
                  router.push(`/${newCity}`);
                }
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-[#E8D5CB] text-sm bg-white text-gray-700"
          >
            <option value="all">All Cities</option>
            {allCities.map((city) => (
              <option key={city} value={city}>
                {city.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 rounded-lg border border-[#E8D5CB] text-sm bg-white text-gray-700 ml-auto"
          >
            <option value="rating">Sort: Rating</option>
            <option value="name">Sort: Name A-Z</option>
          </select>
        </div>

        {/* Row 2: Specialities tags */}
        {allSpecialities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400 mr-1 uppercase tracking-wide">Specialities</span>
            {allSpecialities.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpeciality(selectedSpeciality === spec ? "all" : spec)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  selectedSpeciality === spec
                    ? "bg-[#FFF0F0] border-[#E8927C] text-[#C4705C] font-medium"
                    : "bg-white border-gray-200 text-gray-500 hover:border-[#E8D5CB]"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: Facility type tags + Premium + Rating */}
        <div className="flex flex-wrap items-center gap-1.5">
          {allFacilityTypes.length > 0 && (
            <>
              <span className="text-xs font-medium text-gray-400 mr-1 uppercase tracking-wide">Type</span>
              {allFacilityTypes.map((ft) => (
                <button
                  key={ft}
                  onClick={() => setSelectedFacilityType(selectedFacilityType === ft ? "all" : ft)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    selectedFacilityType === ft
                      ? FACILITY_TYPE_COLORS[ft] || FACILITY_TYPE_DEFAULT
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  } ${selectedFacilityType === ft ? "font-medium ring-1 ring-offset-1 ring-gray-300" : ""}`}
                >
                  {ft}
                </button>
              ))}
              <div className="h-4 w-px bg-gray-200 mx-1" />
            </>
          )}

          {/* Premium badge */}
          <button
            onClick={() => setPremiumOnly(!premiumOnly)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors ${
              premiumOnly
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                : "bg-white border-gray-200 text-gray-500 hover:border-indigo-200"
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
            Premium Facility
          </button>

          {/* Rating 3.5+ */}
          <button
            onClick={() => setMinRating(!minRating)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-colors ${
              minRating
                ? "bg-yellow-50 border-yellow-300 text-yellow-700 font-medium"
                : "bg-white border-gray-200 text-gray-500 hover:border-yellow-200"
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            Rating 3.5+
          </button>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1 rounded-full text-xs text-[#E8927C] hover:text-[#D4785F] font-medium ml-1"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400">
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
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-[#E8927C] hover:text-[#D4785F] font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
