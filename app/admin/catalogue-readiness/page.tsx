"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Gate = { id: string; state: "PASS" | "FAIL" | "UNKNOWN"; detail: string };
type Report = {
  supplierId: string;
  supplierName: string;
  status: "READY_FOR_BULK_IMPORT" | "BLOCKED";
  intendedColourways: number;
  importedRecords: number;
  counts: { withImagery: number; withVerifiedPrice: number; withCurrentLifecycle: number };
  note: string;
  gates: Gate[];
};

export default function CatalogueReadinessPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState("Loading readiness evidence…");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/catalogue-readiness", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load readiness evidence");
        return body;
      })
      .then((body) => {
        if (!active) return;
        setReports(body.reports ?? []);
        setMessage("");
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Could not load readiness evidence"); });
    return () => { active = false; };
  }, []);

  return <main className="min-h-screen bg-[#102c26] text-white"><div className="mx-auto max-w-6xl px-5 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#f1cf8a]">Private launch gate</p><h1 className="mt-3 text-4xl font-semibold">Supplier catalogue readiness</h1><p className="mt-3 max-w-3xl text-white/65">A full import stays blocked until imagery rights, current prices, lifecycle, merge-race protection and database-clock validation all carry evidence.</p></div><Link href="/admin" className="flex min-h-11 items-center rounded-full border border-white/15 px-5 py-3 text-sm">Admin home</Link></div>
    {message && <p role="status" className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">{message}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">{reports.map((report) => <article key={report.supplierId} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">{report.supplierName}</h2><span className={`rounded-full px-3 py-2 text-xs font-semibold ${report.status === "READY_FOR_BULK_IMPORT" ? "bg-emerald-300 text-emerald-950" : "bg-amber-200 text-amber-950"}`}>{report.status.replaceAll("_", " ")}</span></div>
      <p className="mt-3 text-sm leading-6 text-white/60">{report.note}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-black/20 p-4"><dt className="text-white/55">Current master</dt><dd className="mt-1 text-xl font-semibold">{report.importedRecords.toLocaleString("en-GB")}</dd></div><div className="rounded-2xl bg-black/20 p-4"><dt className="text-white/55">Intended scope</dt><dd className="mt-1 text-xl font-semibold">{report.intendedColourways.toLocaleString("en-GB")}</dd></div></dl>
      <ul className="mt-5 space-y-3">{report.gates.map((gate) => <li key={gate.id} className="rounded-2xl border border-white/10 p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{gate.id.replaceAll("_", " ")}</strong><span className={gate.state === "PASS" ? "text-emerald-300" : "text-amber-200"}>{gate.state}</span></div><p className="mt-2 text-sm leading-6 text-white/55">{gate.detail}</p></li>)}</ul>
    </article>)}</div>
    <p className="mt-8 text-sm text-white/45">This check is read-only. It cannot import fabrics or write to Shopify.</p>
  </div></main>;
}
