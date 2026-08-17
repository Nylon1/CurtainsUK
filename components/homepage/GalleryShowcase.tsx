"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Camera, Sparkles } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";

const galleryItems = [
  {
    title: "Apex Window Curtains",
    subtitle: "Shaped glazing and dramatic rooflines",
    image: "/window-types/apex-hero.jpg",
    href: "/gallery",
  },
  {
    title: "Gable End Projects",
    subtitle: "Double-height spaces and large glazed walls",
    image: "/window-types/gable-end.jpeg",
    href: "/gallery",
  },
  {
    title: "Barn Conversion Curtains",
    subtitle: "Softening lofty architectural rooms",
    image: "/window-types/barn-conversion.jpeg",
    href: "/gallery",
  },
];

export default function GalleryShowcase() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-[42px]">
        <div className="absolute left-[8%] top-[10%] h-44 w-44 rounded-full bg-[#f5d38a]/8 blur-[100px]" />
        <div className="absolute right-[8%] top-[18%] h-56 w-56 rounded-full bg-white/5 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-48 w-48 rounded-full bg-[#f5d38a]/6 blur-[100px]" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
            <Camera className="h-4 w-4" />
            Gallery
          </div>

          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            See our curtain work in
            <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
              {" "}real spaces
            </span>
          </h2>

          <p className="mt-6 text-base leading-8 text-white/65 sm:text-lg">
            Explore a curated collection of apex, gable end and architectural
            curtain projects. This is where design ideas become finished rooms.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              View full gallery
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <TrackedLink
              href="/start-designing"
              eventName="curtain_journey_start_click"
              eventData={{ source: "homepage_gallery" }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:border-[#f5d38a]/25 hover:bg-white/10"
            >
              Start your curtain journey
            </TrackedLink>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
        >
          <Link href={galleryItems[0].href} className="group block">
            <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-white/[0.04] shadow-[0_30px_100px_rgba(0,0,0,0.4)] transition duration-500 hover:-translate-y-1 hover:border-[#f5d38a]/28">
              <div className="absolute inset-0">
                <Image
                  src={galleryItems[0].image}
                  alt={galleryItems[0].title}
                  fill
                  sizes="(max-width: 1023px) 100vw, 55vw"
                  className="object-cover transition duration-[1200ms] group-hover:scale-105"
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/28 to-black/8" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

              <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                <div className="absolute -right-10 top-0 h-44 w-44 rounded-full bg-[#f5d38a]/10 blur-[85px]" />
              </div>

              <div className="relative flex h-[520px] flex-col justify-end p-8 sm:p-10">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#f5d38a] backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured Project
                </div>

                <h3 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight text-white transition group-hover:text-[#f5d38a] sm:text-5xl">
                  {galleryItems[0].title}
                </h3>

                <p className="mt-3 max-w-xl text-sm leading-7 text-white/78 sm:text-base">
                  {galleryItems[0].subtitle}
                </p>

                <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#f5d38a]">
                  Explore project inspiration
                  <ArrowUpRight className="h-4 w-4 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {galleryItems.slice(1).map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, delay: index * 0.06 }}
          >
            <Link href={item.href} className="group block">
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.35)] transition duration-500 hover:-translate-y-1 hover:border-[#f5d38a]/28">
                <div className="absolute inset-0">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 1023px) 100vw, 50vw"
                    className="object-cover transition duration-[1000ms] group-hover:scale-105"
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

                <div className="relative flex h-[280px] flex-col justify-end p-6 sm:p-8">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#f5d38a]">
                    Gallery Highlight
                  </div>

                  <h3 className="mt-3 text-2xl font-semibold leading-tight text-white transition group-hover:text-[#f5d38a] sm:text-3xl">
                    {item.title}
                  </h3>

                  <p className="mt-2 max-w-lg text-sm leading-7 text-white/75">
                    {item.subtitle}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#f5d38a]">
                    View gallery
                    <ArrowUpRight className="h-4 w-4 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.03] p-8 text-center shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <p className="mx-auto max-w-3xl text-sm leading-8 text-white/62 sm:text-base">
          The gallery is designed to help you picture what is possible in your
          own home — from difficult apex glazing to large statement windows that
          need a more considered curtain solution.
        </p>
      </div>
    </section>
  );
}
