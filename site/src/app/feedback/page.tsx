import { Metadata } from "next";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Share Feedback",
  description:
    "Share your feedback about Karo Care — report incorrect listings, suggest facilities, or help us improve.",
  alternates: {
    canonical: "/feedback",
  },
};

const FEEDBACK_CATEGORIES = [
  {
    label: "General Feedback",
    subject: "General Feedback",
    description: "Share your thoughts on how we can improve Karo Care.",
  },
  {
    label: "Report Incorrect Listing",
    subject: "Report Incorrect Listing",
    description:
      "Let us know if a listing has wrong information — address, phone, services, or ratings.",
  },
  {
    label: "Suggest a Facility",
    subject: "Suggest a Facility",
    description:
      "Know a great care facility that's missing from our directory? Tell us about it.",
  },
  {
    label: "Other",
    subject: "Feedback",
    description: "Anything else you'd like to share with us.",
  },
];

export default function FeedbackPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="h-7 w-7 text-[#E8927C]" />
        <h1 className="text-3xl font-bold text-gray-900">Share Your Feedback</h1>
      </div>
      <p className="text-gray-600 mt-2">
        Your feedback helps us improve Karo Care for everyone. Choose a
        category below to send us an email.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEEDBACK_CATEGORIES.map((cat) => {
          const mailtoUrl = `mailto:karocare.in@gmail.com?subject=${encodeURIComponent(
            `[Karo Care] ${cat.subject}`
          )}`;
          return (
            <a
              key={cat.label}
              href={mailtoUrl}
              className="block p-5 bg-[#FFF5EE] rounded-xl hover:bg-[#FFF0F0] transition-colors border border-[#F0E0D6]"
            >
              <h3 className="font-semibold text-gray-900">{cat.label}</h3>
              <p className="text-sm text-gray-600 mt-1">{cat.description}</p>
            </a>
          );
        })}
      </div>

      <div className="mt-10 p-5 bg-[#FFFAF5] rounded-xl border border-[#F0E0D6]">
        <p className="text-sm text-gray-500">
          You can also reach us directly at{" "}
          <a
            href="mailto:karocare.in@gmail.com"
            className="text-[#E8927C] hover:text-[#D4785F] font-medium"
          >
            karocare.in@gmail.com
          </a>
          . We read every message and aim to respond within 48 hours.
        </p>
      </div>
    </div>
  );
}
