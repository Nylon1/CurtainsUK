"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, PackageOpen, Search, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import type { CustomerSafeFabricProjection } from "@/lib/fabric-master/types";
import { trackStorefrontEvent } from "@/lib/storefront/analytics";

const SAMPLE_STORAGE_KEY = "curtainsuk_staging_samples_v1";

export interface SavedSample {
  fabricId: string;
  supplier?: string;
  brand?: string;
  design: string;
  colour: string;
  windowSlug?: string;
}

function saveSample(sample: SavedSample) {
  const current = JSON.parse(localStorage.getItem(SAMPLE_STORAGE_KEY) ?? "[]") as SavedSample[];
  const existing = current.find((item) => item.fabricId === sample.fabricId);
  if (existing && sample.windowSlug) existing.windowSlug = sample.windowSlug;
  else if (!existing) current.push(sample);
  localStorage.setItem(SAMPLE_STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new Event("curtainsuk:samples-updated"));
}

function compositionLabel(fabric: CustomerSafeFabricProjection) {
  return fabric.composition.map((part) => `${part.percentage}% ${part.material}`).join(", ");
}

function repeatLabel(fabric: CustomerSafeFabricProjection) {
  if (fabric.patternMatchType === "RANDOM_MATCH") return "No pattern repeat";
  if (fabric.verticalRepeatMm === null) return "Repeat pending";
  return `${fabric.verticalRepeatMm / 10} cm vertical repeat`;
}

export default function FabricBrowser({ fabrics, windowSlug }: { fabrics: CustomerSafeFabricProjection[]; windowSlug?: string }) {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return fabrics;
    return fabrics.filter((fabric) => [fabric.supplier, fabric.brand, fabric.collection, fabric.design, fabric.colour].some((value) => value.toLowerCase().includes(search)));
  }, [fabrics, query]);

  function handleSample(fabricId: string) {
    const fabric = fabrics.find((item) => item.id === fabricId);
    if (!fabric) return;
    saveSample({ fabricId, supplier: fabric.supplier, brand: fabric.brand, design: fabric.design, colour: fabric.colour, windowSlug });
    setSaved((items) => Array.from(new Set([...items, fabricId])));
    trackStorefrontEvent("sample_ordered_intended", { fabric_id: fabric.id, colour: fabric.colour, window_type: windowSlug ?? "unset" });
  }

  return (
    <div>
      <label className="mx-auto flex max-w-lg items-center gap-3 rounded-full border border-[#173c32]/12 bg-white px-5 py-3 shadow-sm">
        <Search className="h-4 w-4 text-[#8d6b42]" />
        <span className="sr-only">Search supplier fabrics</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by design, colour or collection" className="w-full bg-transparent text-sm outline-none placeholder:text-[#80918b]" />
      </label>
      <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((fabric) => (
          <article key={fabric.id} className="overflow-hidden rounded-[26px] border border-[#173c32]/10 bg-white shadow-[0_12px_40px_rgba(23,60,50,0.07)]">
            <div className="relative aspect-square overflow-hidden bg-[#e8dfd2]">
              {fabric.imageReferences[0] ? <Image src={fabric.imageReferences[0]} alt={`${fabric.design} in ${fabric.colour} by ${fabric.brand}`} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" /> : <div className="flex h-full items-center justify-center px-8 text-center text-xs font-semibold uppercase tracking-[0.15em] text-[#60736b]">Authorised image pending</div>}
            </div>
            <div className="p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#996a31]">{fabric.collection}</div>
              <h2 className="mt-2 text-xl font-semibold">{fabric.design}</h2>
              <p className="text-sm font-medium text-[#5b7169]">{fabric.colour}</p>
              <p className="mt-2 text-xs font-semibold text-[#6f5a3e]">{fabric.availability}</p>
              <p className="mt-3 text-sm leading-6 text-[#6b7d76]">{fabric.brand} fabric linked to a verified supplier specification.</p>
              <dl className="mt-4 space-y-1 text-xs leading-5 text-[#64776f]">
                <div className="flex justify-between gap-3"><dt>Width</dt><dd>{fabric.usableWidthMm === null ? "To be confirmed" : `${fabric.usableWidthMm / 10} cm`}</dd></div>
                <div className="flex justify-between gap-3"><dt>Repeat</dt><dd>{repeatLabel(fabric)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Composition</dt><dd className="text-right">{compositionLabel(fabric)}</dd></div>
              </dl>
              <div className="mt-5 grid gap-2">
                <button disabled={!fabric.sampleAvailable} onClick={() => handleSample(fabric.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#173c32]/15 px-4 text-sm font-semibold hover:border-[#173c32]/35 disabled:cursor-not-allowed disabled:opacity-45"><PackageOpen className="h-4 w-4" />{saved.includes(fabric.id) ? <><Check className="h-4 w-4" /> Saved</> : fabric.sampleAvailable ? "Order Sample" : "Sample unavailable"}</button>
                <Link href={`/configure?${new URLSearchParams({ ...(windowSlug ? { window: windowSlug } : {}), fabric: fabric.id })}`} onClick={() => trackStorefrontEvent("fabric_selected", { fabric_id: fabric.id, colour: fabric.colour, placement: "fabric_browser" })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#173c32] px-4 text-sm font-semibold text-white"><ShoppingBag className="h-4 w-4" /> Use This Fabric</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && <p className="py-16 text-center text-sm text-[#6b7d76]">No pilot fabrics match that search.</p>}
    </div>
  );
}

export { SAMPLE_STORAGE_KEY };
