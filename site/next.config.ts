import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/api/photo/**",
        search: "?w=*",
      },
    ],
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        // 301 redirect dead /[city]/speciality/[slug] URLs → city page
        source: "/:city/speciality/:slug",
        destination: "/:city",
        permanent: true,
      },
      {
        // Also catch the bare /[city]/speciality/ path
        source: "/:city/speciality",
        destination: "/:city",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
