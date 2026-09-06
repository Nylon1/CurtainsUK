import type { Metadata } from "next";
import FabricBrowser from "@/components/storefront/FabricBrowser";

export const metadata: Metadata = { title: "Shop Curtain Fabrics", description: "Browse staging FabricSpec colourways, order an exact sample and use the selected fabric in a made-to-measure curtain configuration." };

export default function FabricsPage() {
  return <main className="bg-[#f7f3ec] px-4 py-16 text-[#173c32] sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto max-w-[1440px]"><div className="mx-auto max-w-3xl text-center"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#996a31]">Shop by fabric</div><h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">Colourways tied to a real specification</h1><p className="mt-5 text-lg leading-8 text-[#587168]">These four synthetic records prove the FabricSpec journey. They are not Prestigious catalogue imports and are blocked from Google feeds.</p></div><div className="mt-12"><FabricBrowser /></div></div></main>;
}
