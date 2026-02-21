import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { Breadcrumbs, BreadcrumbJsonLd } from "@/components/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { getAllPostSlugs, getPostBySlug, getAllPosts } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found" };

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  const breadcrumbs = [
    { label: "Guides", href: "/blog" },
    { label: post.title },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.date,
            author: {
              "@type": "Organization",
              name: "Karo Care",
              url: "https://karocare.in",
            },
            publisher: {
              "@type": "Organization",
              name: "Karo Care",
              url: "https://karocare.in",
              logo: {
                "@type": "ImageObject",
                url: "https://karocare.in/favicon.ico",
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://karocare.in/blog/${slug}`,
            },
          }),
        }}
      />

      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        <article className="mt-6 max-w-3xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-[#FFF0F0] text-[#C4705C] hover:bg-[#FFF0F0] border-0">
                {post.category}
              </Badge>
              {post.city && (
                <Badge variant="outline" className="text-xs border-[#E8D5CB]">
                  {post.city}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {post.title}
            </h1>

            <p className="mt-3 text-lg text-gray-600">{post.description}</p>

            <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.date).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readingTime}
              </span>
            </div>
          </header>

          {/* Article content */}
          <div
            className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-a:text-[#E8927C] prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-800"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Related links */}
          {post.relatedLinks.length > 0 && (
            <div className="mt-10 p-6 bg-[#FFF5EE] rounded-xl border border-[#F0E0D6]">
              <h3 className="font-semibold text-gray-900 mb-3">
                Related Resources
              </h3>
              <div className="flex flex-wrap gap-2">
                {post.relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-4 py-2 rounded-full text-sm bg-white border border-[#E8D5CB] text-gray-700 hover:bg-[#FFF0F0] hover:text-[#D4785F] hover:border-[#E8927C] transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Post navigation */}
          <nav className="mt-10 pt-8 border-t border-[#F0E0D6] flex justify-between gap-4">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#D4785F] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="text-left">
                  <p className="text-xs text-gray-400">Previous</p>
                  <p className="font-medium line-clamp-1">{prevPost.title}</p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {nextPost ? (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#D4785F] transition-colors text-right"
              >
                <div>
                  <p className="text-xs text-gray-400">Next</p>
                  <p className="font-medium line-clamp-1">{nextPost.title}</p>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div />
            )}
          </nav>

          {/* Back to guides */}
          <div className="mt-8 text-center">
            <Link
              href="/blog"
              className="text-sm font-medium text-[#E8927C] hover:text-[#D4785F]"
            >
              &larr; Back to all guides
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
