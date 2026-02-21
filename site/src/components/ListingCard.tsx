import Link from "next/link";
import { Star, MapPin, Phone, Globe, Crown, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoThumbnail } from "@/components/PhotoGallery";
import type { Business } from "@/lib/types";

// Facility type tag colours (match FilterBar)
const FACILITY_TYPE_COLORS: Record<string, string> = {
  Boarding: "bg-teal-50 text-teal-700 border-teal-200",
  "Home Visit": "bg-sky-50 text-sky-700 border-sky-200",
  "Day Care": "bg-violet-50 text-violet-700 border-violet-200",
  Consultation: "bg-amber-50 text-amber-700 border-amber-200",
  Mixed: "bg-slate-50 text-slate-600 border-slate-200",
};

const FACILITY_TYPE_DEFAULT = "bg-gray-50 text-gray-600 border-gray-200";

interface ListingCardProps {
  business: Business;
}

export function ListingCard({ business }: ListingCardProps) {
  const listingUrl = `/${business.city_slug}/${business.category_slug}/${business.slug}`;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden border-[#F0E0D6]">
      {/* Photo Thumbnail or Placeholder */}
      <Link href={listingUrl} className="block">
        {business.photos && business.photos.length > 0 ? (
          <PhotoThumbnail photo={business.photos[0]} businessName={business.name} category={business.category} city={business.city} />
        ) : (
          <div className="w-full h-32 rounded-t-lg bg-gradient-to-br from-[#FFF5EE] to-[#F0E0D6] flex items-center justify-center">
            <Camera className="h-8 w-8 text-[#E8D5CB]" />
          </div>
        )}
      </Link>
      <CardContent className="p-5">
        {/* Row 1: Category badge + Premium badge (always aligned horizontally) */}
        <div className="flex items-center justify-between mb-2">
          <Badge className="bg-[#E8927C] text-white hover:bg-[#D4785F] text-xs border-0 font-semibold">
            {business.category}
          </Badge>
          {business.is_premium && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-sm">
              <Crown className="h-3.5 w-3.5" />
              Premium
            </span>
          )}
        </div>

        {/* Row 2: Name + Rating */}
        <div className="flex items-start justify-between gap-3">
          <Link href={listingUrl} className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-[#D4785F] transition-colors truncate text-lg">
              {business.name}
            </h3>
          </Link>
          {business.rating && (
            <div className="flex items-center gap-1 rounded-lg bg-[#FFF5EE] px-2.5 py-1.5 shrink-0">
              <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
              <span className="font-semibold text-sm text-gray-900">
                {business.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Row 3: Tags — specialities + facility type */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {/* Facility type tag */}
          {business.facility_type && business.facility_type !== "Unknown" && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] border font-medium ${FACILITY_TYPE_COLORS[business.facility_type] || FACILITY_TYPE_DEFAULT}`}
            >
              {business.facility_type}
            </span>
          )}
          {/* Speciality tags */}
          {business.specialities && business.specialities.slice(0, 3).map((tag, idx) => (
            <Badge key={idx} variant="outline" className="text-[11px] font-normal border-[#E8D5CB] text-gray-600 px-2 py-0.5">
              {tag}
            </Badge>
          ))}
          {business.specialities && business.specialities.length > 3 && (
            <Badge variant="outline" className="text-[11px] font-normal text-gray-400 border-[#E8D5CB] px-2 py-0.5">
              +{business.specialities.length - 3}
            </Badge>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {business.short_address || business.formatted_address || business.city}
          </span>
        </div>

        {/* Contact quick actions */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#F0E0D6]">
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="flex items-center gap-1.5 text-sm text-[#E8927C] hover:text-[#D4785F] font-medium"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
          {business.website && (
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#D4785F]"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
          )}
          <Link
            href={listingUrl}
            className="ml-auto text-sm font-medium text-[#E8927C] hover:text-[#D4785F]"
          >
            View Details &rarr;
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
