import type { Metadata } from "next";
import SampleBasket from "@/components/storefront/SampleBasket";

export const metadata: Metadata = { title: "Curtain Fabric Samples", description: "Save multiple exact fabric colourways and resume your CurtainsUK window project later." };

export default function SamplesPage() {
  return <main className="bg-[#f7f3ec] px-4 py-16 text-[#173c32] sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto max-w-5xl"><div className="max-w-3xl"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#996a31]">Samples</div><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">See the exact colour at home</h1><p className="mt-5 text-lg leading-8 text-[#587168]">Save multiple colourways and keep them attached to your window journey. Pricing and postage remain configurable until the live sample policy is approved.</p></div><div className="mt-10"><SampleBasket /></div></div></main>;
}
