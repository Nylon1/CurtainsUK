"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const INTRO_DURATION_MS = 3200;

export default function ApexEntryScreen() {
  const [showEntry, setShowEntry] = useState(true);

  useEffect(() => {
    const autoDismiss = window.setTimeout(() => {
      setShowEntry(false);
    }, INTRO_DURATION_MS);

    return () => window.clearTimeout(autoDismiss);
  }, []);

  function handleEnter() {
    setShowEntry(false);
  }

  if (!showEntry) return null;

  return (
    <section
      aria-label="Apex Curtains introduction"
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-apex-navy-950 text-white transition-opacity duration-500 motion-reduce:transition-none"
    >
      <Image
        src="/images/apex-entry-poster.jpeg"
        alt="Apex Curtains architectural curtain installation"
        fill
        sizes="100vw"
        className="object-cover scale-[1.035] motion-safe:animate-[pulse_7s_ease-in-out_infinite]"
      />

      <div className="absolute inset-0 bg-apex-navy-950/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-apex-navy-950/20 via-apex-navy-950/45 to-apex-navy-950/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(214,181,107,0.16),transparent_44%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Image
            src="/images/apex-logo-stacked-light.svg"
            alt="Apex Curtains"
            width={180}
            height={180}
            className="h-auto w-[118px] sm:w-[145px]"
          />

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.30em] text-[#d6b56b] sm:text-xs">
            Specialist curtains for extraordinary windows
          </p>

          <h2 className="mt-5 max-w-2xl font-serif text-4xl leading-[0.98] tracking-tight text-white sm:text-6xl">
            Bespoke curtains shaped around the architecture.
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            Made-to-measure curtains and specialist track solutions for apex, triangular, gable-end and unusually large windows.
          </p>

          <button
            type="button"
            onClick={handleEnter}
            className="pointer-events-auto mt-8 inline-flex min-w-[210px] items-center justify-center bg-[#d6b56b] px-8 py-4 text-xs font-semibold uppercase tracking-[0.26em] text-apex-navy-950 shadow-[0_18px_55px_rgba(0,0,0,0.32)] transition hover:bg-[#e4c77f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-sm"
          >
            Enter site
          </button>

          <p className="mt-4 text-xs text-white/45">Intro closes automatically after 3.2 seconds.</p>
        </div>
      </div>
    </section>
  );
}
