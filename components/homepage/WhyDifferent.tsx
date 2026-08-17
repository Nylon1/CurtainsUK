"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function WhyDifferent() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[10%] h-[300px] w-[300px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] bottom-[10%] h-[260px] w-[260px] rounded-full bg-white/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.25em] text-[#f5d38a]">
          Why Apex Curtains
        </div>

        <h2 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
          Not all curtains work on
          <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
            {" "}apex windows
          </span>
        </h2>

        <p className="mt-6 text-lg leading-8 text-white/65">
          Standard off-the-shelf curtain systems are often unsuitable for angled and architectural glazing.
          We plan the track, curtain specification and installation around the actual window shape so the finished scheme works with the architecture of the room.
        </p>
      </div>

      <div className="relative z-10 mt-16 grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "Planned for the Shape",
            desc: "Apex, triangular and gable-end windows need accurate angles, considered track routing and curtain drops based on the real glazing geometry.",
          },
          {
            title: "Track and Installation Together",
            desc: "Track position, curtain weight, fixing surface, stack-back and access all need to be considered as one installation rather than as separate decisions.",
          },
          {
            title: "Designed for the Room",
            desc: "The aim is not simply to cover the glass. Heading, fabric, lining and operation are selected to suit the window, room use and the finish you want to achieve.",
          },
        ].map((item) => (
          <motion.div
            key={item.title}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_25px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          >
            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f5d38a]/10 via-transparent to-transparent" />
            </div>

            <div className="relative z-10">
              <h3 className="text-2xl font-semibold text-white">
                {item.title}
              </h3>

              <p className="mt-4 text-sm leading-7 text-white/70">
                {item.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 mt-20 text-center">
        <p className="text-2xl font-medium text-white sm:text-3xl">
          We don’t sell curtains.
          <span className="text-[#f5d38a]"> We solve difficult windows.</span>
        </p>
      </div>

      <div className="relative z-10 mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/start-designing"
          className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-7 py-4 text-sm font-medium text-black transition hover:bg-[#e6c476]"
        >
          Start Your Design
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm text-white transition hover:bg-white/10"
        >
          View Real Installations
        </Link>
      </div>
    </section>
  );
}
