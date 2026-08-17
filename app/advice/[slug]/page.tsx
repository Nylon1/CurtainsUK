import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import AdvicePostPageClient from "@/components/advice/AdvicePostPageClient";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const SITE_URL = "https://www.apexcurtains.com";

const PERMANENT_ADVICE_REDIRECTS: Record<string, string> = {
  "best-curtains-for-apex-windows-expert-guide":
    "/advice/best-curtains-for-apex-windows-styles-that-actually-work",
};

function redirectLegacyAdviceSlug(slug: string) {
  const destination = PERMANENT_ADVICE_REDIRECTS[slug];
  if (destination) permanentRedirect(destination);
}

async function getPostBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advice_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !data) return null;

  return {
    id: Number(data.id),
    title: data.title || "",
    slug: data.slug || "",
    category: data.category || "",
    excerpt: data.excerpt || "",
    content: data.content || "",
    image: data.image_url || "",
    featured: !!data.featured,
    published: data.published ?? true,
    meta_title: data.meta_title || "",
    meta_description: data.meta_description || "",
    related_service: data.related_service || "",
  };
}

async function getRelatedPosts(currentSlug: string, category: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("advice_posts")
    .select("*")
    .neq("slug", currentSlug)
    .eq("category", category)
    .eq("published", true)
    .limit(3);

  return (data || []).map((item: any) => ({
    id: Number(item.id),
    title: item.title || "",
    slug: item.slug || "",
    category: item.category || "",
    excerpt: item.excerpt || "",
    content: item.content || "",
    image: item.image_url || "",
    featured: !!item.featured,
    published: item.published ?? true,
    meta_title: item.meta_title || "",
    meta_description: item.meta_description || "",
    related_service: item.related_service || "",
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (PERMANENT_ADVICE_REDIRECTS[slug]) {
    return {
      robots: { index: false, follow: true },
    };
  }

  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: { absolute: "Advice | Apex Curtains" },
      description: "Curtain advice for apex and unusual windows.",
      robots: { index: false, follow: true },
    };
  }

  const canonicalUrl = `${SITE_URL}/advice/${post.slug || slug}`;
  const title = post.meta_title || `${post.title} | Apex Curtains`;
  const description = post.meta_description || post.excerpt;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Apex Curtains",
      type: "article",
      images: post.image
        ? [
            {
              url: post.image,
              alt: post.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function AdvicePostPage({ params }: PageProps) {
  const { slug } = await params;
  redirectLegacyAdviceSlug(slug);

  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const relatedPosts = await getRelatedPosts(post.slug, post.category);

  return <AdvicePostPageClient post={post} relatedPosts={relatedPosts} />;
}
