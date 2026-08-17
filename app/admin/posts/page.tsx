"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "Gallery";

type AdvicePost = {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  featured: boolean;
  published: boolean;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  relatedService: string;
};

const emptyForm = {
  title: "",
  slug: "",
  category: "",
  excerpt: "",
  content: "",
  image: "",
  featured: false,
  published: true,
  metaTitle: "",
  metaDescription: "",
  focusKeyword: "",
  relatedService: "",
};

const categoryOptions = [
  "Apex Windows",
  "Gable End Windows",
  "Triangular Windows",
  "Barn Conversions",
  "Large Windows",
  "Measuring",
  "Tracks",
  "Fabrics",
  "Style",
  "Installation",
  "General",
  "Comparisons",
];

const relatedServiceOptions = [
  { label: "None", value: "" },
  { label: "Apex Curtains", value: "apex-curtains" },
  { label: "Gable End Curtains", value: "gable-end-curtains" },
  { label: "Triangular Window Curtains", value: "triangular-window-curtains" },
  { label: "Barn Conversion Curtains", value: "barn-conversion-curtains" },
  { label: "Large Window Curtains", value: "large-window-curtains" },
];

export default function AdminPostsPage() {
  const supabase = createClient();

  const [posts, setPosts] = useState<AdvicePost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const { data, error } = await supabase
        .from("advice_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: AdvicePost[] = (data || []).map((item: any) => ({
        id: Number(item.id),
        title: item.title || "",
        slug: item.slug || "",
        category: item.category || "",
        excerpt: item.excerpt || "",
        content: item.content || "",
        image: item.image_url || "",
        featured: !!item.featured,
        published: item.published ?? true,
        metaTitle: item.meta_title || "",
        metaDescription: item.meta_description || "",
        focusKeyword: item.focus_keyword || "",
        relatedService: item.related_service || "",
      }));

      setPosts(mapped);
    } catch (error) {
      console.error("LOAD POSTS ERROR:", error);
      alert("Could not load posts.");
    } finally {
      setLoaded(true);
    }
  }

  const nextId = useMemo(() => {
    if (!posts.length) return 1;
    return Math.max(...posts.map((p) => p.id)) + 1;
  }, [posts]);

  function updateField(name: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: prev.slug ? prev.slug : makeSlug(value),
      metaTitle: prev.metaTitle ? prev.metaTitle : value,
    }));
  }

  function handleEditPost(post: AdvicePost) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      category: post.category,
      excerpt: post.excerpt,
      content: post.content,
      image: post.image,
      featured: post.featured,
      published: post.published,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      focusKeyword: post.focusKeyword,
      relatedService: post.relatedService,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDeletePost(id: number) {
    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("advice_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== id));

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("DELETE POST ERROR:", error);
      alert("Could not delete post.");
    }
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      updateField("image", data.publicUrl);
    } catch (error) {
      console.error("UPLOAD IMAGE ERROR:", error);
      alert("Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title || !form.slug || !form.category || !form.excerpt || !form.content) {
      alert("Please fill title, slug, category, excerpt and content.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title,
        slug: makeSlug(form.slug),
        category: form.category,
        excerpt: form.excerpt,
        content: form.content,
        image_url: form.image,
        featured: form.featured,
        published: form.published,
        meta_title: form.metaTitle || form.title,
        meta_description: form.metaDescription || form.excerpt,
        focus_keyword: form.focusKeyword,
        related_service: form.relatedService,
        updated_at: new Date().toISOString(),
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from("advice_posts")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        alert("Post updated.");
      } else {
        const { error } = await supabase
          .from("advice_posts")
          .insert(payload);

        if (error) throw error;
        alert("Post added.");
      }

      await loadPosts();
      resetForm();
    } catch (error: any) {
      console.error("SAVE POST ERROR:", error);
      alert(error?.message || "Could not save post.");
    } finally {
      setSaving(false);
    }
  }

  function exportPosts() {
    try {
      const dataStr = JSON.stringify(posts, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `apex-advice-posts-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch {
      alert("Could not export posts.");
    }
  }

  function triggerImport() {
    importInputRef.current?.click();
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (!Array.isArray(parsed)) {
          alert("Invalid backup file.");
          return;
        }

        const normalized = parsed.map((item: any) => ({
          title: item.title || "",
          slug: makeSlug(item.slug || item.title || `post-${nextId}`),
          category: item.category || "",
          excerpt: item.excerpt || "",
          content: item.content || "",
          image_url: item.image || item.image_url || "",
          featured: !!item.featured,
          published: item.published ?? true,
          meta_title: item.metaTitle || item.meta_title || item.title || "",
          meta_description:
            item.metaDescription || item.meta_description || item.excerpt || "",
          focus_keyword: item.focusKeyword || item.focus_keyword || "",
          related_service: item.relatedService || item.related_service || "",
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from("advice_posts")
          .insert(normalized);

        if (error) throw error;

        await loadPosts();
        resetForm();
        alert("Posts imported.");
      } catch (error) {
        console.error("IMPORT POSTS ERROR:", error);
        alert("Import failed.");
      } finally {
        if (importInputRef.current) {
          importInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      alert("Could not read import file.");
    };

    reader.readAsText(file);
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-apex-navy-900 p-8 text-white">
        Loading admin...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-apex-navy-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Admin
          </div>
          <h1 className="mt-3 text-4xl font-semibold">Advice Posts</h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Add, edit and manage advice posts using Supabase.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportPosts}
              className="rounded-full border border-[#f5d38a]/25 bg-[#f5d38a]/10 px-5 py-3 text-sm text-[#f5d38a] transition hover:bg-[#f5d38a]/15"
            >
              Export Posts
            </button>

            <button
              type="button"
              onClick={triggerImport}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Import Posts
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>
<a
  href="/admin"
  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
>
  Admin Home
</a>

<a
  href="/admin/projects"
  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
>
  Manage Gallery
</a>
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {editingId !== null ? "Edit Post" : "Add New Post"}
              </h2>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Field
                label="Title"
                value={form.title}
                onChange={handleTitleChange}
              />

              <Field
                label="Slug"
                value={form.slug}
                onChange={(v) => updateField("slug", makeSlug(String(v)))}
              />

              <SelectField
                label="Category"
                value={form.category}
                onChange={(v) => updateField("category", v)}
                options={categoryOptions}
              />

              <Field
                label="Focus Keyword"
                value={form.focusKeyword}
                onChange={(v) => updateField("focusKeyword", v)}
                placeholder="e.g. how to measure apex windows"
              />

              <Field
                label="Meta Title"
                value={form.metaTitle}
                onChange={(v) => updateField("metaTitle", v)}
                placeholder="SEO title for Google"
              />

              <TextArea
                label="Meta Description"
                value={form.metaDescription}
                onChange={(v) => updateField("metaDescription", v)}
                rows={3}
              />

              <SelectField
                label="Related Service Page"
                value={form.relatedService}
                onChange={(v) => updateField("relatedService", v)}
                options={relatedServiceOptions.map((item) => item.label)}
                values={relatedServiceOptions.map((item) => item.value)}
              />

              <label className="block">
                <div className="mb-2 text-sm text-white/65">Upload Featured Image</div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#f5d38a] file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-[#e6c476]"
                />
                {uploading && (
                  <div className="mt-2 text-sm text-white/50">
                    Uploading image...
                  </div>
                )}
              </label>

              {form.image && (
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 text-sm text-white/50">Preview</div>
                  <img
                    src={form.image}
                    alt="Post preview"
                    className="h-48 w-full rounded-xl object-cover"
                  />
                </div>
              )}

              <TextArea
                label="Excerpt"
                value={form.excerpt}
                onChange={(v) => updateField("excerpt", v)}
                rows={3}
              />

              <TextArea
                label="Full Content"
                value={form.content}
                onChange={(v) => updateField("content", v)}
                rows={10}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => updateField("featured", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white/75">Featured post</span>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => updateField("published", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-white/75">Published</span>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476] disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Post"
                    : "Add Post"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold">Current Posts</h2>

            <div className="mt-6 space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-medium">{post.title}</div>
                      <div className="mt-2 text-sm text-white/60">
                        {post.category} • /advice/{post.slug}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.featured && (
                          <div className="inline-flex rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#f5d38a]">
                            Featured
                          </div>
                        )}

                        <div
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${
                            post.published
                              ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                              : "border border-white/10 bg-white/5 text-white/55"
                          }`}
                        >
                          {post.published ? "Published" : "Draft"}
                        </div>
                      </div>

                      {post.image && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                          <img
                            src={post.image}
                            alt={post.title}
                            className="h-32 w-40 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditPost(post)}
                        className="rounded-full border border-[#f5d38a]/25 bg-[#f5d38a]/10 px-4 py-2 text-sm text-[#f5d38a] transition hover:bg-[#f5d38a]/15"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-400/15"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!posts.length && (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/50">
                  No posts yet. Add your first one on the left.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/65">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[#f5d38a]/35"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/65">{label}</div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[#f5d38a]/35"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  values,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  values?: string[];
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/65">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[#f5d38a]/35"
      >
        <option value="">Select option</option>
        {options.map((option, index) => (
          <option key={option} value={values ? values[index] : option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}