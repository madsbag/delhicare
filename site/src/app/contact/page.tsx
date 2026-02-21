import { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Karo Care for questions, feedback, or to list your care facility.",
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
          <div className="flex items-center gap-3 p-4 bg-[#FFF5EE] rounded-lg">
            <Mail className="h-5 w-5 text-[#E8927C]" />
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <a
                href="mailto:karocare.in@gmail.com"
                className="text-sm text-[#E8927C] hover:text-[#D4785F]"
              >
                karocare.in@gmail.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[#FFF5EE] rounded-lg">
            <MapPin className="h-5 w-5 text-[#E8927C]" />
            <div>
              <p className="font-medium text-gray-900">Location</p>
              <p className="text-sm text-gray-500">India</p>
            </div>
          </div>
          <Link
            href="/feedback"
            className="flex items-center gap-3 p-4 bg-[#FFF5EE] rounded-lg hover:bg-[#FFF0F0] transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-[#E8927C]" />
            <div>
              <p className="font-medium text-gray-900">Share Feedback</p>
              <p className="text-sm text-gray-500">
                Report incorrect listings, suggest facilities, or share ideas
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-8 p-6 bg-[#FFF0F0] rounded-xl">
          <h2 className="font-semibold text-gray-900">
            Are you a care facility?
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            If you run a nursing home, senior care facility, post-hospital
            care centre, or home health care service anywhere in India, we can
            help you reach more patients and families. Contact us to update or
            claim your listing.
          </p>
        </div>
      </div>
    </div>
  );
}
