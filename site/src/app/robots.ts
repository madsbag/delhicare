import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/map",
          "/feedback",
          // Block OG image endpoints from being indexed as pages
          "/opengraph-image",
          "/*/opengraph-image",
          "/*/*/opengraph-image",
          "/*/*/*/opengraph-image",
          // Block filtered directory views (query-param variants)
          "/directory?",
          // Block dead speciality routes
          "/*/speciality/",
        ],
      },
    ],
    sitemap: "https://karocare.in/sitemap.xml",
  };
}
