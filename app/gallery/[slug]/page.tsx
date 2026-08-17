import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Home,
  MapPin,
  Sparkles,
  Tag,
} from "lucide-react";
import { getGalleryProjectBySlug } from "@/lib/gallery-projects";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const SITE_URL = "https://www.apexcurtains.com";

function absoluteImageUrl(value?: string | null) {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function ContentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#efe7d7] bg-white p-6 shadow-[0_16px_45px_rgba(35,28,18,0.06)] md:p-8">
      <h2 className="text-2xl font-semibold tracking-tight text-[#1f1f1f]">
        {title}
      </h2>
      <div className="mt-4 text-[17px] leading-8 text-[#4e463c]">{children}</div>
    </section>
  );
}

function evidenceLinks(category?: string | null, lining?: string | null) {
  const links = [
    { href: "/curtain-tracks", label: "Specialist curtain tracks" },
    { href: "/curtain-solutions", label: "Curtain solutions" },
  ];

  const categoryText = (category || "").toLowerCase();
  if (categoryText.includes("apex")) {
    links.unshift({ href: "/apex-curtains", label: "Apex curtain guidance" });
  } else if (categoryText.includes("triang")) {
    links.unshift({
      href: "/triangular-window-curtains",
      label: "Triangular window guidance",
    });
  } else if (categoryText.includes("gable")) {
    links.unshift({ href: "/gable-end-curtains", label: "Gable-end guidance" });
  } else {
    links.unshift({ href: "/window-types", label: "Architectural window types" });
  }

  if ((lining || "").toLowerCase().includes("blackout")) {
    links.push({ href: "/curtain-solutions", label: "Blackout curtain options" });
  }

  return links;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGalleryProjectBySlug(slug);

  if (!data) {
    return {
      title: { absolute: "Gallery Project | Apex Curtains" },
      description: "View a curtain installation project by Apex Curtains.",
      robots: { index: false, follow: true },
    };
  }

  const canonicalUrl = `${SITE_URL}/gallery/${data.slug || slug}`;
  const title = `${data.title} | Apex Curtains Gallery`;
  const description =
    data.summary ||
    data.brief ||
    `View this ${data.category || "curtain"} project by Apex Curtains${
      data.location ? ` in ${data.location}` : ""
    }.`;
  const imageUrl = absoluteImageUrl(data.image_url);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Apex Curtains",
      type: "article",
      images: imageUrl ? [{ url: imageUrl, alt: data.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function GalleryPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getGalleryProjectBySlug(slug);

  if (!data) notFound();

  const canonicalUrl = `${SITE_URL}/gallery/${data.slug || slug}`;
  const imageUrl = absoluteImageUrl(data.image_url);
  const related = evidenceLinks(data.category, data.lining);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        headline: data.title,
        description:
          data.summary || data.brief || `Apex Curtains project page for ${data.title}.`,
        image: imageUrl ? [imageUrl] : [],
        datePublished: data.created_at || undefined,
        mainEntityOfPage: { "@id": `${canonicalUrl}#webpage` },
        author: { "@id": `${SITE_URL}/#organization` },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: data.title,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${canonicalUrl}#article` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Gallery",
            item: `${SITE_URL}/gallery`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: data.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  const evidence = [
    data.category && { label: "Window type", value: data.category },
    data.room && { label: "Room", value: data.room },
    data.heading && { label: "Curtain heading", value: data.heading },
    data.lining && { label: "Lining", value: data.lining },
    data.location && { label: "Location", value: data.location },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <main className="min-h-screen bg-[#f8f6f1] text-[#1f1f1f]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="relative overflow-hidden bg-apex-navy-950 px-6 pb-24 pt-32 text-white md:px-8 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/gallery"
            className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            ← Back to Gallery
          </Link>

          <div className="mt-8 max-w-4xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f0d38b]">
              <Sparkles className="h-4 w-4" />
              Project case study
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              {data.title}
            </h1>
            {data.summary && (
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/72">
                {data.summary}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-20 md:px-8">
        {data.image_url && (
          <section className="-mt-14 mb-12">
            <div className="overflow-hidden rounded-[32px] border border-[#e7d6a6] bg-white p-3 shadow-[0_30px_90px_rgba(35,28,18,0.15)]">
              <img
                src={data.image_url}
                alt={data.title}
                className="max-h-[620px] w-full rounded-[24px] object-contain bg-apex-navy-950"
              />
            </div>
          </section>
        )}

        {evidence.length > 0 && (
          <section className="mb-12 rounded-[30px] border border-[#e8dcc7] bg-[#fffaf0] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8b6d36]">
              Recorded project details
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              What this case study actually records
            </h2>
            <p className="mt-4 max-w-3xl leading-8 text-[#625746]">
              The details below come from the stored project record. We do not infer track type,
              installation height or other technical specifications unless they are recorded for
              this individual project.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {evidence.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-[#eadfca] bg-white p-5"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b7a54]">
                    {item.label}
                  </span>
                  <strong className="mt-2 block text-lg text-[#1f1f1f]">
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {data.brief && (
              <ContentSection title="The Client Brief">
                <p>{data.brief}</p>
              </ContentSection>
            )}
            {data.challenge && (
              <ContentSection title="The Challenge">
                <p>{data.challenge}</p>
              </ContentSection>
            )}
            {data.solution && (
              <ContentSection title="The Recorded Solution">
                <p>{data.solution}</p>
              </ContentSection>
            )}
            {data.result && (
              <ContentSection title="Recorded Result">
                <p>{data.result}</p>
              </ContentSection>
            )}

            {!data.brief && !data.challenge && !data.solution && !data.result && data.summary && (
              <ContentSection title="Project Overview">
                <p>{data.summary}</p>
              </ContentSection>
            )}

            <section className="rounded-[30px] bg-apex-navy-950 p-7 text-white md:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">
                Related specialist guidance
              </p>
              <h2 className="mt-3 text-3xl font-semibold">
                Explore the technical topics behind this project
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {related.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium transition hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[28px] border border-[#efe7d7] bg-white p-6 shadow-[0_16px_45px_rgba(35,28,18,0.06)]">
              <h2 className="text-xl font-semibold">Project details</h2>
              <div className="mt-5 space-y-4">
                {data.location && (
                  <div className="flex gap-3">
                    <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#b8954f]" />
                    <div><strong className="block">Location</strong>{data.location}</div>
                  </div>
                )}
                {data.category && (
                  <div className="flex gap-3">
                    <Camera className="mt-1 h-5 w-5 shrink-0 text-[#b8954f]" />
                    <div><strong className="block">Window type</strong>{data.category}</div>
                  </div>
                )}
                {data.room && (
                  <div className="flex gap-3">
                    <Home className="mt-1 h-5 w-5 shrink-0 text-[#b8954f]" />
                    <div><strong className="block">Room</strong>{data.room}</div>
                  </div>
                )}
                {data.heading && (
                  <div className="flex gap-3">
                    <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[#b8954f]" />
                    <div><strong className="block">Heading</strong>{data.heading}</div>
                  </div>
                )}
                {data.lining && (
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#b8954f]" />
                    <div><strong className="block">Lining</strong>{data.lining}</div>
                  </div>
                )}
              </div>
            </div>

            {data.tags && data.tags.length > 0 && (
              <div className="rounded-[28px] border border-[#efe7d7] bg-white p-6">
                <h2 className="text-xl font-semibold">Project tags</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f5efe2] px-3 py-1.5 text-sm text-[#5b5142]"
                    >
                      <Tag className="h-3.5 w-3.5 text-[#b8954f]" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[28px] bg-apex-navy-950 p-6 text-white">
              <h2 className="text-2xl font-semibold">Planning a similar project?</h2>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Start with your own window shape, room requirements and project details.
              </p>
              <Link
                href="/start-designing"
                className="mt-5 inline-flex items-center rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950"
              >
                Start your project
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
