"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const journeySteps = [
  {
    slug: "show-us-your-window",
    number: "01",
    title: "Show us your window",
    short: "You send the photo. We start the journey.",
    image: "/journey/show-window.jpeg" ,
  },
  {
    slug: "we-decode-the-shape",
    number: "02",
    title: "We decode the shape",
    short: "We work out what the window really needs.",
    image: "/journey/decode-shape.jpg",
  },
  {
    slug: "we-shape-the-design",
    number: "03",
    title: "We shape the design",
    short: "Heading, lining, fullness and mood all come together.",
    image: "/journey/design-direction.jpeg",
  },
  {
    slug: "we-make-it-beautifully",
    number: "04",
    title: "We make it beautifully",
    short: "Bespoke means made around the room, not pulled from a shelf.",
    image: "/journey/make-beautifully.jpeg",
  },
  {
    slug: "we-install-and-reveal",
    number: "05",
    title: "We install and reveal",
    short: "The room changes. The window becomes the feature.",
    image: "/journey/install-reveal.jpeg",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export default function ApexInstallationJourney() {
  return (
    <section className="relative overflow-hidden bg-apex-navy-900 px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[8%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/10 blur-[130px]" />
        <div className="absolute right-[8%] top-[24%] h-[220px] w-[220px] rounded-full bg-sky-400/8 blur-[130px]" />
        <div className="absolute bottom-[10%] left-[40%] h-[240px] w-[240px] rounded-full bg-[#f5d38a]/8 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/30 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Installation Journey
          </div>

          <h2 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            From difficult window to finished room
          </h2>

          <p className="mt-5 text-base leading-8 text-white/70">
            Every apex curtain installation is a guided transformation.
            Click any stage to explore the detail and understand how the journey unfolds.
          </p>

          <div className="mt-10 flex justify-center">
            <div className="h-px w-40 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.08 }}
          className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3"
        >
          {journeySteps.map((step) => (
            <motion.div key={step.slug} variants={cardVariants}>
              <Link
                href={`/journey/${step.slug}`}
                className="group block overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-2 hover:border-[#f5d38a]/40 hover:shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-72 w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-100">
                    <div className="absolute -left-[120%] top-0 h-full w-[120%] skew-x-[-24deg] bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[journeyShine_1.2s_ease]" />
                  </div>

                  <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-[#f5d38a]/30 bg-black/30 px-3 py-1 text-[10px] tracking-[0.2em] text-[#f5d38a] backdrop-blur-sm">
                    STEP {step.number}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-semibold text-white transition duration-300 group-hover:text-[#f5d38a]">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/70">
                    {step.short}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#f5d38a]">
                    Explore this stage
                    <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-14 rounded-[32px] border border-[#f5d38a]/15 bg-[#f5d38a]/6 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                The final transformation
              </div>

              <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">
                A difficult apex window becomes one of the strongest features in the home
              </h3>

              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/72 sm:text-base">
                Our service is designed around awkward glazing, unusual angles and dramatic
                architectural spaces. The aim is not just to cover the window, but to complete the room.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/start-designing"
                className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:scale-[1.02] hover:bg-[#e6c476]"
              >
                Start Your Curtain Journey
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/arlo-curtain-advisor"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition hover:scale-[1.02] hover:bg-white/10"
              >
                Get Expert Advice First
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}