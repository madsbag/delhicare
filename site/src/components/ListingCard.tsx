import Link from "next/link";
import { Star, MapPin, Phone, Globe, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Business } from "@/lib/types";

interface ListingCardProps {
  business: Business;
}

export function ListingCard({ business }: ListingCardProps) {
  const listingUrl = `/${business.city_slug}/${business.category_slug}/${business.slug}`;

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={listingUrl}>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate text-lg">
                {business.name}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {business.category}
              </Badge>
              {business.verified && (
                <span className="flex items-center gap-0.5 text-xs text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>
          </div>
          {business.rating && (
            <div className="flex items-center gap-1 rounded-lg bg-yellow-50 px-2.5 py-1.5 shrink-0">
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
              <span className="font-semibold text-sm text-gray-900">
                {business.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {business.full_address || `${business.city}, ${business.state}`}
          </span>
        </div>

        {/* Services preview */}
        {business.services && business.services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {business.services.slice(0, 3).map((service, idx) => (
              <Badge key={idx} variant="outline" className="text-xs font-normal">
                {service.name}
              </Badge>
            ))}
            {business.services.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal text-gray-400">
                +{business.services.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Contact quick actions */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t">
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
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
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
          )}
          <Link
            href={listingUrl}
            className="ml-auto text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View Details &rarr;
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
