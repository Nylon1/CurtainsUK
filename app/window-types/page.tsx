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
    <main className="min-h-screen bg-apex-navy-900 text-white overflow-hidden">

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <div className="inline-flex items-center gap-2 text-[#f5d38a] text-xs uppercase tracking-widest">
          <Sparkles className="w-4 h-4" />
          Interactive Window Guide
        </div>

        <h1 className="text-5xl sm:text-6xl font-semibold mt-6 leading-tight">
          Find the perfect curtains for your
          <span className="block text-[#f5d38a]">
            window type
          </span>
        </h1>

        <p className="mt-6 text-white/70 max-w-2xl text-lg leading-8">
          Every window is different. Select your window type below and instantly
          see how we would approach it.
        </p>
      </section>

      {/* SELECTOR */}
      <section className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-10 pb-20">

        {/* LEFT OPTIONS */}
        <div className="space-y-4">
          {windowTypes.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className={`w-full text-left p-5 rounded-2xl border transition ${
                active.id === item.id
                  ? "border-[#f5d38a] bg-[#f5d38a]/10"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="text-sm text-white/40">{item.vibe}</div>
              <div className="text-xl font-semibold mt-1">{item.title}</div>
              <div className="text-white/70 text-sm mt-2">{item.desc}</div>
            </button>
          ))}
        </div>

        {/* RIGHT PREVIEW */}
        <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03]">
          <img
            src={active.image}
            className="w-full h-[350px] object-cover"
          />

          <div className="p-6">
            <div className="text-sm text-[#f5d38a] uppercase tracking-wide">
              {active.vibe}
            </div>

            <h2 className="text-3xl font-semibold mt-2">
              {active.title}
            </h2>

            <p className="mt-4 text-white/70 leading-7">
              {active.desc}. This type of window often needs a tailored curtain
              solution to balance light, scale and comfort.
            </p>

            <div className="mt-6 flex gap-3">
              <Link
                href={active.href}
                className="bg-[#f5d38a] text-black px-5 py-3 rounded-full text-sm"
              >
                Explore Solutions
              </Link>

              <Link
                href="/start-designing"
                className="border border-white/20 px-5 py-3 rounded-full text-sm"
              >
                Start Journey
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/* EXPERIENCE SECTION */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="rounded-3xl border border-white/10 p-10 bg-white/[0.03] text-center">
          <h2 className="text-3xl font-semibold">
            Not sure what your window is?
          </h2>

          <p className="mt-4 text-white/70 max-w-xl mx-auto">
            Upload a photo and let our AI assistant guide you instantly.
          </p>

          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/arlo-curtain-advisor"
              className="bg-[#f5d38a] text-black px-6 py-3 rounded-full"
            >
              Ask Arlo
            </Link>

            <Link
              href="/start-designing"
              className="border border-white/20 px-6 py-3 rounded-full"
            >
              Start Manually
            </Link>
          </div>
        </div>
      </section>

      {/* SEO TEXT BLOCK */}
      <section className="max-w-4xl mx-auto px-4 pb-24 text-center">
        <h2 className="text-3xl font-semibold">
          Curtains for every architectural window
        </h2>

        <p className="mt-6 text-white/70 leading-8">
          We specialise in curtains for apex windows, gable end glazing,
          triangular windows, barn conversions and large feature windows across the UK.
          Each solution is designed based on the shape, scale and use of the room.
        </p>
      </section>

    </main>
  );
}