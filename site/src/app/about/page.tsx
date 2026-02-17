import { Metadata } from "next";
import { Heart, Shield, Star, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About DelhiCare",
  description:
    "DelhiCare is Delhi NCR's trusted directory for finding nursing homes, elder care, post-hospital care, and home health care services.",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900">About DelhiCare</h1>

      <div className="mt-8 prose prose-gray max-w-none">
        <p className="text-lg text-gray-600 leading-relaxed">
          DelhiCare is Delhi NCR&apos;s most comprehensive directory for care
          facilities. We help families find the right nursing homes, elder care
          facilities, post-hospital care, and home health care services
          across Delhi, Gurgaon, Noida, Ghaziabad, Faridabad, and Greater
          Noida.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">
          Our Mission
        </h2>
        <p className="text-gray-600">
          Finding quality care for a loved one is one of the most important
          decisions a family can make. We believe everyone deserves access to
          transparent, reliable information to make that decision with
          confidence. DelhiCare exists to bridge the information gap in the
          care facility sector.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-8">
          What We Offer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 not-prose">
          <div className="p-4 bg-blue-50 rounded-lg">
            <Shield className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold">Verified Listings</h3>
            <p className="text-sm text-gray-600 mt-1">
              Every facility is sourced from Google Maps with real reviews,
              ratings, and verified contact details.
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <Star className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold">Trusted Ratings</h3>
            <p className="text-sm text-gray-600 mt-1">
              Ratings derived from real patient experiences help you compare
              facilities objectively.
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <Users className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold">Detailed Profiles</h3>
            <p className="text-sm text-gray-600 mt-1">
              Services, doctors, facilities, working hours, and direct
              contact information for each facility.
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <Heart className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold">Free to Use</h3>
            <p className="text-sm text-gray-600 mt-1">
              Contact facilities directly with no middlemen and no commission.
              Our service is completely free.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
