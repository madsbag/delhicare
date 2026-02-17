import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Star,
  MapPin,
  Phone,
  Globe,
  Mail,
  Clock,
  CheckCircle,
  ExternalLink,
  MessageCircle,
  Award,
  Users,
  BedDouble,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { ListingCard } from "@/components/ListingCard";
import {
  getAllBusinesses,
  getBusinessBySlug,
  getRelatedBusinesses,
  getCategoryBySlug,
  getCityBySlug,
} from "@/lib/data";
import type { Business } from "@/lib/types";

interface PageProps {
  params: Promise<{ city: string; category: string; slug: string }>;
}

export async function generateStaticParams() {
  const businesses = getAllBusinesses();
  return businesses.map((b) => ({
    city: b.city_slug,
    category: b.category_slug,
    slug: b.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = getBusinessBySlug(slug);
  if (!business) return { title: "Not Found" };

  const title = business.seo_title || `${business.name} - ${business.category} in ${business.city}`;
  const description =
    business.meta_description ||
    `${business.name} is a ${business.category.toLowerCase()} in ${business.city}. Find reviews, ratings, services, and contact information.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

function ListingJsonLd({ business }: { business: Business }) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: business.name,
    description: business.meta_description || business.long_description?.slice(0, 200),
    address: {
      "@type": "PostalAddress",
      streetAddress: business.full_address,
      addressLocality: business.city,
      addressRegion: business.state,
      addressCountry: "IN",
    },
    ...(business.phone && { telephone: business.phone }),
    ...(business.email && { email: business.email }),
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
      },
    }),
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
  const cityData = getCityBySlug(city);
  const categoryData = getCategoryBySlug(category);

  const breadcrumbs = [
    { label: business.city, href: `/${city}` },
    {
      label: categoryData?.display_name || business.category,
      href: `/${city}/${category}`,
    },
    { label: business.name },
  ];

  return (
    <>
      <ListingJsonLd business={business} />
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
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  {business.category}
                </Badge>
                {business.verified && (
                  <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Verified
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {business.city}, {business.state}
                </span>
              </div>
            </div>

            {/* Rating */}
            {business.rating && (
              <div className="flex items-center gap-2 bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-100">
                <Star
                  className="h-6 w-6 text-yellow-500"
                  fill="currentColor"
                />
                <div>
                  <span className="text-2xl font-bold text-gray-900">
                    {business.rating.toFixed(1)}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">/5</span>
                </div>
              </div>
            )}
          </div>

          {/* Contact CTAs */}
          <div className="flex flex-wrap gap-3 mt-5">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </a>
            )}
            {business.whatsapp && (
              <a
                href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            )}
            {business.email && (
              <a
                href={`mailto:${business.email}`}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
              >
                <Globe className="h-4 w-4" />
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {(business.long_description || business.about_description || business.business_summary) && (
              <Card>
                <CardHeader>
                  <CardTitle>About {business.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    {(business.long_description || business.about_description || business.business_summary)
                      .split("\n")
                      .filter(Boolean)
                      .map((p, i) => (
                        <p key={i} className="text-gray-600 leading-relaxed">
                          {p}
                        </p>
                      ))}
                  </div>
                  {business.mission_statement && (
                    <blockquote className="mt-4 pl-4 border-l-4 border-blue-200 italic text-gray-500">
                      {business.mission_statement}
                    </blockquote>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {business.services && business.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                    Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {business.services.map((service, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-gray-50 border"
                      >
                        <h4 className="font-medium text-gray-900">
                          {service.name}
                        </h4>
                        {service.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Doctors/Team */}
            {business.doctors && business.doctors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Medical Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {business.doctors.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-gray-50 border"
                      >
                        <h4 className="font-medium text-gray-900">
                          {doc.name}
                        </h4>
                        {doc.title && (
                          <p className="text-sm text-blue-600">{doc.title}</p>
                        )}
                        {doc.qualifications && (
                          <p className="text-xs text-gray-500 mt-1">
                            {doc.qualifications}
                          </p>
                        )}
                        {doc.specialization && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {doc.specialization}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Facilities */}
            {business.facilities && business.facilities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-blue-600" />
                    Facilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {business.facilities.map((fac, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-gray-900 text-sm">
                            {fac.name}
                          </span>
                          {fac.description && (
                            <p className="text-xs text-gray-500">
                              {fac.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {business.bed_count && (
                    <p className="mt-4 text-sm text-gray-600">
                      <BedDouble className="h-4 w-4 inline mr-1" />
                      {business.bed_count} beds
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Testimonials */}
            {business.testimonials && business.testimonials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>What People Say</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {business.testimonials.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-200"
                      >
                        <p className="text-gray-600 italic">
                          &ldquo;{t.text}&rdquo;
                        </p>
                        <p className="mt-2 text-sm font-medium text-gray-900">
                          &mdash; {t.author}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* FAQs */}
            {business.faqs && business.faqs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {business.faqs.map((faq, idx) => (
                      <AccordionItem key={idx} value={`faq-${idx}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {business.full_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600">
                      {business.full_address}
                    </p>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                    <a
                      href={`tel:${business.phone}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {business.phone}
                    </a>
                  </div>
                )}
                {business.phone2 && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                    <a
                      href={`tel:${business.phone2}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {business.phone2}
                    </a>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                    <a
                      href={`mailto:${business.email}`}
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {business.email}
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
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      Visit Website
                    </a>
                  </div>
                )}

                <Separator />

                {/* Working Hours */}
                {business.working_hours &&
                  Object.keys(business.working_hours).length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        Working Hours
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(business.working_hours).map(
                          ([day, hours]) => (
                            <div
                              key={day}
                              className="flex justify-between text-xs"
                            >
                              <span className="text-gray-500">{day}</span>
                              <span className="text-gray-700">{hours}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                <Separator />

                {/* Social Links */}
                <div className="flex flex-wrap gap-2">
                  {business.facebook && (
                    <a
                      href={business.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      Facebook
                    </a>
                  )}
                  {business.instagram && (
                    <a
                      href={business.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100"
                    >
                      Instagram
                    </a>
                  )}
                  {business.linkedin && (
                    <a
                      href={business.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100"
                    >
                      LinkedIn
                    </a>
                  )}
                  {business.twitter && (
                    <a
                      href={business.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100"
                    >
                      Twitter
                    </a>
                  )}
                </div>

                {/* Quick Info */}
                {((business.specializations?.length ?? 0) > 0 ||
                  (business.languages_spoken?.length ?? 0) > 0 ||
                  (business.accreditations?.length ?? 0) > 0) && (
                  <>
                    <Separator />
                    {business.specializations &&
                      business.specializations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm mb-2">
                            Specializations
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {business.specializations.map((s, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {business.accreditations &&
                      business.accreditations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            Accreditations
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {business.accreditations.map((a, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs"
                              >
                                {a}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Google Maps Embed */}
            {business.lat && business.lng && (
              <Card>
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
      </div>
    </>
  );
}
