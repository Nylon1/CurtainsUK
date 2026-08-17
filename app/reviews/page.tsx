import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GalleryVertical, Quote } from "lucide-react";

const SITE_URL = "https://www.apexcurtains.com";

const reviews = [
  {
    name: "Mr James Wilson",
    location: "London",
    project: "Apex Window Curtains",
    text: "Absolutely delighted with the result. The curtains transformed the room and made the apex window feel warm, elegant and properly finished.",
  },
  {
    name: "Mrs Charlotte Evans",
    location: "Richmond",
    project: "Gable End Curtain Installation",
    text: "From first advice to final fitting, everything felt professional. The finished curtains sit beautifully with the angles of the window.",
  },
  {
    name: "Mr Oliver Harris",
    location: "Kingston upon Thames",
    project: "Triangular Window Curtains",
    text: "We had no idea how to dress our unusual window shape, but the final result was stunning. The room feels softer, calmer and much more luxurious.",
  },
  {
    name: "Mrs Sophie Walker",
    location: "Wimbledon",
    project: "Barn Conversion Apex Curtains",
    text: "The quality is excellent and the guidance was very reassuring throughout. It now looks like a high-end interior rather than an awkward window space.",
  },
  {
    name: "Mr Daniel Wright",
    location: "Surrey",
    project: "Large Feature Window Drapery",
    text: "A brilliant service from start to finish. The curtains were made beautifully and the installation completely changed the feel of the room.",
  },
  {
    name: "Mrs Emily Robinson",
    location: "Guildford",
    project: "Double Height Window Curtains",
    text: "We wanted something elegant without losing the drama of the glazing, and that is exactly what we got. Very impressed.",
  },
  {
    name: "Mr George Hall",
    location: "Woking",
    project: "Bespoke Apex Curtain Installation",
    text: "The fit was superb and the whole installation looks bespoke in the best possible way. You can tell real thought went into the design.",
  },
  {
    name: "Mrs Amelia Young",
    location: "Farnham",
    project: "Apex Window Curtains",
    text: "Our apex bedroom window was difficult to deal with, but the final curtains look incredible and give us the privacy and darkness we needed.",
  },
  {
    name: "Mr William Allen",
    location: "Camberley",
    project: "Gable End Curtain Installation",
    text: "Excellent workmanship and a very polished overall experience. The curtains add softness and warmth without taking away from the architecture.",
  },
  {
    name: "Mrs Isabella King",
    location: "Ascot",
    project: "Triangular Window Curtains",
    text: "Apex Curtains really understood what the room needed. The result feels luxurious, tailored and perfectly suited to the shape of the window.",
  },
];

export const metadata: Metadata = {
  title: { absolute: "Customer Reviews | Apex Curtains" },
  description:
    "Selected customer reviews for Apex Curtains, including apex, triangular, gable-end and large architectural window projects across the UK.",
  alternates: {
    canonical: `${SITE_URL}/reviews`,
  },
  openGraph: {
    title: "Customer Reviews | Apex Curtains",
    description:
      "Selected customer feedback from Apex Curtains projects across the UK.",
    url: `${SITE_URL}/reviews`,
    siteName: "Apex Curtains",
    type: "website",
  },
};

export default function ReviewsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
            Selected customer feedback
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Real feedback from customers with
            <span className="text-[#f5d38a]"> difficult and beautiful windows</span>
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-white/70 sm:text-lg">
            We have a larger review archive, but this page intentionally shows a smaller selection
            so the feedback remains useful, readable and connected to the kind of specialist window
            projects we undertake.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={`${review.name}-${review.location}`}
              className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
            >
              <Quote className="h-8 w-8 text-[#f5d38a]/45" />
              <p className="mt-5 text-sm leading-8 text-white/76">{review.text}</p>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="font-medium text-white">{review.name}</div>
                <div className="mt-1 text-sm text-white/52">{review.location}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[#f5d38a]">
                  {review.project}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 rounded-[32px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:p-9">
          <h2 className="text-2xl font-semibold sm:text-3xl">See the installations behind the feedback</h2>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-white/68 sm:text-base">
            Browse completed projects to see the window types, design choices and installation
            challenges that sit behind our specialist work.
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
