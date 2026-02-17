import { MetadataRoute } from "next";
import {
  getAllBusinesses,
  getAllCitySlugs,
  getAllCategorySlugs,
  getAllCityCategoryCombos,
} from "@/lib/data";

const BASE_URL = "https://delhicare.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const businesses = getAllBusinesses();
  const citySlugs = getAllCitySlugs();
  const categorySlugs = getAllCategorySlugs();
  const cityCategoryCombos = getAllCityCategoryCombos();

  const routes: MetadataRoute.Sitemap = [];

  // Homepage
  routes.push({
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  });

  // Directory
  routes.push({
    url: `${BASE_URL}/directory`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.9,
  });

  // City pages
  for (const slug of citySlugs) {
    routes.push({
      url: `${BASE_URL}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Category pages
  for (const slug of categorySlugs) {
    routes.push({
      url: `${BASE_URL}/categories/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // City+Category pages
  for (const combo of cityCategoryCombos) {
    routes.push({
      url: `${BASE_URL}/${combo.city_slug}/${combo.category_slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Individual listing pages
  for (const biz of businesses) {
    routes.push({
      url: `${BASE_URL}/${biz.city_slug}/${biz.category_slug}/${biz.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  // Static pages
  routes.push(
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    }
  );

  return routes;
}
