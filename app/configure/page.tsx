import type { Metadata } from "next";
import CurtainConfigurator from "@/components/configurator/CurtainConfigurator";

export const metadata: Metadata = { title: "Configure Made-to-Measure Curtains", description: "Choose a window type, measurements, heading, fabric, lining and construction for an instant staging price or specialist review." };

export default async function ConfigurePage({ searchParams }: { searchParams: Promise<{ window?: string; fabric?: string }> }) {
  const query = await searchParams;
  return <main className="bg-[#f7f3ec] px-4 py-10 text-[#173c32] sm:px-6 lg:px-8 lg:py-16"><CurtainConfigurator initialWindow={query.window} initialFabric={query.fabric} /></main>;
}
