"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from "react-leaflet";
import { Star, MapPin, Phone, Globe, Navigation, Search, Crown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Business } from "@/lib/types";
import "leaflet/dist/leaflet.css";

// ─── Category colours ────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Nursing Homes": "#2563EB",
  "Elder Care": "#7C3AED",
  "Post-Hospital Care": "#059669",
  "Home Health Care": "#DC2626",
};

// Facility type colours (match FilterBar)
const FACILITY_TYPE_COLORS: Record<string, string> = {
  Boarding: "bg-teal-50 text-teal-700 border-teal-200",
  "Home Visit": "bg-sky-50 text-sky-700 border-sky-200",
  "Day Care": "bg-violet-50 text-violet-700 border-violet-200",
  Consultation: "bg-amber-50 text-amber-700 border-amber-200",
  Mixed: "bg-slate-50 text-slate-600 border-slate-200",
};

const INDIA_CENTER: [number, number] = [22.5, 78.9];
const DEFAULT_ZOOM = 5;

// ─── SVG pin icon factory ────────────────────────────────────────────────────
function createPinIcon(color: string): L.DivIcon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

// Cache pin icons
const pinIconCache: Record<string, L.DivIcon> = {};
function getPinIcon(color: string): L.DivIcon {
  if (!pinIconCache[color]) {
    pinIconCache[color] = createPinIcon(color);
  }
  return pinIconCache[color];
}

interface MapViewProps {
  businesses: Business[];
  allSpecialities?: string[];
  allFacilityTypes?: string[];
}

// ─── Auto-locate on mount ────────────────────────────────────────────────────
function AutoLocate() {
  const map = useMap();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 12, {
          duration: 1.5,
        });
      },
      () => {
        // Permission denied or error — stay at default view
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [map]);

  return null;
}

// ─── Location button (manual) ────────────────────────────────────────────────
function LocationButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, {
          duration: 1.5,
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-6 right-3 z-[1000] bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border"
      disabled={locating}
    >
      <Navigation className={`h-4 w-4 ${locating ? "animate-pulse text-[#E8927C]" : ""}`} />
      {locating ? "Locating..." : "My Location"}
    </button>
  );
}

// ─── Address geocode bar ─────────────────────────────────────────────────────
function AddressBar() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", India")}&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        map.flyTo([parseFloat(lat), parseFloat(lon)], 13, { duration: 1.5 });
      }
    } catch {
      // silently fail
    }
    setSearching(false);
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-80 max-w-[calc(100vw-2rem)]">
      <div className="flex items-center bg-white rounded-lg shadow-md border overflow-hidden">
        <Search className="h-4 w-4 text-gray-400 ml-3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search location..."
          className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
        />
        {query && (
          <button onClick={() => setQuery("")} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-3 py-2.5 text-sm font-medium text-[#E8927C] hover:text-[#D4785F] border-l"
        >
          {searching ? "..." : "Go"}
        </button>
      </div>
    </div>
  );
}

// ─── Popup for a business marker ─────────────────────────────────────────────
function BusinessPopup({ business }: { business: Business }) {
  const listingUrl = `/${business.city_slug}/${business.category_slug}/${business.slug}`;
  const color = CATEGORY_COLORS[business.category] || "#6B7280";

  return (
    <div className="w-64 p-1">
      <Link href={listingUrl} className="block">
        <h3 className="font-semibold text-gray-900 hover:text-[#E8927C] text-sm leading-tight">
          {business.name}
        </h3>
      </Link>
      <div className="flex items-center gap-2 mt-1">
        <Badge
          className="text-[10px] px-1.5 py-0 text-white"
          style={{ backgroundColor: color }}
        >
          {business.category}
        </Badge>
        {business.is_premium && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
            <Crown className="h-2.5 w-2.5" />
            Premium
          </span>
        )}
        {business.rating && (
          <span className="flex items-center gap-0.5 text-xs">
            <Star className="h-3 w-3 text-yellow-500" fill="currentColor" />
            {business.rating.toFixed(1)}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
        <span className="line-clamp-2">
          {business.short_address || business.formatted_address || business.city}
        </span>
      </p>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t">
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="flex items-center gap-1 text-xs text-[#E8927C] font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" />
            Call
          </a>
        )}
        {business.website && (
          <a
            href={business.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-500"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="h-3 w-3" />
            Website
          </a>
        )}
        <Link
          href={listingUrl}
          className="ml-auto text-xs font-medium text-[#E8927C]"
        >
          Details &rarr;
        </Link>
      </div>
    </div>
  );
}

// ─── Main MapView ────────────────────────────────────────────────────────────
export function MapView({ businesses, allSpecialities = [], allFacilityTypes = [] }: MapViewProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(["Elder Care"])
  );
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>("all");
  const [selectedFacilityType, setSelectedFacilityType] = useState<string>("all");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  const filtered = useMemo(
    () =>
      businesses.filter((b) => {
        if (!b.lat || !b.lng) return false;
        if (!selectedCategories.has(b.category)) return false;
        if (selectedSpeciality !== "all" && !(b.specialities || []).includes(selectedSpeciality)) return false;
        if (selectedFacilityType !== "all" && b.facility_type !== selectedFacilityType) return false;
        if (premiumOnly && !b.is_premium) return false;
        return true;
      }),
    [businesses, selectedCategories, selectedSpeciality, selectedFacilityType, premiumOnly]
  );

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Filter panel — collapsible on the left side below zoom buttons */}
      <div className="absolute top-14 left-3 z-[1000] flex flex-col gap-2" style={{ maxHeight: "calc(100vh - 8rem)" }}>
        {/* Toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-white rounded-lg shadow-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border flex items-center gap-2 w-fit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/></svg>
          Filters
          <span className="text-xs text-gray-400">({filtered.length})</span>
        </button>

        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-3 space-y-3 w-64 overflow-y-auto" style={{ maxHeight: "calc(100vh - 12rem)" }}>
            {/* Categories */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Categories</p>
              <div className="space-y-1">
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                  const isActive = selectedCategories.has(cat);
                  return (
                    <label
                      key={cat}
                      className={`flex items-center gap-2 cursor-pointer text-xs ${
                        isActive ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleCategory(cat)}
                        className="sr-only"
                      />
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border-2"
                        style={{
                          backgroundColor: isActive ? color : "transparent",
                          borderColor: color,
                        }}
                      />
                      <span className={isActive ? "" : "line-through"}>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Facility Type */}
            {allFacilityTypes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Facility Type</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedFacilityType("all")}
                    className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                      selectedFacilityType === "all"
                        ? "bg-gray-100 border-gray-300 text-gray-700 font-medium"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    All
                  </button>
                  {allFacilityTypes.map((ft) => (
                    <button
                      key={ft}
                      onClick={() => setSelectedFacilityType(selectedFacilityType === ft ? "all" : ft)}
                      className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                        selectedFacilityType === ft
                          ? FACILITY_TYPE_COLORS[ft] || "bg-gray-100 text-gray-700 border-gray-300"
                          : "bg-white border-gray-200 text-gray-500"
                      }`}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Specialities */}
            {allSpecialities.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Speciality</p>
                <select
                  value={selectedSpeciality}
                  onChange={(e) => setSelectedSpeciality(e.target.value)}
                  className="w-full px-2 py-1 rounded-md border border-gray-200 text-xs bg-white text-gray-700"
                >
                  <option value="all">All Specialities</option>
                  {allSpecialities.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Premium */}
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={premiumOnly}
                onChange={() => setPremiumOnly(!premiumOnly)}
                className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
              />
              <Crown className="h-3 w-3 text-indigo-500" />
              <span className="text-gray-700">Premium only</span>
            </label>

            <p className="text-[10px] text-gray-400 pt-1 border-t">
              {filtered.length} facilities shown
            </p>
          </div>
        )}
      </div>

      <MapContainer
        center={INDIA_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom={true}
        zoomControl={false}
        preferCanvas={true}
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoLocate />
        <LocationButton />
        <AddressBar />

        {filtered.map((biz) => {
          const color = CATEGORY_COLORS[biz.category] || "#6B7280";
          return (
            <Marker
              key={biz.slug}
              position={[biz.lat!, biz.lng!]}
              icon={getPinIcon(color)}
            >
              <Popup maxWidth={280} minWidth={260}>
                <BusinessPopup business={biz} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
