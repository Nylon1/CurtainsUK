import Link from "next/link";
import { ArrowRight } from "lucide-react";

const authorityLinks = [
  {
    href: "/curtain-tracks",
    title: "Specialist curtain tracks",
    text: "Understand track planning for apex, triangular, angled, gable-end and unusually tall windows.",
  },
  {
    href: "/curtain-solutions",
    title: "Curtain solutions",
    text: "Compare blackout, thermal comfort, privacy and voile layering for difficult architectural glazing.",
  },
  {
    href: "/window-types",
    title: "Window type guide",
    text: "Start with the shape and scale of the glazing, then connect it to the right curtain and track approach.",
  },
  {
    href: "/gallery",
    title: "Real installations",
    text: "See project examples showing how shaped and large windows are approached in finished rooms.",
  },
];

export default function AuthorityLinks({
  eyebrow = "Specialist knowledge",
  heading = "Go deeper into the solution",
}: {
  eyebrow?: string;
  heading?: string;
}) {
  return (
    <section className="border-t border-white/10 bg-apex-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
          {eyebrow}
        </p>
        <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#f4f0e8] sm:text-4xl">
          {heading}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#c8d1d8] sm:text-base">
          Difficult windows are easier to understand when the window shape, track route, curtain function and installation method are considered together.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {authorityLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[24px] border border-white/10 bg-[#1B405B] p-6 transition hover:-translate-y-0.5 hover:border-[#d6b56b]/40"
            >
              <h3 className="text-lg font-semibold text-[#f4f0e8]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#c8d1d8]">{item.text}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#d6b56b]">
                Explore
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
