"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/gallery-projects";

const BUCKET_NAME = "Gallery";



function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildProjectSlug(title: string, location: string) {
  const base = slugify(title || "");
  const place = slugify(location || "");
  return place ? `${base}-${place}` : base;
}

const emptyForm = {
  title: "",
  slug: "",
  location: "",
  category: "",
  room: "",
  heading: "",
  lining: "",
  image: "",
  summary: "",
  brief: "",
  challenge: "",
  solution: "",
  result: "",
  tags: "",
};

export default function AdminProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from("gallery_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: Project[] = (data || []).map((item) => ({
        id: Number(item.id),
        title: item.title || "",
        slug: item.slug || "",
        location: item.location || "",
        category: item.category || "",
        room: item.room || "",
        heading: item.heading || "",
        lining: item.lining || "",
        image_url: item.image_url || "",
        summary: item.summary || "",
        brief: item.brief || "",
        challenge: item.challenge || "",
        solution: item.solution || "",
        result: item.result || "",
        tags: Array.isArray(item.tags) ? item.tags : [],
        created_at: item.created_at || "",
      }));

      setProjects(mapped);
    } catch (error) {
      console.error(error);
      alert("Could not load projects from Supabase.");
    } finally {
      setLoaded(true);
    }
  }

  const nextId = useMemo(() => {
    if (!projects.length) return 1;
    return Math.max(...projects.map((p) => p.id)) + 1;
  }, [projects]);

  function updateField(name: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "title" || name === "location") {
        const oldAutoSlug = buildProjectSlug(prev.title, prev.location);
        const currentSlugIsAuto = !prev.slug || prev.slug === oldAutoSlug;

        if (currentSlugIsAuto) {
          next.slug = buildProjectSlug(
            name === "title" ? value : prev.title,
            name === "location" ? value : prev.location
          );
        }
      }

      return next;
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleDeleteProject(id: number) {
    const ok = window.confirm("Delete this project?");
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("gallery_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== id));

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      alert("Could not delete project.");
    }
  }

  function handleEditProject(project: Project) {
    setEditingId(project.id);
    setForm({
      title: project.title,
      slug: project.slug || "",
      location: project.location || "",
      category: project.category || "",
      room: project.room || "",
      heading: project.heading || "",
      lining: project.lining || "",
      image: project.image_url || "",
      summary: project.summary || "",
      brief: project.brief || "",
      challenge: project.challenge || "",
      solution: project.solution || "",
      result: project.result || "",
      tags: (project.tags || []).join(", "),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function ensureUniqueSlug(baseSlug: string, currentId?: number | null) {
    if (!baseSlug) return "";

    let finalSlug = baseSlug;
    let counter = 2;

    while (true) {
      let query = supabase
        .from("gallery_projects")
        .select("id")
        .eq("slug", finalSlug)
        .limit(1);

      if (currentId !== null && currentId !== undefined) {
        query = query.neq("id", currentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title || !form.category || !form.image) {
      alert("Please add at least title, category and image.");
      return;
    }

    setSaving(true);

    try {
      const baseSlug =
        form.slug.trim() || buildProjectSlug(form.title, form.location);

      if (!baseSlug) {
        alert("Please add a title so the URL slug can be created.");
        return;
      }

      const finalSlug = await ensureUniqueSlug(baseSlug, editingId);

      const payload = {
        title: form.title,
        slug: finalSlug,
        location: form.location,
        category: form.category,
        room: form.room,
        heading: form.heading,
        lining: form.lining,
        image_url: form.image,
        summary: form.summary,
        brief: form.brief,
        challenge: form.challenge,
        solution: form.solution,
        result: form.result,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from("gallery_projects")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        alert("Project updated.");
      } else {
        const { error } = await supabase
          .from("gallery_projects")
          .insert(payload);

        if (error) throw error;
        alert("Project added.");
      }

      await loadProjects();
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Could not save project.");
    } finally {
      setSaving(false);
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
      const filePath = `projects/${fileName}`;

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
      console.error(error);
      alert("Image upload failed. Make sure the gallery bucket exists and is public.");
    } finally {
      setUploading(false);
    }
  }

  function exportProjects() {
    try {
      const dataStr = JSON.stringify(projects, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `apex-gallery-projects-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch {
      alert("Could not export projects.");
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

        const normalized = parsed.map((item) => {
          const title = item.title || "";
          const location = item.location || "";
          const slug =
            item.slug || buildProjectSlug(title, location);

          return {
            title,
            slug,
            location,
            category: item.category || "",
            room: item.room || "",
            heading: item.heading || "",
            lining: item.lining || "",
            image_url: item.image || item.image_url || "",
            summary: item.summary || "",
            brief: item.brief || "",
            challenge: item.challenge || "",
            solution: item.solution || "",
            result: item.result || "",
            tags: Array.isArray(item.tags) ? item.tags : [],
          };
        });

        const { error } = await supabase
          .from("gallery_projects")
          .insert(normalized);

        if (error) throw error;

        await loadProjects();
        resetForm();
        alert("Projects imported.");
      } catch (error) {
        console.error(error);
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
          <h1 className="mt-3 text-4xl font-semibold">Gallery Projects</h1>
          <p className="mt-3 max-w-2xl text-white/65">
            Add, edit and manage gallery projects using Supabase.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportProjects}
              className="rounded-full border border-[#f5d38a]/25 bg-[#f5d38a]/10 px-5 py-3 text-sm text-[#f5d38a] transition hover:bg-[#f5d38a]/15"
            >
              Export Projects
            </button>

            <button
              type="button"
              onClick={triggerImport}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Import Projects
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
  href="/admin/posts"
  className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
>
  Manage Posts
</a>
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {editingId !== null ? "Edit Project" : "Add New Project"}
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
                onChange={(v) => updateField("title", v)}
              />

              <Field
                label="Slug / URL"
                value={form.slug}
                onChange={(v) => updateField("slug", v)}
                placeholder="coventry-cottage-wave-pleat-curtains"
              />

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                Public URL:{" "}
                <span className="text-[#f5d38a]">
                  /gallery/{form.slug || "your-project-slug"}
                </span>
              </div>

              <Field
                label="Location"
                value={form.location}
                onChange={(v) => updateField("location", v)}
              />

              <Field
                label="Category"
                value={form.category}
                onChange={(v) => updateField("category", v)}
                placeholder="Apex / Gable End / Triangular"
              />

              <Field
                label="Room"
                value={form.room}
                onChange={(v) => updateField("room", v)}
              />

              <Field
                label="Heading"
                value={form.heading}
                onChange={(v) => updateField("heading", v)}
              />

              <Field
                label="Lining"
                value={form.lining}
                onChange={(v) => updateField("lining", v)}
              />

              <label className="block">
                <div className="mb-2 text-sm text-white/65">Upload Image</div>
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
                    alt="Project preview"
                    className="h-48 w-full rounded-xl object-cover"
                  />
                </div>
              )}

              <Field
                label="Tags"
                value={form.tags}
                onChange={(v) => updateField("tags", v)}
                placeholder="Apex, Bedroom, Blackout"
              />

              <TextArea
                label="Summary"
                value={form.summary}
                onChange={(v) => updateField("summary", v)}
              />

              <TextArea
                label="The Brief"
                value={form.brief}
                onChange={(v) => updateField("brief", v)}
              />

              <TextArea
                label="The Challenge"
                value={form.challenge}
                onChange={(v) => updateField("challenge", v)}
              />

              <TextArea
                label="The Solution"
                value={form.solution}
                onChange={(v) => updateField("solution", v)}
              />

              <TextArea
                label="The Result"
                value={form.result}
                onChange={(v) => updateField("result", v)}
              />

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476] disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Update Project"
                    : "Add Project"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold">Current Projects</h2>

            <div className="mt-6 space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-lg font-medium">{project.title}</div>
                      <div className="mt-2 text-sm text-white/60">
                        {project.location} • {project.category} • {project.room}
                      </div>

                      {!!project.slug && (
                        <div className="mt-2 text-xs text-[#f5d38a]">
                          /gallery/{project.slug}
                        </div>
                      )}

                      {project.image_url && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                          <img
                            src={project.image_url}
                            alt={project.title}
                            className="h-32 w-40 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditProject(project)}
                        className="rounded-full border border-[#f5d38a]/25 bg-[#f5d38a]/10 px-4 py-2 text-sm text-[#f5d38a] transition hover:bg-[#f5d38a]/15"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project.id)}
                        className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300 transition hover:bg-red-400/15"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!projects.length && (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/50">
                  No projects yet. Add your first one on the left.
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