import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://karocare.in"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Karo Care - Find Best Supportive Health Care Facilities in India",
    template: "%s | Karo Care",
  },
  description:
    "Discover the best supportive health care facilities in India — Senior Care, Post Hospital Care, Nursing Homes, At-Home Care. Compare specialities, ratings, and services across 17 cities.",
  keywords: [
    "senior care india",
    "elder care facilities",
    "post hospital care",
    "nursing homes india",
    "home health care",
    "at-home care services",
    "dementia care",
    "stroke rehabilitation",
    "palliative care",
    "post operative care",
    "geriatric care",
    "assisted living india",
    "old age home delhi",
    "nursing home mumbai",
    "elder care bangalore",
    "home care hyderabad",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Karo Care",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://places.googleapis.com" />
        <link rel="dns-prefetch" href="https://places.googleapis.com" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
