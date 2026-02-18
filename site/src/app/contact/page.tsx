import { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Karo Care for questions, feedback, or to list your care facility.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>

      <div className="mt-8 space-y-6">
        <p className="text-gray-600">
          Have questions, feedback, or want to list your care facility on
          Karo Care? We&apos;d love to hear from you.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-500">karocare.in@gmail.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Location</p>
              <p className="text-sm text-gray-500">Delhi NCR, India</p>
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-50 rounded-xl">
          <h2 className="font-semibold text-gray-900">
            Are you a care facility?
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            If you run a nursing home, elder care facility, post-hospital
            care center, or home health care service in Delhi NCR, we can help you
            reach more patients and families. Contact us to update or claim
            your listing.
          </p>
        </div>
      </div>
    </div>
  );
}
