import Image from "next/image";
import {
  ArrowRight,
  Check,
  Layers3,
  Palette,
  Ruler,
  ShieldCheck,
  Sparkles,
  SwatchBook,
} from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import WindowCard from "@/components/storefront/WindowCard";
import { STOREFRONT_WINDOW_TYPES } from "@/lib/storefront/window-catalog";

const designDirections = [
  {
    number: "01",
    title: "Based on your taste",
    text: "A direction shaped around the colours, character and preferences you respond to.",
  },
  {
    number: "02",
    title: "Tonal & calm",
    text: "Layer closely related tones for a softer, more considered interior.",
  },
  {
    number: "03",
    title: "Complementary",
    text: "Introduce a colour relationship that lifts the room without fighting it.",
  },
  {
    number: "04",
    title: "Pattern & character",
    text: "Bring in print, texture or detail where the room can carry something stronger.",
  },
  {
    number: "05",
    title: "Designer choice",
    text: "A more directional option selected to give you somewhere unexpected to explore.",
  },
];

const intelligenceSteps = [
  { icon: Sparkles, label: "Your room", text: "Upload one reference photo." },
  { icon: Palette, label: "Your colours", text: "Check the palette we see." },
  { icon: Layers3, label: "Five directions", text: "Explore different design approaches." },
  { icon: SwatchBook, label: "Refine", text: "Tell us what feels right." },
  { icon: Check, label: "Sample", text: "Order the exact colourway." },
];

export default function StorefrontHome() {
  return (
    <main className="bg-[#f4f0e8] text-[#18372f]">
      <section className="relative overflow-hidden border-b border-[#18372f]/10">
        <div className="mx-auto grid min-h-[760px] max-w-[1600px] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex items-center px-5 py-16 sm:px-8 lg:px-14 lg:py-24 xl:px-20">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#95662f]">
                CurtainsUK Fabric Intelligence™
              </div>
              <h1 className="mt-6 max-w-[760px] text-5xl font-medium leading-[0.96] tracking-[-0.055em] text-[#18372f] sm:text-6xl xl:text-[82px]">
                Your room knows where to start.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#526a62] sm:text-xl">
                Upload one photo and discover curtain fabrics considered around your room, your colours and your taste.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href="/curtain-consultation?entry=room"
                  eventName="fabric_intelligence_started"
                  eventData={{ placement: "homepage_hero" }}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#18372f] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#254b40]"
                >
                  Start with my room <ArrowRight className="h-4 w-4" />
                </TrackedLink>
                <TrackedLink
                  href="/fabrics"
                  eventName="shop_by_fabric_clicked"
                  eventData={{ placement: "homepage_hero" }}
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-[#18372f]/20 bg-white/70 px-7 py-3.5 text-sm font-semibold text-[#18372f] transition hover:border-[#18372f]/40"
                >
                  Explore fabrics
                </TrackedLink>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#18372f]/12 pt-5 text-xs font-medium uppercase tracking-[0.13em] text-[#6c7c76]">
                <span>One room</span><span>Five design directions</span><span>Made to measure</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[520px] lg:min-h-full">
            <Image
              src="/window-types/apex-hero.jpg"
              alt="A considered interior with made-to-measure curtains"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 58vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#18372f]/45 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 max-w-md rounded-[28px] border border-white/25 bg-[#f4f0e8]/90 p-5 text-[#18372f] shadow-2xl backdrop-blur-xl sm:bottom-8 sm:left-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#95662f]">Room palette</div>
                  <p className="mt-1 text-sm text-[#53675f]">Confirm what we see before recommendations begin.</p>
                </div>
                <Palette className="h-5 w-5 shrink-0" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-medium">
                <div className="rounded-2xl bg-[#d9c9ad] p-3"><span className="block opacity-60">Primary</span>Warm stone</div>
                <div className="rounded-2xl bg-[#d7d7c5] p-3"><span className="block opacity-60">Secondary</span>Soft sage</div>
                <div className="rounded-2xl bg-[#596958] p-3 text-white"><span className="block opacity-70">Accent</span>Deep olive</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95662f]">Interior intelligence for made-to-measure curtains</div>
          <h2 className="mt-4 text-4xl font-medium leading-[1.02] tracking-[-0.045em] sm:text-6xl">
            From one room to a considered shortlist.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#5b7069]">
            Fabric Intelligence turns a room into a design starting point. You confirm the details, explore different directions and refine what you like before ordering a sample.
          </p>
        </div>

        <div className="mt-12 grid overflow-hidden rounded-[32px] border border-[#18372f]/12 bg-white/55 md:grid-cols-5">
          {intelligenceSteps.map(({ icon: Icon, label, text }, index) => (
            <article key={label} className="relative border-b border-[#18372f]/10 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18372f] text-white"><Icon className="h-4.5 w-4.5" /></div>
              <div className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a0713a]">0{index + 1}</div>
              <h3 className="mt-2 text-lg font-semibold">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-[#667871]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#18372f] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#dfba82]">Five design directions</div>
              <h2 className="mt-4 text-4xl font-medium leading-[1.02] tracking-[-0.045em] sm:text-6xl">Your room. Five ways to dress it.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/65">Not one answer presented as the answer. Five different ways to think about the room, each supported by real fabrics.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {designDirections.map((direction) => (
                <article key={direction.title} className="min-h-[250px] rounded-[26px] border border-white/12 bg-white/[0.06] p-5 backdrop-blur-sm">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#dfba82]">{direction.number}</div>
                  <h3 className="mt-10 text-xl font-medium leading-tight">{direction.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-white/60">{direction.text}</p>
                </article>
              ))}
            </div>
          </div>
          <TrackedLink
            href="/curtain-consultation?entry=guided"
            eventName="fabric_intelligence_started"
            eventData={{ placement: "homepage_directions" }}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-[#e0b878] px-6 py-3.5 text-sm font-semibold text-[#18372f]"
          >
            Let Fabric Intelligence guide me <ArrowRight className="h-4 w-4" />
          </TrackedLink>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        <div className="rounded-[34px] border border-[#18372f]/10 bg-[#e8e0d3] p-7 sm:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#94662f]">We suggest. You decide.</div>
          <div className="mt-8 space-y-4">
            {[
              { label: "Primary", colours: ["Warm stone", "Ivory", "Soft taupe"] },
              { label: "Secondary", colours: ["Sage", "Natural oak", "Chalk"] },
              { label: "Accent", colours: ["Deep olive", "Ink blue", "Rust"] },
            ].map((row) => (
              <div key={row.label} className="rounded-2xl border border-[#18372f]/10 bg-white/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold">{row.label}</span>
                  <div className="flex flex-wrap gap-2">
                    {row.colours.map((colour) => <span key={colour} className="rounded-full border border-[#18372f]/10 bg-white px-3 py-1.5 text-xs text-[#586c65]">{colour}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-xl">
          <h2 className="text-4xl font-medium leading-[1.04] tracking-[-0.045em] sm:text-5xl">Good advice starts by letting you correct us.</h2>
          <p className="mt-5 text-lg leading-8 text-[#5b7069]">Fabric Intelligence identifies primary, secondary and accent colours as a starting point. Keep them, remove them or change them before your design directions are created.</p>
          <p className="mt-4 text-base leading-7 text-[#6a7c75]">Your room stays yours. The intelligence helps narrow the choice; you remain in control of the design.</p>
        </div>
      </section>

      <section className="border-y border-[#18372f]/10 bg-[#eee8de]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95662f]">Made for your architecture</div>
              <h2 className="mt-3 text-4xl font-medium tracking-[-0.045em] sm:text-5xl">Made for your window.</h2>
            </div>
            <TrackedLink href="/shop-by-window" eventName="shop_by_window_clicked" eventData={{ placement: "homepage_intelligence" }} className="inline-flex items-center gap-2 text-sm font-semibold">Explore every window type <ArrowRight className="h-4 w-4" /></TrackedLink>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STOREFRONT_WINDOW_TYPES.slice(0, 4).map((windowType, index) => <WindowCard key={windowType.slug} windowType={windowType} priority={index < 2} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-6 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
        <article className="rounded-[34px] bg-[#d8c5a5] p-8 sm:p-11">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#684a27]">See it in your own light</div>
          <h2 className="mt-4 max-w-lg text-4xl font-medium tracking-[-0.045em]">Order the fabric before you order the curtain.</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#4f5e58]">Save the exact colourway you love, order a sample, then return to the same fabric when you are ready to make your curtains.</p>
          <TrackedLink href="/fabrics" eventName="shop_by_fabric_clicked" eventData={{ placement: "homepage_sample" }} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#18372f] px-6 py-3.5 text-sm font-semibold text-white">Explore fabrics <ArrowRight className="h-4 w-4" /></TrackedLink>
        </article>
        <article className="rounded-[34px] border border-[#18372f]/12 bg-white/60 p-8 sm:p-11">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95662f]">From idea to made to measure</div>
          <h2 className="mt-4 max-w-lg text-4xl font-medium tracking-[-0.045em]">Design first. Measure when you’re ready.</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-[#5b7069]">Once the fabric feels right, our window journey takes over with compatible headings, linings, measurements and specialist review where required.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <TrackedLink href="/shop-by-window" eventName="shop_by_window_clicked" eventData={{ placement: "homepage_close" }} className="inline-flex items-center gap-2 rounded-full border border-[#18372f]/20 bg-white px-5 py-3 text-sm font-semibold">Shop by window <ArrowRight className="h-4 w-4" /></TrackedLink>
            <TrackedLink href="/configure?window=apex-window" eventName="specialist_journey_started" eventData={{ placement: "homepage_close" }} className="inline-flex items-center gap-2 rounded-full border border-[#18372f]/20 px-5 py-3 text-sm font-semibold">Specialist shapes</TrackedLink>
          </div>
        </article>
      </section>

      <section className="bg-[#18372f] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8">
          {[
            { icon: Ruler, title: "Made to measure", text: "A specification built around your actual window." },
            { icon: ShieldCheck, title: "Specialist review", text: "Complex apex and gable work is held for technical approval." },
            { icon: SwatchBook, title: "Exact samples", text: "Samples stay linked to the exact fabric colourway you chose." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 py-3">
              <Icon className="mt-1 h-5 w-5 shrink-0 text-[#dfba82]" />
              <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-white/60">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
