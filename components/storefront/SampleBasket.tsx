"use client";

import Link from "next/link";
import { PackageOpen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SAMPLE_STORAGE_KEY, type SavedSample } from "@/components/storefront/FabricBrowser";

export default function SampleBasket() {
  const [samples, setSamples] = useState<SavedSample[]>([]);
  const [project, setProject] = useState("");
  const load = useCallback(() => setSamples(JSON.parse(localStorage.getItem(SAMPLE_STORAGE_KEY) ?? "[]") as SavedSample[]), []);
  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0);
    window.addEventListener("curtainsuk:samples-updated", load);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("curtainsuk:samples-updated", load);
    };
  }, [load]);
  function remove(fabricId: string) {
    const next = samples.filter((item) => item.fabricId !== fabricId);
    setSamples(next);
    localStorage.setItem(SAMPLE_STORAGE_KEY, JSON.stringify(next));
  }
  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_0.7fr]">
      <section className="rounded-[28px] bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Your exact colourways</h2>
        {!samples.length ? <div className="mt-8 rounded-2xl bg-[#f7f3ec] p-8 text-center"><PackageOpen className="mx-auto h-7 w-7 text-[#a36d2d]" /><p className="mt-3 text-sm text-[#64776f]">No samples saved yet.</p><Link href="/fabrics" className="mt-4 inline-flex rounded-full bg-[#173c32] px-5 py-3 text-sm font-semibold text-white">Browse test fabrics</Link></div> : <div className="mt-5 divide-y divide-[#173c32]/10">{samples.map((sample) => <div key={sample.fabricId} className="flex items-center justify-between gap-4 py-4"><div><div className="font-semibold">{sample.design} — {sample.colour}</div><div className="mt-1 text-xs text-[#708079]">{sample.brand || sample.supplier}{sample.windowSlug ? ` · saved for ${sample.windowSlug}` : ""}</div></div><button onClick={() => remove(sample.fabricId)} aria-label={`Remove ${sample.design} ${sample.colour}`} className="rounded-full border border-[#173c32]/10 p-2"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
      </section>
      <aside className="rounded-[28px] bg-[#173c32] p-6 text-white sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e2bc82]">Staging sample flow</div>
        <h2 className="mt-3 text-2xl font-semibold">Keep the project connected</h2>
        <label className="mt-6 block text-sm font-medium">Project or room name<input value={project} onChange={(event) => setProject(event.target.value)} placeholder="e.g. Sitting room bay" className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40" /></label>
        <p className="mt-5 text-sm leading-6 text-white/65">Live sample price, postage, payment and fulfilment remain intentionally disconnected. Saved samples remain in this browser only.</p>
        {samples[0] && <Link href={`/configure?${new URLSearchParams({ fabric: samples[0].fabricId, ...(samples[0].windowSlug ? { window: samples[0].windowSlug } : {}) })}`} className="mt-6 inline-flex rounded-full bg-[#d9aa67] px-5 py-3 text-sm font-semibold text-[#173c32]">Resume curtain journey</Link>}
      </aside>
    </div>
  );
}
