import { createClient } from "@supabase/supabase-js";

export type AdvicePost = {
  id: string;
  title: string;
  slug: string;
  category?: string;
  excerpt?: string;
  content?: string;
  image_url?: string;
  featured?: boolean;
  published: boolean;
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  related_service?: string;
  created_at?: string;
  updated_at?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAdvicePosts(): Promise<AdvicePost[]> {
  const { data, error } = await supabase
    .from("advice_posts")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return [];
  }

  return data || [];
}
