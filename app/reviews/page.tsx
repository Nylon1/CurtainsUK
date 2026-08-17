import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, GalleryVertical, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "Customer Feedback | Apex Curtains" },
  description:
    "Customer feedback for Apex Curtains is published only when it can be tied to a verifiable customer or project record.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ReviewsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
            <ShieldCheck className="h-4 w-4" />
            Verified customer feedback
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Customer feedback backed by
            <span className="text-[#f5d38a]"> real project records</span>
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">
            We only publish customer reviews when the wording, customer details and project context
            can be tied back to a verifiable record. We are rebuilding this section around that
            standard rather than displaying generated or unverified review content.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            "Review wording is kept verbatim or customer-approved.",
            "Names, locations and ratings are only shown when supported by the source record.",
            "Where possible, feedback will connect to the relevant completed project or installation.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
            >
              <CheckCircle2 className="h-5 w-5 text-[#f5d38a]" />
              <p className="mt-4 text-sm leading-7 text-white/72">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-[32px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:p-9">
          <h2 className="text-2xl font-semibold sm:text-3xl">See the work while the verified review library is expanded</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-white/68 sm:text-base">
            Our project case studies show completed installations, window types, design choices and
            project context. They are the best place to see the kind of specialist work Apex Curtains
            carries out on apex, triangular, gable-end and unusually large windows.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/gallery"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              <GalleryVertical className="h-4 w-4" />
              View project case studies
            </Link>

            <Link
              href="/start-designing"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Start your project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
