import type { ReactNode } from "react";
import Link from "next/link";
import AuthorityLinks from "@/components/seo/AuthorityLinks";
import { canonicalMetadata } from "@/lib/seo-metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = canonicalMetadata("/gallery");

async function getProjectLinks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_projects")
    .select("id,title,slug,location,category")
    .not("slug", "is", null)
    .neq("slug", "")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Gallery project link index error:", error);
    return [];
  }

  return data || [];
}

export default async function GalleryLayout({ children }: { children: ReactNode }) {
  const projects = await getProjectLinks();

  return (
    <>
      {children}
      {projects.length > 0 && (
        <section className="border-t border-white/10 bg-apex-navy-950 px-4 py-12 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5d38a]">
                Project case studies
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Browse real architectural curtain projects
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Explore individual installations with the window type, location and project details.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/gallery/${project.slug}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 transition hover:border-[#f5d38a]/30 hover:bg-white/[0.07]"
                >
                  <span className="block font-medium text-white">{project.title}</span>
                  {(project.location || project.category) && (
                    <span className="mt-1 block text-sm text-white/55">
                      {[project.category, project.location].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <AuthorityLinks
        eyebrow="From project to method"
        heading="See how the window shape connects to track planning and curtain performance"
      />
    </>
  );
}
