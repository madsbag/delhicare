"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import { Star, MapPin, Phone, Globe, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Business } from "@/lib/types";
import "leaflet/dist/leaflet.css";

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  "Nursing Homes": "#2563EB",
  "Elder Care": "#7C3AED",
  "Post-Hospital Care": "#059669",
  "Home Health Care": "#DC2626",
};

const DELHI_NCR_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 11;

interface MapViewProps {
  businesses: Business[];
}

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
      className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border"
      disabled={locating}
    >
      <Navigation className={`h-4 w-4 ${locating ? "animate-pulse text-blue-600" : ""}`} />
      {locating ? "Locating..." : "My Location"}
    </button>
  );
}

function BusinessPopup({ business }: { business: Business }) {
  const listingUrl = `/${business.city_slug}/${business.category_slug}/${business.slug}`;
  const color = CATEGORY_COLORS[business.category] || "#6B7280";

  return (
    <div className="w-64 p-1">
      <Link href={listingUrl} className="block">
        <h3 className="font-semibold text-gray-900 hover:text-blue-600 text-sm leading-tight">
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
          {business.full_address || `${business.city}`}
        </span>
      </p>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t">
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium"
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
          className="ml-auto text-xs font-medium text-blue-600"
        >
          Details &rarr;
        </Link>
      </div>
    </div>
  );
}

export function MapView({ businesses }: MapViewProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(Object.keys(CATEGORY_COLORS))
  );

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
      businesses.filter(
        (b) => b.lat && b.lng && selectedCategories.has(b.category)
      ),
    [businesses, selectedCategories]
  );

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-white rounded-lg shadow-md p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Categories
        </p>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
          const count = businesses.filter(
            (b) => b.category === cat && b.lat && b.lng
          ).length;
          const isActive = selectedCategories.has(cat);

          return (
            <label
              key={cat}
              className={`flex items-center gap-2 cursor-pointer text-sm ${
                isActive ? "text-gray-900" : "text-gray-400 line-through"
              }`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => toggleCategory(cat)}
                className="sr-only"
              />
              <span
                className="w-3 h-3 rounded-full shrink-0 border-2"
                style={{
                  backgroundColor: isActive ? color : "transparent",
                  borderColor: color,
                }}
              />
              {cat}
              <span className="text-xs text-gray-400">({count})</span>
            </label>
          );
        })}
        <p className="text-[10px] text-gray-400 pt-1 border-t">
          {filtered.length} facilities shown
        </p>
      </div>

      <MapContainer
        center={DELHI_NCR_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationButton />

        {filtered.map((biz) => {
          const color = CATEGORY_COLORS[biz.category] || "#6B7280";
          return (
            <CircleMarker
              key={biz.slug}
              center={[biz.lat!, biz.lng!]}
              radius={8}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup maxWidth={280} minWidth={260}>
                <BusinessPopup business={biz} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
