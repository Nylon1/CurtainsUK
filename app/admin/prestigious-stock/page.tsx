"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AdminFabric = {
  id: string;
  design: string;
  colour: string;
  sku: string;
  record: {
    standardTradePriceExVat: { amountMinor: number } | null;
    cutTradePriceExVat: { amountMinor: number } | null;
    totalFreeStockMetres: number | null;
    batches: Array<{ batchReference: string; usableMetres: number; pieces: number }>;
    nextDueDate: string | null;
    nextDueMetres: number | null;
    verifiedAt: string | null;
    notes: string | null;
    priceVerificationStatus: string;
  };
  evaluation: { internalState: string; customerState: string; stale: boolean } | null;
};

const empty = { totalFreeStockMetres: "", batchReference: "", selectedBatchMetres: "", pieces: "", nextDueDate: "", nextDueMetres: "", standardPrice: "", cutPrice: "", notes: "" };
const money = (minor: number | undefined) => minor === undefined ? "Not verified" : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(minor / 100);
const numberOrNull = (value: string) => value.trim() === "" ? null : Number(value);

export default function PrestigiousStockCheckPage() {
  const [fabrics, setFabrics] = useState<AdminFabric[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [requiredMetres, setRequiredMetres] = useState("10");
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const selected = useMemo(() => fabrics.find((fabric) => fabric.id === selectedId), [fabrics, selectedId]);

  async function load() {
    const response = await fetch(`/api/admin/prestigious-stock?requiredMetres=${encodeURIComponent(requiredMetres)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the protected stock workspace");
    const data = await response.json();
    setFabrics(data.fabrics);
    setSelectedId((current) => current || data.fabrics[0]?.id || "");
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/prestigious-stock?requiredMetres=10", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the protected stock workspace");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setFabrics(data.fabrics);
        setSelectedId(data.fabrics[0]?.id || "");
      })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("Saving staging verification…");
    const response = await fetch("/api/admin/prestigious-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fabricSpecId: selectedId,
        totalFreeStockMetres: numberOrNull(form.totalFreeStockMetres),
        batchReference: form.batchReference || null,
        selectedBatchMetres: numberOrNull(form.selectedBatchMetres),
        pieces: numberOrNull(form.pieces),
        nextDueDate: form.nextDueDate || null,
        nextDueMetres: numberOrNull(form.nextDueMetres),
        standardTradePriceExVatMinor: form.standardPrice ? Math.round(Number(form.standardPrice) * 100) : null,
        cutTradePriceExVatMinor: form.cutPrice ? Math.round(Number(form.cutPrice) * 100) : null,
        notes: form.notes || null,
        verifiedAt: new Date().toISOString(),
      }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not save"); return; }
    setMessage("Verification appended to private supplier history. Approval is still required; no supplier or Shopify action was taken.");
    await load();
  }

  return <main className="min-h-screen bg-[#102c26] text-white"><div className="mx-auto max-w-6xl px-5 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#f1cf8a]">Internal staging tool</p><h1 className="mt-3 text-4xl font-semibold">Prestigious Stock Check</h1><p className="mt-3 max-w-2xl text-white/65">Record a normal Webtex verification. Credentials, cookies and session data are never captured.</p></div><div className="flex gap-3"><Link href="/admin" className="rounded-full border border-white/15 px-5 py-3 text-sm">Admin home</Link><a href="https://www.prestigiousonline.co.uk/webtex/Content/StockEnquiry/Default.aspx" target="_blank" rel="noreferrer" className="rounded-full bg-[#f1cf8a] px-5 py-3 text-sm font-semibold text-[#102c26]">Open Prestigious Webtex</a></div></div>
    <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><label className="block text-sm text-white/70">Design, colour or SKU<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#173c32] px-4 py-3">{fabrics.map((fabric) => <option key={fabric.id} value={fabric.id}>{fabric.design} — {fabric.colour} ({fabric.sku})</option>)}</select></label><label className="mt-4 block text-sm text-white/70">Required curtain metres<input type="number" min="0.1" step="0.1" value={requiredMetres} onChange={(e) => setRequiredMetres(e.target.value)} onBlur={() => load().catch((error) => setMessage(error.message))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" /></label>
        {selected && <dl className="mt-6 space-y-3 rounded-2xl bg-black/20 p-5 text-sm"><div className="flex justify-between"><dt>Last standard price ex VAT</dt><dd>{money(selected.record.standardTradePriceExVat?.amountMinor)}</dd></div><div className="flex justify-between"><dt>Last cut price ex VAT</dt><dd>{money(selected.record.cutTradePriceExVat?.amountMinor)}</dd></div><div className="flex justify-between"><dt>Last stock state</dt><dd>{selected.evaluation?.internalState ?? "Not evaluated"}</dd></div><div className="flex justify-between"><dt>Customer state</dt><dd>{selected.evaluation?.customerState ?? "Availability to be confirmed"}</dd></div><div className="flex justify-between"><dt>Last verified</dt><dd>{selected.record.verifiedAt ? new Date(selected.record.verifiedAt).toLocaleString("en-GB") : "Never"}</dd></div></dl>}
      </section>
      <form onSubmit={save} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-semibold">Record manual verification</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{[
        ["Total free stock (m)", "totalFreeStockMetres"], ["Batch reference", "batchReference"], ["Metres in selected batch", "selectedBatchMetres"], ["Pieces", "pieces"], ["Next-due date", "nextDueDate"], ["Next-due metres", "nextDueMetres"], ["Standard price ex VAT (£)", "standardPrice"], ["Cut price ex VAT (£)", "cutPrice"],
      ].map(([label, key]) => <label key={key} className="text-sm text-white/70">{label}<input type={key === "nextDueDate" ? "date" : key === "batchReference" ? "text" : "number"} min={key === "batchReference" ? undefined : "0"} step={key.includes("Price") ? "0.01" : "0.1"} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" /></label>)}</div><label className="mt-4 block text-sm text-white/70">Notes<textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" /></label><button type="submit" disabled={!selectedId} className="mt-5 rounded-full bg-[#f1cf8a] px-5 py-3 font-semibold text-[#102c26] disabled:opacity-50">Append supplier observation</button>{message && <p role="status" className="mt-4 text-sm text-[#f1cf8a]">{message}</p>}<p className="mt-4 text-xs text-white/45">Observations are append-only and remain RAW_SHADOW/VALIDATED until separately approved. Notes are not currently persisted.</p></form>
    </div>
  </div></main>;
}
