import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500">
      <Link href="/" className="hover:text-blue-600 transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function BreadcrumbJsonLd({ items }: BreadcrumbsProps) {
  const itemListElement = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://karocare.in",
    },
    ...items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 2,
      name: item.label,
      ...(item.href ? { item: `https://karocare.in${item.href}` } : {}),
    })),
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement,
        }),
      }}
    />
  );
}
