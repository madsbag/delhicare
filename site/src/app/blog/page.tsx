import { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Guides & Articles — Supportive Health Care in India",
  description:
    "Expert guides on choosing nursing homes, understanding dementia care, post-hospital recovery, elder care options, and more. Practical advice for Indian families.",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  const breadcrumbs = [{ label: "Guides" }];

  // Group by category
  const categories = [...new Set(posts.map((p) => p.category))];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 mb-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Guides & Articles
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Expert guidance to help you navigate care decisions for your loved
            ones. From choosing the right facility to understanding specialised
            care options.
          </p>
        </div>

        {/* Featured / latest post */}
        {posts.length > 0 && (
          <Link href={`/blog/${posts[0].slug}`} className="block mb-10">
            <Card className="group hover:shadow-lg transition-shadow border-2 border-[#F0E0D6] hover:border-[#E8927C]">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-[#FFF0F0] text-[#C4705C] hover:bg-[#FFF0F0] border-0">
                    {posts[0].category}
                  </Badge>
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(posts[0].date).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {posts[0].readingTime}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-[#D4785F] transition-colors">
                  {posts[0].title}
                </h2>
                <p className="mt-2 text-gray-600 max-w-3xl">
                  {posts[0].description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-[#E8927C] font-medium text-sm">
                  Read guide <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* All posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.slice(1).map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="group hover:shadow-md transition-shadow h-full border-[#F0E0D6] hover:border-[#E8927C]">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-[#FFF0F0] text-[#C4705C] hover:bg-[#FFF0F0] border-0 text-xs">
                      {post.category}
                    </Badge>
                    {post.city && (
                      <Badge
                        variant="outline"
                        className="text-xs border-[#E8D5CB]"
                      >
                        {post.city}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#D4785F] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-3 flex-1">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F0E0D6]">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.date).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readingTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* CTA section */}
        <div className="mt-16 text-center bg-[#FFF5EE] rounded-2xl p-10 border border-[#F0E0D6]">
          <BookOpen className="h-10 w-10 text-[#E8927C] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">
            Need help finding the right care?
          </h2>
          <p className="mt-2 text-gray-600 max-w-lg mx-auto">
            Browse our directory of {">"}4,000 verified care facilities across
            17 cities in India.
          </p>
          <Link
            href="/directory"
            className="mt-6 inline-flex items-center gap-2 bg-[#E8927C] text-white px-6 py-3 rounded-lg hover:bg-[#D4785F] transition font-medium"
          >
            Browse Facilities
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
