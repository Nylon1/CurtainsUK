"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Rate {
  region: string;
  parcelClass: string;
  enabled: boolean;
  grossAmountMinor: number | null;
  status: "AWAITING_OWNER_CONFIRMATION" | "VALIDATED" | "RETIRED";
  rateVersionId: string;
  effectiveFrom: string;
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function poundsToMinor(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, decimal = ""] = value.trim().split(".");
  const amount = Number.parseInt(whole, 10) * 100 + Number.parseInt(decimal.padEnd(2, "0") || "0", 10);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export default function ShippingRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("Loading staging delivery configuration…");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/shipping-rates", { cache: "no-store" });
    const body = await response.json() as { rates?: Rate[]; error?: string };
    if (!response.ok || !body.rates) throw new Error(body.error ?? "Unable to load delivery configuration");
    setRates(body.rates);
    setAmounts(Object.fromEntries(body.rates.map((rate) => [rate.rateVersionId, rate.grossAmountMinor === null ? "" : (rate.grossAmountMinor / 100).toFixed(2)])));
    setMessage("");
  }, []);

  useEffect(() => {
    void load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load delivery configuration"));
  }, [load]);

  async function save(rate: Rate, status: Rate["status"]) {
    const key = rate.rateVersionId;
    const grossAmountMinor = status === "VALIDATED" ? poundsToMinor(amounts[key] ?? "") : null;
    if (status === "VALIDATED" && grossAmountMinor === null) {
      setMessage("Enter a positive rate with no more than two decimal places.");
      return;
    }
    if (reason.trim().length < 3) {
      setMessage("Record a reason before changing a delivery rate.");
      return;
    }
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedCurrentRateVersionId: rate.rateVersionId,
          region: rate.region,
          parcelClass: rate.parcelClass,
          grossAmountMinor,
          status,
          reason: reason.trim(),
        }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Delivery rate was not saved");
      setReason("");
      await load();
      setMessage("A new append-only staging delivery-rate version was saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delivery rate was not saved");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-[#102c26] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#f1cf8a]">Private fulfilment control</p>
            <h1 className="mt-3 text-4xl font-semibold">UK staging delivery rates</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">Launch uses one regional rate (the Standard entry), without parcel measurements. Large/Oversize entries are retained for future configuration only. Specialist delivery is confirmed after review. Delivery stays separate from curtain goods. A blank or unconfirmed rate blocks checkout and is never treated as free.</p>
          </div>
          <Link href="/admin" className="flex min-h-11 items-center rounded-full border border-white/15 px-5 py-3 text-sm">Admin home</Link>
        </div>

        <label htmlFor="shipping-reason" className="mt-8 block text-sm font-medium">Change reason</label>
        <input id="shipping-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3" placeholder="Required for the immutable audit trail" />
        {message && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">{message}</p>}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rates.map((rate) => (
            <article key={rate.rateVersionId} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[#f1cf8a]">{label(rate.region)}</p>
              <h2 className="mt-2 text-xl font-semibold">{label(rate.parcelClass)}</h2>
              <p className="mt-2 text-xs text-white/55">{label(rate.status)}</p>
              <label className="mt-4 block text-sm" htmlFor={`rate-${rate.rateVersionId}`}>VAT-inclusive delivery (£)</label>
              <input id={`rate-${rate.rateVersionId}`} inputMode="decimal" value={amounts[rate.rateVersionId] ?? ""} onChange={(event) => setAmounts((current) => ({ ...current, [rate.rateVersionId]: event.target.value }))} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/15 px-4 py-3" placeholder="Awaiting owner confirmation" />
              <div className="mt-4 grid gap-2">
                <button type="button" disabled={busy === rate.rateVersionId} onClick={() => void save(rate, "VALIDATED")} className="min-h-11 rounded-full bg-[#f1cf8a] px-4 py-3 font-semibold text-[#102c26]">Validate staging rate</button>
                <button type="button" disabled={busy === rate.rateVersionId} onClick={() => void save(rate, "AWAITING_OWNER_CONFIRMATION")} className="min-h-11 rounded-full border border-white/15 px-4 py-3 text-sm">Mark awaiting confirmation</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
