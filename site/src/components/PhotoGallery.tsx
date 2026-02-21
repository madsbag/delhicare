"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Camera, X } from "lucide-react";
import type { PlacePhoto } from "@/lib/types";

const PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "";

function getPhotoUrl(photoName: string, maxWidthPx: number = 800): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${PLACES_API_KEY}`;
}

interface PhotoGalleryProps {
  photos: PlacePhoto[];
  businessName: string;
  category?: string;
  city?: string;
}

export function PhotoGallery({ photos, businessName, category, city }: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());

  if (!PLACES_API_KEY || !photos || photos.length === 0) return null;

  // Filter out failed photos
  const validPhotos = photos.filter((_, i) => !failedPhotos.has(i));
  if (validPhotos.length === 0) return null;

  const handleError = (originalIndex: number) => {
    setFailedPhotos((prev) => new Set(prev).add(originalIndex));
    // Reset current index if needed
    if (currentIndex >= validPhotos.length - 1) {
      setCurrentIndex(0);
    }
  };

  const currentPhoto = validPhotos[currentIndex];
  const attribution = currentPhoto?.authorAttributions?.[0];

  const goNext = () => setCurrentIndex((i) => (i + 1) % validPhotos.length);
  const goPrev = () =>
    setCurrentIndex((i) => (i - 1 + validPhotos.length) % validPhotos.length);

  return (
    <>
      {/* Gallery Card */}
      <div className="relative rounded-xl overflow-hidden bg-gray-100 group">
        {/* Main Image */}
        <div
          className="relative aspect-[16/9] cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          <Image
            src={getPhotoUrl(currentPhoto.name, 800)}
            alt={`${businessName}${category ? ` - ${category}` : ""} facility${city ? ` in ${city}` : ""} - Photo ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
            onError={() => {
              const originalIndex = photos.indexOf(currentPhoto);
              handleError(originalIndex);
            }}
            priority={currentIndex === 0}
          />

          {/* Photo count badge */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            <Camera className="h-3.5 w-3.5" />
            {currentIndex + 1} / {validPhotos.length}
          </div>

          {/* Attribution */}
          {attribution && (
            <div className="absolute bottom-3 left-3 text-white text-xs bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm">
              Photo by{" "}
              {attribution.uri ? (
                <a
                  href={attribution.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {attribution.displayName}
                </a>
              ) : (
                attribution.displayName
              )}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {validPhotos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Thumbnail strip */}
        {validPhotos.length > 1 && (
          <div className="flex gap-1 p-2 bg-white">
            {validPhotos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-14 flex-1 rounded overflow-hidden transition-all ${
                  idx === currentIndex
                    ? "ring-2 ring-blue-500 opacity-100"
                    : "opacity-60 hover:opacity-90"
                }`}
              >
                <Image
                  src={getPhotoUrl(photo.name, 200)}
                  alt={`${businessName} thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
            aria-label="Close lightbox"
          >
            <X className="h-8 w-8" />
          </button>

          <div
            className="relative max-w-5xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getPhotoUrl(currentPhoto.name, 1600)}
              alt={`${businessName}${category ? ` - ${category}` : ""} facility${city ? ` in ${city}` : ""} - Photo ${currentIndex + 1}`}
              width={currentPhoto.widthPx || 1600}
              height={currentPhoto.heightPx || 900}
              className="w-full h-auto max-h-[85vh] object-contain rounded"
              sizes="(max-width: 768px) 100vw, 1200px"
            />

            {/* Attribution in lightbox */}
            {attribution && (
              <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                Photo by{" "}
                {attribution.uri ? (
                  <a
                    href={attribution.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-200"
                  >
                    {attribution.displayName}
                  </a>
                ) : (
                  attribution.displayName
                )}
              </div>
            )}

            {/* Navigation in lightbox */}
            {validPhotos.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 transition"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 transition"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Small thumbnail for ListingCard */
export function PhotoThumbnail({
  photo,
  businessName,
  category,
  city,
}: {
  photo: PlacePhoto;
  businessName: string;
  category?: string;
  city?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!PLACES_API_KEY || !photo || failed) return null;

  return (
    <div className="relative w-full h-32 rounded-t-lg overflow-hidden bg-gray-100">
      <Image
        src={getPhotoUrl(photo.name, 400)}
        alt={`${businessName}${category ? ` - ${category}` : ""}${city ? ` in ${city}` : ""}`}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
