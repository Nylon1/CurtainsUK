import Link from "next/link";
import { ArrowRight, CheckCircle2, GalleryVertical } from "lucide-react";

const evidencePoints = [
  "Completed project case studies with window type and installation context",
  "A curated selection of real customer reviews rather than an overwhelming 100-review wall",
  "Customer feedback and project evidence kept as separate, easy-to-read proof points",
];

export default function ReviewsPreview() {
  return (
    <section className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,211,138,0.05),transparent_28%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <div className="text-xs uppercase tracking-[0.25em] text-white/40">
            Reviews & project evidence
          </div>

          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Real customer feedback, kept focused
          </h2>

          <p className="mt-4 max-w-2xl leading-8 text-white/65">
            We have a larger review archive, but the website now presents a selected set of customer
            reviews alongside completed project case studies so visitors can assess both feedback and
            the work itself without wading through an oversized review wall.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {evidencePoints.map((item) => (
            <div
              key={item}
              className="rounded-[28px] border border-white/10 bg-white/5 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            >
              <CheckCircle2 className="h-5 w-5 text-[#f5d38a]" />
              <p className="mt-4 text-sm leading-7 text-white/72">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
          >
            Read selected reviews
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/gallery"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition hover:bg-white/10"
          >
            <GalleryVertical className="h-4 w-4" />
            View project case studies
          </Link>
        </div>
      </div>
    </section>
  );
}
