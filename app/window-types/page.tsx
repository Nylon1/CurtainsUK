"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const windowTypes = [
  {
    id: "apex",
    title: "Apex Windows",
    desc: "Sloped, dramatic roofline glazing",
    href: "/apex-curtains",
    image: "/window-types/apex-hero.jpg",
    vibe: "Architectural drama",
  },
  {
    id: "gable",
    title: "Gable End",
    desc: "Tall double-height glazing",
    href: "/gable-end-curtains",
    image: "/window-types/gable-end.jpeg",
    vibe: "Statement living",
  },
  {
    id: "triangular",
    title: "Triangular",
    desc: "Sharp angled windows",
    href: "/triangular-window-curtains",
    image: "/window-types/triangular.jpeg",
    vibe: "Geometric design",
  },
  {
    id: "barn",
    title: "Barn Conversion",
    desc: "Vaulted rustic interiors",
    href: "/barn-conversion-curtains",
    image: "/window-types/barn-conversion.jpeg",
    vibe: "Warm & character",
  },
  {
    id: "large",
    title: "Large Windows",
    desc: "Wide or floor-to-ceiling glass",
    href: "/large-window-curtains",
    image: "/window-types/large-window.jpeg",
    vibe: "Modern elegance",
  },
];

export default function WindowTypesPage() {
  const [active, setActive] = useState(windowTypes[0]);

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-24">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#f5d38a]">
          <Sparkles className="h-4 w-4" />
          Interactive Window Guide
        </div>

        <h1 className="mt-6 text-5xl font-semibold leading-tight sm:text-6xl">
          Find the right curtain approach for your
          <span className="block text-[#f5d38a]">window type</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
          Select your window type to see the specialist curtain route, then explore the track system and room solution that sit behind the finished design.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 lg:grid-cols-2">
        <div className="space-y-4">
          {windowTypes.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className={`w-full rounded-2xl border p-5 text-left transition ${
                active.id === item.id
                  ? "border-[#f5d38a] bg-[#f5d38a]/10"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="text-sm text-white/40">{item.vibe}</div>
              <div className="mt-1 text-xl font-semibold">{item.title}</div>
              <div className="mt-2 text-sm text-white/70">{item.desc}</div>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <img
            src={active.image}
            alt={`${active.title} curtain solution example`}
            className="h-[350px] w-full object-cover"
          />

          <div className="p-6">
            <div className="text-sm uppercase tracking-wide text-[#f5d38a]">
              {active.vibe}
            </div>

            <h2 className="mt-2 text-3xl font-semibold">{active.title}</h2>

            <p className="mt-4 leading-7 text-white/70">
              {active.desc}. This type of window often needs a tailored curtain solution that considers geometry, track route, light control, privacy and how the curtains will operate day to day.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={active.href}
                className="rounded-full bg-[#f5d38a] px-5 py-3 text-sm text-black"
              >
                Explore this window
              </Link>

              <Link
                href="/start-designing"
                className="rounded-full border border-white/20 px-5 py-3 text-sm"
              >
                Start Journey
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-2">
          <Link
            href="/curtain-tracks"
            className="group rounded-[30px] border border-white/10 bg-white/[0.04] p-7 transition hover:border-[#f5d38a]/35 hover:bg-white/[0.07]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5d38a]">
              Track systems
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              How do curtains follow apex and angled windows?
            </h2>
            <p className="mt-4 leading-8 text-white/68">
              The track route, fixing position, curtain weight and opening direction need to be designed together. Our track guide explains the practical options for shaped and tall windows.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#f5d38a]">
              Explore curtain tracks
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/curtain-solutions"
            className="group rounded-[30px] border border-white/10 bg-white/[0.04] p-7 transition hover:border-[#f5d38a]/35 hover:bg-white/[0.07]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f5d38a]">
              Room solutions
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Blackout, privacy, warmth or layered voile?
            </h2>
            <p className="mt-4 leading-8 text-white/68">
              The same window can need a very different curtain specification depending on the room. Explore the main solution types and the trade-offs behind each one.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#f5d38a]">
              Explore curtain solutions
              <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <h2 className="text-3xl font-semibold">Not sure what your window is?</h2>

          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Upload a photo and use our guided assistant, or start the design journey manually.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/arlo-curtain-advisor"
              className="rounded-full bg-[#f5d38a] px-6 py-3 text-black"
            >
              Ask Arlo
            </Link>

            <Link
              href="/start-designing"
              className="rounded-full border border-white/20 px-6 py-3"
            >
              Start Manually
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-24 text-center">
        <h2 className="text-3xl font-semibold">Curtains for architectural windows</h2>

        <p className="mt-6 leading-8 text-white/70">
          We specialise in curtains for apex windows, gable-end glazing, triangular windows, barn conversions and large feature windows across the UK. Each solution is designed around the shape, scale, room use, track requirements and desired level of privacy, light control and comfort.
        </p>
      </section>
    </main>
  );
}
