"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PRESTIGIOUS_FILE_MAPPING_V1, PRESTIGIOUS_PORTAL_EXPORT_MAPPING_V1, SANDERSON_FILE_MAPPING_V1 } from "@/lib/supplier-import/mapping-profiles";
import type { SupplierBulkApplyResult, SupplierImportPreview } from "@/lib/supplier-import/types";

const profiles = [PRESTIGIOUS_FILE_MAPPING_V1, PRESTIGIOUS_PORTAL_EXPORT_MAPPING_V1, SANDERSON_FILE_MAPPING_V1];

function visible(value: unknown) {
  if (value === null || value === undefined) return "unknown";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function SupplierImportsPage() {
  const [profileId, setProfileId] = useState(profiles[0].mapping_id);
  const [mappingJson, setMappingJson] = useState(JSON.stringify(profiles[0], null, 2));
  const [format, setFormat] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SupplierImportPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const counts = useMemo(() => preview?.summary, [preview]);

  function chooseProfile(id: string) {
    const profile = profiles.find((item) => item.mapping_id === id) ?? profiles[0];
    setProfileId(profile.mapping_id);
    setMappingJson(JSON.stringify(profile, null, 2));
    setPreview(null);
    setConfirmed(false);
  }

  function formData() {
    if (!file) throw new Error("Choose a supplier file first.");
    const data = new FormData();
    data.set("file", file);
    data.set("mapping_json", mappingJson);
    if (format) data.set("format", format);
    return data;
  }

  async function previewImport() {
    setWorking(true); setMessage("Parsing and validating private supplier data…"); setConfirmed(false);
    try {
      const response = await fetch("/api/admin/supplier-imports/preview", { method: "POST", body: formData() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "SUPPLIER_IMPORT_PREVIEW_FAILED");
      setPreview(data.preview); setMessage("Preview ready. Review every change before applying.");
    } catch (error) {
      setPreview(null); setMessage(error instanceof Error ? error.message : "SUPPLIER_IMPORT_PREVIEW_FAILED");
    } finally { setWorking(false); }
  }

  async function applyImport() {
    if (!preview || !confirmed) return;
    setWorking(true); setMessage("Appending supplier observations…");
    try {
      const data = formData();
      data.set("preview_hash", preview.preview_hash);
      data.set("preview_generated_at", preview.generated_at);
      const response = await fetch("/api/admin/supplier-imports/apply", { method: "POST", body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "SUPPLIER_IMPORT_APPLY_FAILED");
      const result = body.result as SupplierBulkApplyResult;
      setMessage(`Append complete: ${result.appended} observations, ${result.invalid_retained_for_audit} invalid records retained for audit, 0 Shopify writes.`);
      setConfirmed(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "SUPPLIER_IMPORT_APPLY_FAILED");
    } finally { setWorking(false); }
  }

  return <main className="min-h-screen bg-[#102c26] text-white"><div className="mx-auto max-w-7xl px-5 py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[#f1cf8a]">Private supplier operations</p><h1 className="mt-3 text-4xl font-semibold">Bulk supplier import</h1><p className="mt-3 max-w-3xl text-white/60">Preview CSV, XLS, XLSX, PDF or portal exports against durable supplier history. Apply appends shadow observations only; Shopify and automatic approval remain disabled.</p></div><div className="flex gap-3"><Link href="/admin" className="rounded-full border border-white/15 px-5 py-3 text-sm">Admin home</Link><Link href="/admin/supplier-intelligence" className="rounded-full bg-[#f1cf8a] px-5 py-3 text-sm font-semibold text-[#102c26]">Sync health</Link></div></div>

    <section className="mt-8 grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 lg:grid-cols-2">
      <div className="space-y-5"><label className="block text-sm text-white/60">Mapping profile<select value={profileId} onChange={(event) => chooseProfile(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#102c26] px-4 py-3 text-white">{profiles.map((profile) => <option key={profile.mapping_id} value={profile.mapping_id}>{profile.source_name}</option>)}</select></label><label className="block text-sm text-white/60">File format<select value={format} onChange={(event) => { setFormat(event.target.value); setPreview(null); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#102c26] px-4 py-3 text-white"><option value="">Detect from filename</option><option>CSV</option><option>XLS</option><option>XLSX</option><option>PDF</option><option>PORTAL_EXPORT</option></select></label><label className="block text-sm text-white/60">Supplier file<input type="file" accept=".csv,.tsv,.xls,.xlsx,.xlsm,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3" /></label><button type="button" disabled={working || !file} onClick={previewImport} className="rounded-full bg-[#f1cf8a] px-6 py-3 font-semibold text-[#102c26] disabled:opacity-40">Preview and validate</button></div>
      <label className="block text-sm text-white/60">Field mapping JSON<textarea value={mappingJson} onChange={(event) => { setMappingJson(event.target.value); setPreview(null); }} rows={18} spellCheck={false} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white/80" /><span className="mt-2 block text-xs text-white/40">Mappings define source columns and transforms only. They cannot execute code.</span></label>
    </section>

    {message && <p role="status" className="mt-6 rounded-2xl border border-[#f1cf8a]/20 bg-[#f1cf8a]/10 p-4 text-sm text-[#f1cf8a]">{message}</p>}

    {counts && <><div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(counts).filter(([key]) => key !== "source_rows").map(([key, value]) => <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="text-2xl font-semibold text-[#f1cf8a]">{value}</div><div className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">{key.replaceAll("_", " ")}</div></div>)}</div>
      <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-black/20 text-white/50"><tr><th className="p-4">Rows</th><th className="p-4">SKU</th><th className="p-4">Action</th><th className="p-4">Lifecycle</th><th className="p-4">Differences</th><th className="p-4">Validation</th></tr></thead><tbody>{preview!.rows.map((row, index) => <tr key={`${row.supplier_sku ?? "invalid"}-${index}`} className="border-t border-white/10 align-top"><td className="p-4">{row.source_rows.join(", ")}</td><td className="p-4 font-medium">{row.supplier_sku ?? "Missing"}</td><td className="p-4">{row.action}</td><td className="p-4">{row.lifecycle_transition}</td><td className="p-4"><ul className="space-y-1">{row.diff.map((item) => <li key={item.field}><span className="text-white/50">{item.field}:</span> {visible(item.before)} → {visible(item.after)}</li>)}</ul></td><td className="p-4">{row.errors.length ? <ul className="space-y-1 text-amber-200">{row.errors.map((error) => <li key={error}>{error}</li>)}</ul> : "Valid"}</td></tr>)}</tbody></table></div></section>
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6"><label className="flex items-start gap-3 text-sm text-white/70"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" /><span>I reviewed the source, mapping, lifecycle transitions and validation results. Apply these records to private append-only shadow history. This does not approve them or write Shopify.</span></label><button type="button" disabled={working || !confirmed} onClick={applyImport} className="mt-5 rounded-full bg-[#f1cf8a] px-6 py-3 font-semibold text-[#102c26] disabled:opacity-40">Bulk apply to shadow history</button></section></>}
  </div></main>;
}
