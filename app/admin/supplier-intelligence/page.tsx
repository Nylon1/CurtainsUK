"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SupplierHealthReport } from "@/lib/supplier-intelligence/types";



function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-3xl font-semibold text-[#f1cf8a]">{value}</div><div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/55">{label}</div></div>;
}

function ChangeList({ title, items }: { title: string; items: SupplierHealthReport["price_increases"] }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-semibold">{title}</h2>{items.length ? <ul className="mt-4 space-y-3 text-sm">{items.map((item) => <li key={`${title}-${item.current_snapshot_id}`} className="rounded-xl bg-black/20 p-3"><strong>{item.supplier_sku}</strong><span className="ml-2 text-white/55">{String(item.previous_value ?? "unknown")} → {String(item.current_value ?? "unknown")}</span></li>)}</ul> : <p className="mt-4 text-sm text-white/45">No changes detected.</p>}</section>;
}

export default function SupplierIntelligencePage() {
  const [supplierId,setSupplierId] = useState('prestigious-textiles');
  const [report, setReport] = useState<SupplierHealthReport | null>(null);
  const [message, setMessage] = useState("Loading supplier health…");
  const [skuFilter, setSkuFilter] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    const response = await fetch(`/api/admin/supplier-intelligence/health?supplier=${encodeURIComponent(supplierId)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "SUPPLIER_HEALTH_UNAVAILABLE");
    setReport(data.report);
    setMessage("");
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/supplier-intelligence/health?supplier=${encodeURIComponent(supplierId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "SUPPLIER_HEALTH_UNAVAILABLE");
        if (!cancelled) {
          setReport(data.report);
          setMessage("");
        }
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "SUPPLIER_HEALTH_UNAVAILABLE");
      });
    return () => { cancelled = true; };
  }, [supplierId]);

  async function decide(snapshotId: string, decision: "APPROVE" | "REJECT") {
    if (!reason.trim()) { setMessage("Enter an approval or rejection reason first."); return; }
    setMessage(`${decision === "APPROVE" ? "Approving" : "Rejecting"} snapshot…`);
    const response = await fetch("/api/admin/supplier-intelligence/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshotId, decision, reason }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "SUPPLIER_DECISION_FAILED"); return; }
    setReason("");
    setMessage("Decision recorded in append-only audit history.");
    await load();
  }

  const awaiting = useMemo(() => report?.awaiting_approval.filter((item) => item.supplier_sku.toLowerCase().includes(skuFilter.toLowerCase())) ?? [], [report, skuFilter]);

  return <main className="min-h-screen bg-[#102c26] text-white"><div className="mx-auto max-w-7xl px-5 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#f1cf8a]">Private supplier operations</p><h1 className="mt-3 text-4xl font-semibold">Supplier Sync Health</h1><p className="mt-3 max-w-3xl text-white/60">Shadow snapshots require validation and explicit staff approval. This screen does not write availability to Shopify.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin" className="rounded-full border border-white/15 px-5 py-3 text-sm">Admin home</Link><Link href="/admin/supplier-imports" className="rounded-full border border-white/15 px-5 py-3 text-sm">Bulk import</Link><Link href="/admin/prestigious-stock" className="rounded-full bg-[#f1cf8a] px-5 py-3 text-sm font-semibold text-[#102c26]">Stock verification</Link></div></div>

    {message && <p role="status" className="mt-6 rounded-2xl border border-[#f1cf8a]/20 bg-[#f1cf8a]/10 p-4 text-sm text-[#f1cf8a]">{message}</p>}

    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Metric label="Awaiting approval" value={report?.awaiting_approval_skus.length ?? "—"} />
      <Metric label="Price verification" value={report?.price_verification_required_skus.length ?? "—"} />
      <Metric label="Stale SKUs" value={report?.stale_skus.length ?? "—"} />
      <Metric label="Expired SKUs" value={report?.expired_skus.length ?? "—"} />
      <Metric label="Validation failures" value={report?.validation_failures.length ?? "—"} />
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-semibold">Run health</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-white/55">Last successful run</dt><dd>{report?.last_successful_run ? new Date(report.last_successful_run.completed_at).toLocaleString("en-GB") : "None"}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/55">Last failed run</dt><dd>{report?.last_failed_run ? new Date(report.last_failed_run.completed_at).toLocaleString("en-GB") : "None"}</dd></div></dl></section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-semibold">Drill-down</h2><label className="mt-4 block text-sm text-white/60">Supplier<select value={supplierId} onChange={(event) => {setSupplierId(event.target.value);setReport(null);}} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"><option value="prestigious-textiles">Prestigious Textiles</option><option value="sanderson-design-group">Sanderson Design Group</option></select></label><label className="mt-4 block text-sm text-white/60">Filter SKU<input value={skuFilter} onChange={(event) => setSkuFilter(event.target.value)} placeholder="e.g. 4269/147" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" /></label></section>
    </div>

    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-semibold">Approval queue</h2><label className="mt-5 block text-sm text-white/60">Decision reason<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" placeholder="Required and retained in the audit trail" /></label>{awaiting.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-white/45"><tr><th className="pb-3">SKU</th><th className="pb-3">Checked</th><th className="pb-3">Validation</th><th className="pb-3">Decision</th></tr></thead><tbody>{awaiting.map((item) => <tr key={item.snapshot_id} className="border-t border-white/10"><td className="py-4 font-medium">{item.supplier_sku}</td><td>{new Date(item.checked_at).toLocaleString("en-GB")}</td><td>{item.validation_status}</td><td><div className="flex gap-2"><button onClick={() => decide(item.snapshot_id, "APPROVE")} className="rounded-full bg-[#f1cf8a] px-4 py-2 font-semibold text-[#102c26]">Approve</button><button onClick={() => decide(item.snapshot_id, "REJECT")} className="rounded-full border border-white/15 px-4 py-2">Reject</button></div></td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-white/45">No matching snapshots awaiting approval.</p>}</section>

    {report && <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3"><ChangeList title="Price increases" items={report.price_increases} /><ChangeList title="Price decreases" items={report.price_decreases} /><ChangeList title="Newly low stock" items={report.newly_low_stock} /><ChangeList title="Newly unavailable" items={report.newly_unavailable} /><ChangeList title="Next-due changes" items={report.next_due_changes} /><ChangeList title="Newly discontinued" items={report.newly_discontinued} /></div>}
  </div></main>;
}
