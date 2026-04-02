import { MetadataRoute } from "next";
import {
  getAllBusinesses,
  getAllCitySlugs,
  getAllCategorySlugs,
  getAllCityCategoryCombos,
} from "@/lib/data";
import { getAllPosts } from "@/lib/blog";
import type { Business } from "@/lib/types";

const BASE_URL = "https://karocare.in";
const LAST_UPDATED = "2026-03-01";

// ── Quality scoring: higher = Google should crawl first ─────────────────────

function qualityScore(b: Business): number {
  let score = 0;
  if (b.is_premium) score += 30;
  if (b.rating && b.rating >= 4.0) score += 20;
  else if (b.rating && b.rating >= 3.5) score += 10;
  if (b.reviews >= 20) score += 15;
  else if (b.reviews >= 5) score += 5;
  if (b.website) score += 10;
  if (b.phone) score += 5;
  if (b.specialities && b.specialities.length >= 2) score += 5;
  return score;
}

function priorityFromScore(score: number): number {
  if (score >= 60) return 0.8;
  if (score >= 40) return 0.7;
  if (score >= 20) return 0.6;
  return 0.5;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];

  // ── Hub pages (high priority) ───────────────────────────────────────────

  // Homepage
  routes.push({
    url: BASE_URL,
    lastModified: new Date(LAST_UPDATED),
    changeFrequency: "weekly",
    priority: 1.0,
  });

  // Directory
  routes.push({
    url: `${BASE_URL}/directory`,
    lastModified: new Date(LAST_UPDATED),
    changeFrequency: "weekly",
    priority: 0.9,
  });

  // City pages
  for (const slug of getAllCitySlugs()) {
    routes.push({
      url: `${BASE_URL}/${slug}`,
      lastModified: new Date(LAST_UPDATED),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Category pages
  for (const slug of getAllCategorySlugs()) {
    routes.push({
      url: `${BASE_URL}/categories/${slug}`,
      lastModified: new Date(LAST_UPDATED),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // City+Category combo pages
  for (const combo of getAllCityCategoryCombos()) {
    routes.push({
      url: `${BASE_URL}/${combo.city_slug}/${combo.category_slug}`,
      lastModified: new Date(LAST_UPDATED),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Blog
  routes.push({
    url: `${BASE_URL}/blog`,
    lastModified: new Date(LAST_UPDATED),
    changeFrequency: "weekly",
    priority: 0.7,
  });
  for (const post of getAllPosts()) {
    routes.push({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  // Static (only index-worthy — /map and /feedback excluded via robots.txt)
  routes.push({
    url: `${BASE_URL}/about`,
    lastModified: new Date(LAST_UPDATED),
    changeFrequency: "monthly",
    priority: 0.3,
  });
  routes.push({
    url: `${BASE_URL}/contact`,
    lastModified: new Date(LAST_UPDATED),
    changeFrequency: "monthly",
    priority: 0.3,
  });

  // ── Facility pages (sorted by quality, best first) ────────────────────

  const businesses = getAllBusinesses()
    .map((b) => ({ biz: b, score: qualityScore(b) }))
    .sort((a, b) => b.score - a.score);

  for (const { biz, score } of businesses) {
    routes.push({
      url: `${BASE_URL}/${biz.city_slug}/${biz.category_slug}/${biz.slug}`,
      lastModified: new Date(LAST_UPDATED),
      changeFrequency: "monthly",
      priority: priorityFromScore(score),
    });
  }

  return routes;
}
