"use client";

import dynamic from "next/dynamic";
import type { Business } from "@/lib/types";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-gray-500">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface MapPageClientProps {
  businesses: Business[];
}

export function MapPageClient({ businesses }: MapPageClientProps) {
  return <MapView businesses={businesses} />;
}
