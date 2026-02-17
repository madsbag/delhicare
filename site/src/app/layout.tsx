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
  title: {
    default: "DelhiCare - Find Best Care Facilities in Delhi NCR",
    template: "%s | DelhiCare",
  },
  description:
    "Find top-rated nursing homes, elder care, post-hospital care, and home health care in Delhi NCR. Compare ratings, services, and facilities.",
  keywords: [
    "nursing homes delhi",
    "elder care delhi ncr",
    "post hospital care delhi",
    "home health care noida",
    "old age home gurgaon",
    "post surgery care delhi",
    "rehabilitation center delhi",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "DelhiCare",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
