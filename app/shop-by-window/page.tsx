import type { Metadata } from "next";
import WindowCard from "@/components/storefront/WindowCard";
import { STOREFRONT_WINDOW_TYPES } from "@/lib/storefront/window-catalog";

export const metadata: Metadata = {
  title: "Shop Curtains by Window Type",
  description: "Choose standard, bay, apex, triangular, gable, tall, door or unusual windows before selecting your curtain specification.",
};

export default function ShopByWindowPage() {
  return (
    <main className="bg-[#f7f3ec] text-[#173c32]">
      <section className="border-b border-[#173c32]/10 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#996a31]">Shop by window</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Start with the shape, not the fabric</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#567067]">Your window determines the measurements, track, compatible headings and whether an instant price is safe. Choose the closest match below.</p>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STOREFRONT_WINDOW_TYPES.map((windowType, index) => <WindowCard key={windowType.slug} windowType={windowType} priority={index < 3} />)}
        </div>
        <div className="mt-10 rounded-3xl border border-[#173c32]/12 bg-white p-6 text-center sm:p-8">
          <h2 className="text-xl font-semibold">Not sure which shape you have?</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d746c]">Choose Awkward / Unusual Window and begin with photographs and approximate measurements. Nothing enters manufacture without review.</p>
        </div>
      </section>
    </main>
  );
}
