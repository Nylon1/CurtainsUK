import type { ReactNode } from "react";
import Link from "next/link";
import { getGalleryProjectBySlug } from "@/lib/gallery-projects";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

function windowTypeHref(category?: string | null) {
  const value = (category || "").toLowerCase();
  if (value.includes("triangular")) return "/triangular-window-curtains";
  if (value.includes("gable")) return "/gable-end-curtains";
  if (value.includes("barn")) return "/barn-conversion-curtains";
  if (value.includes("large")) return "/large-window-curtains";
  if (value.includes("apex")) return "/apex-curtains";
  return "/window-types";
}

function liningHref(lining?: string | null) {
  return lining ? "/curtain-solutions" : null;
}

export default async function GalleryProjectLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const project = await getGalleryProjectBySlug(slug);

  if (!project) return children;

  const evidence = [
    project.category ? { label: "Window type", value: project.category } : null,
    project.room ? { label: "Room", value: project.room } : null,
    project.heading ? { label: "Curtain heading", value: project.heading } : null,
    project.lining ? { label: "Lining", value: project.lining } : null,
    project.location ? { label: "Location", value: project.location } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <>
      {children}

      {evidence.length > 0 && (
        <section className="border-t border-white/10 bg-apex-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
                Project evidence
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                What is recorded for this installation
              </h2>
              <p className="mt-5 text-base leading-8 text-white/70">
                These details come from the stored project record for this gallery case study. We use them to connect the finished installation to the relevant window, curtain and lining guidance without adding unsupported project claims.
              </p>
            </div>

            <dl className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {evidence.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-[#1B405B] p-5">
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">
                    {item.label}
                  </dt>
                  <dd className="mt-3 text-lg font-semibold text-[#F4F0E8]">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              <Link
                href={windowTypeHref(project.category)}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#d6b56b]/30"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Related window guidance</span>
                <span className="mt-3 block text-lg font-semibold text-white">Explore this window type</span>
              </Link>

              <Link
                href="/curtain-tracks"
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#d6b56b]/30"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Track planning</span>
                <span className="mt-3 block text-lg font-semibold text-white">How specialist tracks are specified</span>
              </Link>

              {liningHref(project.lining) ? (
                <Link
                  href="/curtain-solutions"
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#d6b56b]/30"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Lining & comfort</span>
                  <span className="mt-3 block text-lg font-semibold text-white">Compare blackout, thermal and privacy options</span>
                </Link>
              ) : (
                <Link
                  href="/services/premium-installation"
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#d6b56b]/30"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b56b]">Installation</span>
                  <span className="mt-3 block text-lg font-semibold text-white">See our installation methodology</span>
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
