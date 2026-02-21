import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  CheckCircle,
  ExternalLink,
  Award,
  BedDouble,
  Crown,
  Building,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ListingCard } from "@/components/ListingCard";
import {
  getAllBusinesses,
  getBusinessBySlug,
  getRelatedBusinesses,
  getCategoryBySlug,
  getCityBySlug,
  getAllCities,
  getAllCategories,
  slugifySpeciality,
} from "@/lib/data";
import type { Business } from "@/lib/types";

// Render listing pages on-demand with ISR (cache for 1 day).
// Pre-building all 4,382 listings exceeds Vercel's 75 MB deployment limit.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ city: string; category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = getBusinessBySlug(slug);
  if (!business) return { title: "Not Found" };

  const title = `${business.name} - ${business.category} in ${business.city}`;
  const description =
    business.description?.slice(0, 155) ||
    `${business.name} is a ${business.category.toLowerCase()} facility in ${business.city}. Find ratings, services, and contact information.`;

  const ogImages =
    business.photos && business.photos.length > 0 && process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
      ? [
          {
            url: `https://places.googleapis.com/v1/${business.photos[0].name}/media?maxWidthPx=1200&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`,
            width: business.photos[0].widthPx,
            height: business.photos[0].heightPx,
            alt: business.name,
          },
        ]
      : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `/${business.city_slug}/${business.category_slug}/${business.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      ...(ogImages && { images: ogImages }),
    },
  };
}

function ListingJsonLd({ business }: { business: Business }) {
  // Parse working hours into schema.org openingHours format
  const dayMap: Record<string, string> = {
    Monday: "Mo", Tuesday: "Tu", Wednesday: "We", Thursday: "Th",
    Friday: "Fr", Saturday: "Sa", Sunday: "Su",
  };

  const openingHours: string[] = [];
  if (business.working_hours) {
    for (const entry of business.working_hours) {
      const parts = entry.split(": ");
      if (parts.length >= 2) {
        const dayAbbr = dayMap[parts[0]];
        const timeStr = parts.slice(1).join(": ");
        if (dayAbbr && timeStr && !timeStr.toLowerCase().includes("closed")) {
          // Try to extract time range like "9:00 AM – 6:00 PM"
          const timeMatch = timeStr.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
          if (timeMatch) {
            openingHours.push(`${dayAbbr} ${timeMatch[1]}-${timeMatch[2]}`);
          }
        }
      }
    }
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: business.name,
    description: business.description?.slice(0, 200),
    address: {
      "@type": "PostalAddress",
      streetAddress: business.formatted_address,
      addressLocality: business.city,
      addressCountry: "IN",
    },
    ...(business.phone && { telephone: business.phone }),
    ...(business.website && { url: business.website }),
    ...(business.lat &&
      business.lng && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: business.lat,
          longitude: business.lng,
        },
      }),
    ...(business.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: business.rating,
        bestRating: 5,
        ...(business.reviews && { reviewCount: business.reviews }),
      },
    }),
    ...(openingHours.length > 0 && { openingHours }),
    ...(business.specialities &&
      business.specialities.length > 0 && {
        medicalSpecialty: business.specialities,
      }),
    ...(business.google_maps_link && { hasMap: business.google_maps_link }),
    ...(business.bed_count && { numberOfBeds: business.bed_count }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function FAQJsonLd({ business }: { business: Business }) {
  const faqs: { question: string; answer: string }[] = [];

  // Working hours FAQ
  if (business.working_hours && business.working_hours.length > 0) {
    faqs.push({
      question: `What are the working hours of ${business.name}?`,
      answer: business.working_hours.join(". "),
    });
  }

  // Specialities FAQ
  if (business.specialities && business.specialities.length > 0) {
    faqs.push({
      question: `What specialities does ${business.name} offer?`,
      answer: `${business.name} offers the following specialities: ${business.specialities.join(", ")}.`,
    });
  }

  // Location FAQ
  if (business.formatted_address) {
    faqs.push({
      question: `Where is ${business.name} located?`,
      answer: `${business.name} is located at ${business.formatted_address}.${business.google_maps_link ? " You can view the location on Google Maps." : ""}`,
    });
  }

  // Contact FAQ
  if (business.phone) {
    faqs.push({
      question: `How can I contact ${business.name}?`,
      answer: `You can reach ${business.name} by phone at ${business.phone}.${business.website ? ` You can also visit their website for more information.` : ""}`,
    });
  }

  if (faqs.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function ListingPage({ params }: PageProps) {
  const { city, category, slug } = await params;
  const business = getBusinessBySlug(slug);

  if (!business || business.city_slug !== city || business.category_slug !== category) {
    notFound();
  }

  const related = getRelatedBusinesses(business, 4);
  const categoryData = getCategoryBySlug(category);

  const breadcrumbs = [
    { label: business.city, href: `/${city}` },
    {
      label: categoryData?.display_name || business.category,
      href: `/${city}/${category}`,
    },
    { label: business.name },
  ];

  const hasSpecialities = business.specialities && business.specialities.length > 0;
  // services dropped — kept in types.ts as empty array
  const hasFeatures = business.facility_features && business.facility_features.length > 0;
  const hasTrustSignals = business.trust_signals && business.trust_signals.length > 0;

  return (
    <>
      <ListingJsonLd business={business} />
      <FAQJsonLd business={business} />
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero Section */}
        <div className="mt-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {business.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge className="bg-[#FFF0F0] text-[#C4705C] hover:bg-[#FFF0F0] border-0">
                  {business.category}
                </Badge>
                {business.facility_type && business.facility_type !== "Unknown" && (
                  <Badge variant="outline" className="text-xs border-[#E8D5CB]">
                    <Building className="h-3 w-3 mr-1" />
                    {business.facility_type}
                  </Badge>
                )}
                {business.is_premium && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow-sm">
                    <Crown className="h-4 w-4" />
                    Premium Facility
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {business.city}
                </span>
              </div>
            </div>

            {/* Rating */}
            {business.rating && (
              <div className="flex items-center gap-2 bg-[#FFF5EE] rounded-xl px-4 py-3 border border-[#F0E0D6]">
                <Star className="h-6 w-6 text-amber-400" fill="currentColor" />
                <div>
                  <span className="text-2xl font-bold text-gray-900">
                    {business.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">/5</span>
                  {business.reviews > 0 && (
                    <p className="text-xs text-gray-400">{business.reviews} reviews</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact CTAs */}
          <div className="flex flex-wrap gap-3 mt-5">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#E8927C] text-white rounded-lg hover:bg-[#D4785F] transition font-medium"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 border border-[#E8D5CB] rounded-lg hover:bg-[#FFF5EE] transition font-medium text-gray-700"
              >
                <Globe className="h-4 w-4" />
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Photo Gallery */}
          {business.photos && business.photos.length > 0 && (
            <div className="mt-6">
              <PhotoGallery photos={business.photos} businessName={business.name} category={business.category} city={business.city} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {business.description && (
              <Card className="border-[#F0E0D6]">
                <CardHeader>
                  <CardTitle>About {business.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    {business.description
                      .split("\n")
                      .filter(Boolean)
                      .map((p, i) => (
                        <p key={i} className="text-gray-600 leading-relaxed">
                          {p}
                        </p>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Specialities */}
            {hasSpecialities && (
              <Card className="border-[#F0E0D6]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-[#E8927C]" />
                    Specialities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {business.specialities.map((s, i) => (
                      <Link
                        key={i}
                        href={`/${city}/speciality/${slugifySpeciality(s)}`}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#FFF0F0] text-[#C4705C] hover:bg-[#FFE8E8] hover:text-[#B85A46] border border-transparent hover:border-[#E8927C] transition-all"
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Click a speciality to find more {business.category.toLowerCase()} facilities offering it in {business.city}.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Facility Details */}
            {(hasFeatures || business.bed_count || (business.facility_type && business.facility_type !== "Unknown")) && (
              <Card className="border-[#F0E0D6]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-[#E8927C]" />
                    Facility Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 mb-4">
                    {business.facility_type && business.facility_type !== "Unknown" && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#FFF5EE] rounded-lg">
                        <Building className="h-4 w-4 text-[#E8927C]" />
                        <span className="text-sm font-medium text-gray-700">
                          {business.facility_type}
                        </span>
                      </div>
                    )}
                    {business.bed_count && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#FFF5EE] rounded-lg">
                        <BedDouble className="h-4 w-4 text-[#E8927C]" />
                        <span className="text-sm font-medium text-gray-700">
                          {business.bed_count} beds
                        </span>
                      </div>
                    )}
                  </div>
                  {hasFeatures && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {business.facility_features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trust Signals */}
            {hasTrustSignals && (
              <Card className="border-[#F0E0D6]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#E8927C]" />
                    Accreditations & Trust Signals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {business.trust_signals.map((signal, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Award className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-700">{signal}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            {/* Contact Card */}
            <Card className="border-[#F0E0D6]">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {business.formatted_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600">
                      {business.formatted_address}
                    </p>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                    <a
                      href={`tel:${business.phone}`}
                      className="text-sm text-[#E8927C] hover:underline"
                    >
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.phone_international && business.phone_international !== business.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                    <a
                      href={`tel:${business.phone_international}`}
                      className="text-sm text-[#E8927C] hover:underline"
                    >
                      {business.phone_international}
                    </a>
                  </div>
                )}
                {business.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-400 shrink-0" />
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#E8927C] hover:underline truncate"
                    >
                      Visit Website
                    </a>
                  </div>
                )}

                <Separator className="bg-[#F0E0D6]" />

                {/* Working Hours */}
                {business.working_hours && business.working_hours.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Working Hours
                    </h4>
                    <div className="space-y-1">
                      {business.working_hours.map((entry, idx) => {
                        const parts = entry.split(": ");
                        const day = parts[0] || "";
                        const hours = parts.slice(1).join(": ") || entry;
                        return (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-500">{day}</span>
                            <span className="text-gray-700">{day !== entry ? hours : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Google Maps Link */}
                {business.google_maps_link && (
                  <>
                    <Separator className="bg-[#F0E0D6]" />
                    <a
                      href={business.google_maps_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#E8927C] hover:underline"
                    >
                      <MapPin className="h-4 w-4" />
                      View on Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Google Maps Embed */}
            {business.lat && business.lng && (
              <Card className="border-[#F0E0D6]">
                <CardContent className="p-0 overflow-hidden rounded-lg">
                  <iframe
                    src={`https://maps.google.com/maps?q=${business.lat},${business.lng}&z=15&output=embed`}
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map showing ${business.name}`}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Related Listings */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Similar Facilities in {business.city}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((r) => (
                <ListingCard key={r.slug} business={r} />
              ))}
            </div>
          </div>
        )}

        {/* Internal cross-links for SEO */}
        <div className="mt-12 pt-8 border-t border-[#F0E0D6]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Explore More Care Facilities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                {categoryData?.display_name || business.category} in Other Cities
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(getAllCities())
                  .filter(([slug]) => slug !== city)
                  .slice(0, 8)
                  .map(([slug, c]) => (
                    <Link
                      key={slug}
                      href={`/${slug}/${category}`}
                      className="text-sm text-[#E8927C] hover:text-[#D4785F] hover:underline px-3 py-1.5 bg-[#FFF5EE] rounded-full"
                    >
                      {c.display_name}
                    </Link>
                  ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Other Care in {business.city}
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(getAllCategories())
                  .filter(([slug]) => slug !== category)
                  .map(([slug, cat]) => (
                    <Link
                      key={slug}
                      href={`/${city}/${slug}`}
                      className="text-sm text-[#E8927C] hover:text-[#D4785F] hover:underline px-3 py-1.5 bg-[#FFF5EE] rounded-full"
                    >
                      {cat.display_name}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/${city}`}
              className="text-sm font-medium text-[#E8927C] hover:underline"
            >
              All facilities in {business.city} &rarr;
            </Link>
            <Link
              href={`/categories/${category}`}
              className="text-sm font-medium text-[#E8927C] hover:underline"
            >
              All {categoryData?.display_name || business.category} &rarr;
            </Link>
            <Link
              href="/directory"
              className="text-sm font-medium text-[#E8927C] hover:underline"
            >
              Browse complete directory &rarr;
            </Link>
            <Link
              href="/map"
              className="text-sm font-medium text-[#E8927C] hover:underline"
            >
              View on map &rarr;
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
