import Image from "next/image";
import { ArrowRight, Check, Ruler, ShieldCheck, Sparkles } from "lucide-react";
import TrackedLink from "@/components/analytics/TrackedLink";
import WindowCard from "@/components/storefront/WindowCard";
import { STOREFRONT_WINDOW_TYPES } from "@/lib/storefront/window-catalog";

export default function StorefrontHome() {
  return (
    <main className="bg-[#f7f3ec] text-[#173c32]">
      <section className="relative overflow-hidden border-b border-[#173c32]/10">
        <div className="mx-auto grid min-h-[720px] max-w-[1440px] lg:grid-cols-[0.94fr_1.06fr]">
          <div className="flex items-center px-4 py-16 sm:px-8 lg:px-12 lg:py-24 xl:px-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#173c32]/12 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f5130]"><Sparkles className="h-3.5 w-3.5" /> Made in Britain · measured for your window</div>
              <h1 className="mt-7 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#173c32] sm:text-6xl xl:text-7xl">Curtains for every window</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#4f6a61] sm:text-xl">Made-to-measure curtains for standard, bay, apex, triangular, gable, tall, wide and unusual windows.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <TrackedLink href="/shop-by-window" eventName="shop_by_window_clicked" eventData={{ placement: "homepage_hero" }} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#173c32] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#244d42]">Shop by Window <ArrowRight className="h-4 w-4" /></TrackedLink>
                <TrackedLink href="/fabrics" eventName="shop_by_fabric_clicked" eventData={{ placement: "homepage_hero" }} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-[#173c32]/20 bg-white px-7 py-3.5 text-sm font-semibold text-[#173c32] transition hover:border-[#173c32]/40">Shop by Fabric</TrackedLink>
              </div>
              <ul className="mt-9 grid gap-3 text-sm text-[#486259] sm:grid-cols-2">
                {["Credible instant prices for standard shapes", "Technical review for apex and gable", "VAT included in every displayed price", "Samples linked to the exact colourway"].map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a36d2d]" />{item}</li>)}
              </ul>
            </div>
          </div>
          <div className="relative min-h-[460px] lg:min-h-full">
            <Image src="/window-types/apex-hero.jpg" alt="Made-to-measure curtains fitted to a large apex window" fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#173c32]/45 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/20 bg-[#173c32]/80 p-5 text-white backdrop-blur-md sm:left-auto sm:max-w-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.17em] text-[#e6c38e]">Window-first design</div>
              <p className="mt-2 text-sm leading-6 text-white/80">Start with the architecture. We’ll only show headings, linings and tracks that suit it.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6b32]">Choose the shape first</div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">What kind of window are we dressing?</h2></div>
          <TrackedLink href="/shop-by-window" eventName="shop_by_window_clicked" eventData={{ placement: "homepage_grid" }} className="inline-flex items-center gap-2 text-sm font-semibold text-[#173c32]">View every window type <ArrowRight className="h-4 w-4" /></TrackedLink>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STOREFRONT_WINDOW_TYPES.slice(0, 6).map((windowType, index) => <WindowCard key={windowType.slug} windowType={windowType} priority={index < 2} />)}
        </div>
      </section>

      <section className="bg-[#173c32] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e2bc82]">One route, two safe outcomes</div><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">A price when it’s straightforward. A specialist when it isn’t.</h2></div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[{ icon: Ruler, title: "Tell us the window", text: "The selected window type controls the measurements and compatible choices." }, { icon: Sparkles, title: "Build the curtain", text: "Choose heading, synthetic test fabric, lining and construction." }, { icon: ShieldCheck, title: "Price or review", text: "Rectangular jobs can price instantly. Specialist shapes are held for technical approval." }].map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-[26px] border border-white/12 bg-white/6 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9aa67] text-[#173c32]"><Icon className="h-5 w-5" /></div><div className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">0{index + 1}</div><h3 className="mt-2 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/65">{text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-[30px] bg-[#e8dfd2] p-8 sm:p-10"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b6130]">Already have a fabric in mind?</div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Explore colourways without losing your window.</h2><p className="mt-4 max-w-lg text-base leading-7 text-[#587067]">Browse test FabricSpec records, save exact samples and return to the same configuration later.</p><TrackedLink href="/fabrics" eventName="shop_by_fabric_clicked" eventData={{ placement: "homepage_fabric" }} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold">Browse fabrics <ArrowRight className="h-4 w-4" /></TrackedLink></article>
        <article className="rounded-[30px] bg-[#d9aa67] p-8 sm:p-10"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5f431f]">Apex, triangular or gable?</div><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Start with measurements and photographs.</h2><p className="mt-4 max-w-lg text-base leading-7 text-[#3d4e48]">You can prepare a provisional specification, but manufacture remains blocked until technical review.</p><TrackedLink href="/configure?window=apex-window" eventName="specialist_journey_started" eventData={{ placement: "homepage" }} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#173c32] px-5 py-3 text-sm font-semibold text-white">Start specialist review <ArrowRight className="h-4 w-4" /></TrackedLink></article>
      </section>
    </main>
  );
}
