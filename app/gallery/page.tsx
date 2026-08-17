"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MapPin, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: number;
  title: string;
  location: string;
  category: string;
  room: string;
  heading: string;
  lining: string;
  image: string;
  summary: string;
  brief: string;
  challenge: string;
  solution: string;
  result: string;
  tags: string[];
};

export default function GalleryPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from("gallery_projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped: Project[] = (data || []).map((item: any) => ({
          id: Number(item.id),
          title: item.title || "",
          location: item.location || "",
          category: item.category || "",
          room: item.room || "",
          heading: item.heading || "",
          lining: item.lining || "",
          image: item.image_url || "",
          summary: item.summary || "",
          brief: item.brief || "",
          challenge: item.challenge || "",
          solution: item.solution || "",
          result: item.result || "",
          tags: Array.isArray(item.tags) ? item.tags : [],
        }));

        setProjects(mapped);
      } catch (error) {
        console.error("Error loading gallery projects:", error);
      }
    }

    fetchProjects();
  }, [supabase]);

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Gallery
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Architectural curtain projects
            <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
              {" "}
              presented like case studies
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            Explore apex, triangular, barn conversion and large-window curtain
            installations across the UK. Each project is presented as a visual
            story, not a basic gallery tile.
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {projects.map((project, index) => (
            <ProjectShowcase
              key={project.id}
              project={project}
              featured={index === 0}
              onOpen={() => setActiveProject(project)}
            />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {activeProject && (
          <ProjectModal
            project={activeProject}
            onClose={() => setActiveProject(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function ProjectShowcase({
  project,
  featured,
  onOpen,
}: {
  project: Project;
  featured?: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
      className="group relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:p-5 lg:p-6"
    >
      <div className="absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#f5d38a]/15 blur-[110px]" />
      </div>

      {/* Golden Gallery Image */}
      <div className="relative rounded-[34px] bg-gradient-to-br from-[#fff1b8] via-[#f5d38a] to-[#8a6425] p-[2px] shadow-[0_30px_100px_rgba(245,211,138,0.18)]">
        <div className="absolute -inset-3 -z-10 rounded-[42px] bg-[#f5d38a]/15 blur-2xl" />

        <div className="rounded-[32px] bg-apex-navy-950 p-3">
          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f5d38a33,transparent_42%),linear-gradient(135deg,#ffffff12,transparent_35%,#00000045)]" />

            <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5d38a] backdrop-blur-md">
              {featured ? "Featured Project" : "Golden Gallery"}
            </div>

            <motion.div
              whileHover={{ scale: 1.025 }}
              transition={{ duration: 0.55 }}
              className="relative flex h-[330px] items-center justify-center sm:h-[430px] lg:h-[540px]"
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-contain p-4 drop-shadow-[0_28px_48px_rgba(0,0,0,0.55)]"
                priority={featured}
                unoptimized
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Text Under Image */}
      <div className="relative mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 sm:p-7 lg:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Project Case Study
          </div>

          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {project.title}
          </h2>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
            {project.summary}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              project.location && `Location: ${project.location}`,
              project.category && `Window: ${project.category}`,
              project.room && `Room: ${project.room}`,
              project.heading && `Heading: ${project.heading}`,
              project.lining && `Lining: ${project.lining}`,
            ]
              .filter(Boolean)
              .map((item) => (
                <div
                  key={item as string}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75"
                >
                  {item}
                </div>
              ))}
          </div>

          {project.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] text-white/75"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/start-designing"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              Start designing
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              onClick={onOpen}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              View project
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Guided Mini Story */}
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 sm:p-7 lg:p-8">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
            Guided Story
          </div>

          <div className="mt-6 space-y-4">
            <MiniStoryRow
              number="01"
              title="The Brief"
              text={
                project.brief ||
                "A bespoke curtain solution was needed for a shaped feature window."
              }
            />

            <MiniStoryRow
              number="02"
              title="The Challenge"
              text={
                project.challenge ||
                "The window needed privacy, softness and light control without losing its architectural look."
              }
            />

            <MiniStoryRow
              number="03"
              title="The Solution"
              text={
                project.solution ||
                "We planned a made-to-measure curtain finish around the window shape and room requirements."
              }
            />

            <MiniStoryRow
              number="04"
              title="The Result"
              text={
                project.result ||
                "The finished room felt warmer, softer and more complete."
              }
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function MiniStoryRow({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-xs font-bold text-[#f5d38a]">
          {number}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
        </div>
      </div>
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const storySteps = [
    {
      label: "01",
      title: "The Window",
      text: project.category
        ? `A ${project.category.toLowerCase()} window needed a curtain solution that respected the shape, height and proportions of the space.`
        : "A shaped window needed a curtain solution that respected the height, angle and proportions of the space.",
    },
    {
      label: "02",
      title: "The Need",
      text:
        project.summary ||
        "The room needed a softer, more private and more comfortable finish.",
    },
    {
      label: "03",
      title: "The Solution",
      text:
        project.solution ||
        "We designed a bespoke curtain solution tailored to the proportions and angle of the window.",
    },
    {
      label: "04",
      title: "The Finish",
      text:
        project.result ||
        "The finished installation softened the room, improved comfort and turned the window into a feature.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] overflow-y-auto bg-black/90 backdrop-blur-2xl"
      onClick={onClose}
    >
      <div className="mx-auto flex min-h-screen max-w-6xl items-start justify-center px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ duration: 0.28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative my-4 w-full overflow-hidden rounded-[34px] border border-white/10 bg-apex-navy-900 shadow-[0_50px_160px_rgba(0,0,0,0.7)] lg:my-8"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur-md transition hover:bg-black/70 hover:text-white"
            aria-label="Close project"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Top title area */}
          <div className="relative overflow-hidden px-5 pb-8 pt-8 sm:px-8 lg:px-10">
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#f5d38a]/20 blur-[110px]" />
              <div className="absolute right-[-140px] top-20 h-[320px] w-[320px] rounded-full bg-white/8 blur-[100px]" />
            </div>

            <div className="relative max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/25 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
                <Sparkles className="h-4 w-4" />
                Golden Gallery Project
              </div>

              <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {project.title}
              </h2>

              {project.summary && (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                  {project.summary}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {project.location && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/75">
                    <MapPin className="h-4 w-4 text-[#f5d38a]" />
                    {project.location}
                  </span>
                )}

                {project.category && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/75">
                    {project.category}
                  </span>
                )}

                {project.room && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/75">
                    {project.room}
                  </span>
                )}

                {project.lining && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/75">
                    {project.lining}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Golden image showcase */}
          <div className="px-5 sm:px-8 lg:px-10">
            <div className="relative mx-auto max-w-4xl rounded-[36px] bg-gradient-to-br from-[#fff1b8] via-[#f5d38a] to-[#8a6425] p-[2px] shadow-[0_35px_120px_rgba(245,211,138,0.22)]">
              <div className="absolute -inset-4 -z-10 rounded-[44px] bg-[#f5d38a]/20 blur-2xl" />

              <div className="rounded-[34px] bg-apex-navy-900 p-3 sm:p-4">
                <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-30px_80px_rgba(0,0,0,0.55)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f5d38a33,transparent_42%),linear-gradient(135deg,#ffffff12,transparent_35%,#00000040)]" />

                  <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f5d38a] backdrop-blur-md">
                    Full Showcase
                  </div>

                  <div className="relative flex h-[300px] items-center justify-center sm:h-[390px] md:h-[470px] lg:h-[540px]">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-contain p-5 drop-shadow-[0_28px_48px_rgba(0,0,0,0.55)] transition duration-700 hover:scale-[1.025]"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-6 text-white/55">
              The image is framed to show the full curtain shape, window
              structure and finished installation without cropping the main
              feature.
            </p>
          </div>

          {/* Guided visual story */}
          <div className="px-5 py-10 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
                <Sparkles className="h-4 w-4" />
                Guided Visual Story
              </div>

              <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                From challenge to finished room.
              </h3>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base sm:leading-8">
                A premium curtain project is not just about the fabric. It is
                about understanding the window, the room, the practical need and
                the final feeling the client wants.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {storySteps.map((step) => (
                <div
                  key={step.label}
                  className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-[#f5d38a]/30 hover:bg-white/[0.06]"
                >
                  <div className="absolute right-[-50px] top-[-50px] h-28 w-28 rounded-full bg-[#f5d38a]/10 blur-2xl transition group-hover:bg-[#f5d38a]/20" />

                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-sm font-bold text-[#f5d38a]">
                        {step.label}
                      </span>

                      <ArrowRight className="h-4 w-4 text-white/25 transition group-hover:translate-x-1 group-hover:text-[#f5d38a]" />
                    </div>

                    <h4 className="text-lg font-semibold text-white">
                      {step.title}
                    </h4>

                    <p className="mt-3 text-sm leading-7 text-white/58">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Story blocks underneath */}
          <div className="border-t border-white/10 px-5 py-10 sm:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
              <div className="space-y-5">
                <StoryBlock
                  label="The Brief"
                  text={
                    project.brief ||
                    "The client wanted a bespoke curtain solution that felt luxurious, architectural and fully in keeping with the shape of the space."
                  }
                />

                <StoryBlock
                  label="The Challenge"
                  text={
                    project.challenge ||
                    "Unusual apex and angled windows are difficult to dress with ordinary off-the-shelf solutions, especially where privacy, light control and elegance all matter."
                  }
                />

                <StoryBlock
                  label="The Solution"
                  text={
                    project.solution ||
                    "We designed and installed a bespoke curtain system tailored to the proportions and angle of the window."
                  }
                />

                <StoryBlock
                  label="The Result"
                  text={
                    project.result ||
                    "The completed installation softened the room beautifully, improved comfort and privacy, and turned the window into a true focal point."
                  }
                />
              </div>

              <div className="space-y-5">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
                    Project Details
                  </div>

                  <div className="mt-6 grid gap-4">
                    <InfoCard label="Window type" value={project.category} />
                    <InfoCard label="Room" value={project.room} />
                    <InfoCard label="Heading" value={project.heading} />
                    <InfoCard label="Lining" value={project.lining} />
                  </div>
                </div>

                {project.tags.length > 0 && (
                  <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
                      Tags
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] text-white/80"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-[26px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-6 shadow-[0_20px_70px_rgba(245,211,138,0.10)]">
                  <div className="text-sm text-[#f5d38a]">
                    Inspired by this project?
                  </div>

                  <p className="mt-3 text-sm leading-7 text-white/72">
                    Start your own curtain design journey and upload a photo of
                    your window for tailored advice from Apex Curtains.
                  </p>

                  <div className="mt-6 flex flex-col gap-3">
                    <Link
                      href="/start-designing"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
                    >
                      Start designing
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <button
                      onClick={onClose}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/10 pb-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
        {value}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/25 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-3 text-lg font-medium text-white">
        {value || "Not specified"}
      </div>
    </div>
  );
}

function StoryBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-[#f5d38a]">
        {label}
      </div>
      <p className="mt-3 text-sm leading-8 text-white/72 sm:text-base">
        {text}
      </p>
    </div>
  );
}