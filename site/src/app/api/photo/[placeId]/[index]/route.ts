import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

// In-memory cache for photo names (survives within a single serverless instance)
const photoCache = new Map<
  string,
  { names: string[]; expiry: number }
>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in-memory

async function getPhotoNames(placeId: string): Promise<string[]> {
  const cached = photoCache.get(placeId);
  if (cached && Date.now() < cached.expiry) return cached.names;

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=photos&key=${API_KEY}`,
    { next: { revalidate: 86400 } } // Next.js fetch cache: 1 day
  );
  if (!res.ok) return [];

  const data = await res.json();
  const names: string[] = (data.photos || []).map(
    (p: { name: string }) => p.name
  );

  photoCache.set(placeId, { names, expiry: Date.now() + CACHE_TTL });
  return names;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ placeId: string; index: string }> }
) {
  const { placeId, index: indexStr } = await params;
  const index = parseInt(indexStr, 10);
  const w = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get("w") || "800", 10), 100),
    4800
  );

  if (!API_KEY || isNaN(index) || index < 0 || index > 9) {
    return new NextResponse(null, { status: 400 });
  }

  const names = await getPhotoNames(placeId);
  if (index >= names.length) {
    return new NextResponse(null, { status: 404 });
  }

  const photoUrl = `https://places.googleapis.com/v1/${names[index]}/media?maxWidthPx=${w}&key=${API_KEY}`;
  const photoRes = await fetch(photoUrl, { redirect: "follow" });

  if (!photoRes.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const contentType = photoRes.headers.get("content-type") || "image/jpeg";
  const body = await photoRes.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=86400",
      "CDN-Cache-Control": "public, max-age=2592000",
    },
  });
}
