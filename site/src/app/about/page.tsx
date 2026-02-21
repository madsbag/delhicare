import { Metadata } from "next";
import { Heart, Search, Star, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "About Karo Care",
  description:
    "Karo Care is India's trusted directory for finding supportive health care facilities — senior care, post hospital care, nursing homes, and at-home care services across 17 cities.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900">About Karo Care</h1>

      <div className="mt-8 prose prose-gray max-w-none">
        <p className="text-lg text-gray-600 leading-relaxed">
          Karo Care is India&apos;s most comprehensive directory for supportive
          health care facilities. We help families find the right senior care,
          post hospital care, nursing homes, and at-home care services across
          17 major cities including Delhi, Mumbai, Bangalore, Hyderabad,
          Chennai, Kolkata, Pune, and more.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">
          Our Mission
        </h2>
        <p className="text-gray-600">
          Finding quality care for a loved one is one of the most important
          decisions a family can make. We believe everyone deserves access to
          transparent, reliable information to make that decision with
          confidence. Karo Care exists to bridge the information gap in the
          supportive care sector across India.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">
          What We Offer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 not-prose">
          <div className="p-4 bg-[#FFF5EE] rounded-lg">
            <Search className="h-6 w-6 text-[#E8927C] mb-2" />
            <h3 className="font-semibold">Search by City &amp; Speciality</h3>
            <p className="text-sm text-gray-600 mt-1">
              Find facilities across 17 cities filtered by specialities like
              dementia care, stroke rehabilitation, palliative care, and more.
            </p>
          </div>
          <div className="p-4 bg-[#FFF5EE] rounded-lg">
            <Star className="h-6 w-6 text-[#E8927C] mb-2" />
            <h3 className="font-semibold">Compare by Reputation</h3>
            <p className="text-sm text-gray-600 mt-1">
              Google ratings and real patient reviews help you compare
              facilities objectively and make informed decisions.
            </p>
          </div>
          <div className="p-4 bg-[#FFF5EE] rounded-lg">
            <MapPin className="h-6 w-6 text-[#E8927C] mb-2" />
            <h3 className="font-semibold">Detailed Profiles</h3>
            <p className="text-sm text-gray-600 mt-1">
              Specialities, services, facility features, working hours, and
              direct contact information for each facility.
            </p>
          </div>
          <div className="p-4 bg-[#FFF5EE] rounded-lg">
            <Heart className="h-6 w-6 text-[#E8927C] mb-2" />
            <h3 className="font-semibold">Free to Use</h3>
            <p className="text-sm text-gray-600 mt-1">
              Contact facilities directly with no middlemen and no commission.
              Our service is completely free for families.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
