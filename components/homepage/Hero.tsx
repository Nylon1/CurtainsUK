"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Phone, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TrackedLink from "@/components/analytics/TrackedLink";

const windowOptions = [
  {
    id: "apex",
    title: "Apex Windows",
    eyebrow: "Most popular",
    description: "For sloped and dramatic triangular roofline glazing.",
    href: "/apex-curtains",
    image: "/window-types/apex-hero.jpg",
    system: "Custom bent aluminium track with made-to-measure lined drapery",
    bestFor: "Luxury homes",
    pricing: "Quoted to the window, specification and installation requirements",
    note: "Ideal when the room needs softness without losing the architectural drama.",
  },
  {
    id: "triangular",
    title: "Triangular Windows",
    eyebrow: "Architectural fit",
    description: "Elegant solutions for unusual angular glazing.",
    href: "/triangular-window-curtains",
    image: "/window-types/triangular.jpeg",
    system: "Tailored track direction with shaped curtain planning",
    bestFor: "Modern feature rooms",
    pricing: "Quoted to the window, specification and installation requirements",
    note: "Best where the shape itself is part of the design story.",
  },
  {
    id: "gable",
    title: "Gable End Windows",
    eyebrow: "Statement spaces",
    description: "Designed for dramatic double-height glazing.",
    href: "/gable-end-curtains",
    image: "/window-types/gable-end.jpeg",
    system: "Heavy-duty custom tracking for tall feature glazing",
    bestFor: "Open-plan spaces",
    pricing: "Quoted to the window, specification and installation requirements",
    note: "Works beautifully where scale, light and softness all need balancing.",
  },
  {
    id: "barn",
    title: "Barn Conversions",
    eyebrow: "Character spaces",
    description: "Curtain systems for vaulted and lofty angular rooms.",
    href: "/barn-conversion-curtains",
    image: "/window-types/barn-conversion.jpeg",
    system: "Bespoke track planning for vaulted room geometry",
    bestFor: "Barns and conversions",
    pricing: "Quoted to the window, specification and installation requirements",
    note: "Perfect for adding warmth to large rustic-glazed interiors.",
  },
  {
    id: "large",
    title: "Large Windows",
    eyebrow: "Grand glazing",
    description: "Luxury drapery for expansive walls of glass.",
    href: "/large-window-curtains",
    image: "/window-types/large-feature.jpeg",
    system: "Wave or pinch pleat on robust made-to-measure tracking",
    bestFor: "Wide glazed rooms",
    pricing: "Quoted to the window, specification and installation requirements",
    note: "A strong choice where scale and elegance matter more than complexity.",
  },
];

export default function Hero() {
  const [activeId, setActiveId] = useState("apex");
  const active =
    windowOptions.find((item) => item.id === activeId) ?? windowOptions[0];

  return (
    <section className="apex-hero-surface relative overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[6%] top-[8%] h-[240px] w-[240px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[18%] h-[260px] w-[260px] rounded-full bg-sky-400/8 blur-[140px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[200px] w-[200px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-20 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/25 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
              <Sparkles className="h-4 w-4" />
              Window Type Explorer
            </div>

            <h1 className="mt-6 text-5xl font-semibold leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
              Tailored curtains for
              <span className="block bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
                architectural windows
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
              Explore specialist curtain solutions for apex, triangular, gable end
              and other unusual glazed spaces. Select a window type to preview the
              direction we’d usually recommend.
            </p>

            <p className="mt-5 text-sm uppercase tracking-[0.18em] text-white/45">
              Choose your window type
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {windowOptions.map((item) => {
                const isActive = item.id === active.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveId(item.id)}
                    onFocus={() => setActiveId(item.id)}
                    onClick={() => setActiveId(item.id)}
                    className={`rounded-[22px] border p-5 text-left transition duration-300 ${
                      isActive
                        ? "border-[#f5d38a]/45 bg-[#f5d38a]/10 shadow-[0_12px_40px_rgba(245,211,138,0.12)]"
                        : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div
                      className={`text-[10px] uppercase tracking-[0.2em] ${
                        isActive ? "text-[#f5d38a]" : "text-white/40"
                      }`}
                    >
                      {item.eyebrow}
                    </div>

                    <div
                      className={`mt-3 text-lg font-semibold ${
                        isActive ? "text-[#f5d38a]" : "text-white"
                      }`}
                    >
                      {item.title}
                    </div>

                    <p className="mt-2 text-sm leading-7 text-white/68">
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex flex-col items-start">
                <TrackedLink
                  href="/start-designing"
                  eventName="curtain_journey_start_click"
                  eventData={{ source: "homepage_hero" }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition duration-300 hover:scale-[1.02] hover:bg-[#e6c476]"
                >
                  Start Your Curtain Journey
                  <ArrowRight className="h-4 w-4" />
                </TrackedLink>

                <span className="mt-2 text-xs text-white/50">
                  Guided project enquiry • No obligation
                </span>
              </div>

              <Link
                href="/arlo-curtain-advisor"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition duration-300 hover:scale-[1.02] hover:bg-white/10"
              >
                Ask Arlo
              </Link>

              <a
                href="tel:08007720367"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition duration-300 hover:scale-[1.02] hover:bg-white/10"
              >
                <Phone className="mr-2 h-4 w-4" />
                0800 772 0367
              </a>
            </div>
          </div>

          <div className="lg:pt-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.985 }}
                transition={{ duration: 0.35 }}
                className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_25px_80px_rgba(0,0,0,0.32)]"
              >
                <div className="relative h-[430px] overflow-hidden">
                  <Image
                    src={active.image}
                    alt={active.title}
                    fill
                    priority={active.id === "apex"}
                    sizes="(max-width: 1023px) 100vw, 46vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute left-6 top-6 rounded-full border border-[#f5d38a]/25 bg-black/30 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#f5d38a] backdrop-blur-sm">
                    {active.eyebrow}
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-6 sm:p-7">
                    <div className="max-w-xl">
                      <h2 className="text-4xl font-semibold text-white sm:text-5xl">
                        {active.title}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-white/74 sm:text-base">
                        {active.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  <Link
                    href={active.href}
                    className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/25 bg-[#f5d38a]/10 px-4 py-2 text-sm text-[#f5d38a] transition hover:bg-[#f5d38a]/15"
                  >
                    View {active.title} page
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                      Recommended system
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white">
                      {active.system}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                        Best for
                      </div>
                      <div className="mt-3 text-lg font-semibold text-white">
                        {active.bestFor}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                        Pricing approach
                      </div>
                      <div className="mt-3 text-base font-semibold leading-7 text-white">
                        {active.pricing}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                      Design note
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/72">
                      {active.note}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
