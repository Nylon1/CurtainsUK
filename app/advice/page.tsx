import AdvicePageClient from "@/components/advice/AdvicePageClient";
import { createClient } from "@/lib/supabase/server";
import type { AdvicePost } from "@/lib/advice-posts";

export const revalidate = 60;

type AdvicePostRow = {
  id: string | number;
  title?: string | null;
  slug?: string | null;
  category?: string | null;
  excerpt?: string | null;
  content?: string | null;
  image_url?: string | null;
  featured?: boolean | null;
  published?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  related_service?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
};

export default async function AdvicePage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("advice_posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
  }

  const posts: AdvicePost[] = ((data || []) as AdvicePostRow[]).map((item) => ({
    id: String(item.id),
    title: item.title || "",
    slug: item.slug || "",
    category: item.category || "",
    excerpt: item.excerpt || "",
    content: item.content || "",
    image_url: item.image_url || "",
    featured: !!item.featured,
    published: item.published ?? true,
    meta_title: item.meta_title || "",
    meta_description: item.meta_description || "",
    focus_keyword: item.focus_keyword || "",
    related_service: item.related_service || "",
    published_at: item.published_at || "",
    updated_at: item.updated_at || "",
  }));

  return <AdvicePageClient posts={posts} />;
}
