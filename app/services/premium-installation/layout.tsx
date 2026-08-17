import type { ReactNode } from "react";
import Link from "next/link";

const evidencePoints = [
  {
    title: "Window and track geometry",
    text: "Before manufacture or fitting, the proposed track line should be checked against the actual window shape, ceiling or wall line and the place where the curtains will stack when open.",
  },
  {
    title: "Fixing surface and load",
    text: "Curtain weight is transferred through the track and fixings into the building structure. Heavy, interlined or very long curtains therefore need the substrate, brackets and fixing method considered as part of the specification.",
  },
  {
    title: "Access and installation method",
    text: "High or awkward installations need an access plan before fitting day. The appropriate method depends on the height, room layout and building constraints rather than a single standard approach.",
  },
  {
    title: "Finished operation",
    text: "A successful installation is not only visually aligned. The curtain should open, close, stack and clear the floor as intended, with the heading and gliders working correctly along the full track route.",
  },
];

export default function PremiumInstallationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <section className="border-t border-white/10 bg-apex-navy-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
              Installation methodology
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              What we need to resolve before a difficult curtain installation
            </h2>
            <p className="mt-5 text-base leading-8 text-[#C8D1D8]">
              For shaped and double-height windows, installation planning is part of the curtain design. These are the practical checks that connect the window, track, curtain weight and building structure.
            </p>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {evidencePoints.map((item) => (
              <article key={item.title} className="rounded-[28px] border border-white/10 bg-[#1B405B] p-6 sm:p-7">
                <h3 className="text-xl font-semibold text-[#F4F0E8]">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#C8D1D8] sm:text-base sm:leading-8">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/curtain-tracks" className="rounded-full border border-[#d6b56b]/30 bg-[#d6b56b]/10 px-5 py-3 text-sm font-medium text-[#F4F0E8]">
              Track specification guide
            </Link>
            <Link href="/services/measure-consultation" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-[#F4F0E8]">
              Measuring & consultation
            </Link>
            <Link href="/gallery" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-[#F4F0E8]">
              Real installation projects
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
