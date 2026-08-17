"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

type AdvicePost = {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  featured: boolean;

  // NEW SEO FIELDS
  meta_title?: string;
  meta_description?: string;
  related_service?: string;

  
};

export default function AdvicePostPageClient({
  post,
  relatedPosts,
}: {
  post: AdvicePost;
  relatedPosts: AdvicePost[];
}) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.apexcurtains.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Advice",
        item: "https://www.apexcurtains.com/advice",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://www.apexcurtains.com/advice/${post.slug}`,
      },
    ],
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    articleSection: post.category,
    image: post.image ? [`https://www.apexcurtains.com${post.image}`] : [],
    mainEntityOfPage: `https://www.apexcurtains.com/advice/${post.slug}`,
    author: {
      "@type": "Organization",
      name: "Apex Curtains",
    },
    publisher: {
      "@type": "Organization",
      name: "Apex Curtains",
      url: "https://www.apexcurtains.com",
    },
  };

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/advice"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-[#f5d38a]/40 hover:text-[#f5d38a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Advice
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-[#f5d38a]/40 hover:text-[#f5d38a]"
          >
            Back to Home
          </Link>
        </div>

        {post.image ? (
          <div className="mt-4 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
            <div className="relative h-[420px] sm:h-[520px] lg:h-[620px]">
              <img
                src={post.image}
                alt={post.title}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 lg:p-12">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a] backdrop-blur-sm">
                  <Sparkles className="h-4 w-4" />
                  {post.category}
                </div>

                <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-7xl">
                  {post.title}
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">
                  {post.excerpt}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
              <Sparkles className="h-4 w-4" />
              {post.category}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/65 sm:text-lg">
              {post.excerpt}
            </p>
          </>
        )}

        <article className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-8">
          <div className="whitespace-pre-line text-base leading-9 text-white/78">
            {post.content}
          </div>
        </article>

        <section className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-8">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Explore Solutions
          </div>
          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
            Explore curtain solutions by window type
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { href: "/apex-curtains", label: "Apex Curtains" },
              { href: "/gable-end-curtains", label: "Gable End Curtains" },
              { href: "/triangular-window-curtains", label: "Triangular Window Curtains" },
              { href: "/barn-conversion-curtains", label: "Barn Conversion Curtains" },
              { href: "/large-window-curtains", label: "Large Window Curtains" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm font-medium text-white/85 transition hover:border-[#f5d38a]/25 hover:text-[#f5d38a]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {relatedPosts.length > 0 && (
          <section className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
              Related Guides
            </div>
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
              Continue reading
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {relatedPosts.map((item) => (
                <Link
                  key={item.id}
                  href={`/advice/${item.slug}`}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-5 transition hover:border-[#f5d38a]/25"
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[#f5d38a]">
                    {item.category}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/68">
                    {item.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.25)] sm:p-8">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Need tailored advice?
          </div>

          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
            Have a similar window in your home?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/65">
            Start your curtain journey, upload a photo of your window and get advice tailored to your space.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/start-designing"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              Start Your Curtain Journey
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/window-types"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              View window types
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}