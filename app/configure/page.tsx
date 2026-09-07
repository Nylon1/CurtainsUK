import type { Metadata } from "next";
import CurtainConfigurator from "@/components/configurator/CurtainConfigurator";
import type { CustomerSafeFabricProjection } from "@/lib/fabric-master/types";
import { buildDatabaseShopifyCatalogPayload } from "@/lib/storefront/shopify-database-contract";

export const metadata: Metadata = { title: "Configure Made-to-Measure Curtains", description: "Choose a window type, measurements, heading, fabric, lining and construction for an instant staging price or specialist review." };
export const dynamic = "force-dynamic";

export default async function ConfigurePage({ searchParams }: { searchParams: Promise<{ window?: string; fabric?: string }> }) {
  const [catalogue, query] = await Promise.all([buildDatabaseShopifyCatalogPayload(), searchParams]);
  const firstFabric = catalogue.fabrics[0];
  if (!firstFabric) return <main className="bg-[#f7f3ec] px-4 py-16 text-[#173c32]"><div role="alert" className="mx-auto max-w-2xl rounded-2xl bg-[#fde8e1] p-6 text-[#7e3f32]">No approved staging fabrics are available.</div></main>;
  const fabrics: [CustomerSafeFabricProjection, ...CustomerSafeFabricProjection[]] = [firstFabric, ...catalogue.fabrics.slice(1)];
  return <main className="bg-[#f7f3ec] px-4 py-10 text-[#173c32] sm:px-6 lg:px-8 lg:py-16"><CurtainConfigurator fabrics={fabrics} initialWindow={query.window} initialFabric={query.fabric} /></main>;
}
