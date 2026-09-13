"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
export default function DailyStock() {
  const [status, setStatus] = useState("Loading daily snapshot status...");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void fetch("/api/admin/daily-stock", { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        setStatus(
          r.ok
            ? JSON.stringify(b, null, 2)
            : "Sign in with staging staff access to view daily stock.",
        );
      })
      .catch(() => setStatus("Daily stock status is temporarily unavailable."));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/daily-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configurationId: data.get("configurationId"),
          orderReference: data.get("orderReference"),
          confirmedOrder: data.get("confirmedOrder") === "on",
        }),
      });
      const b = await r.json();
      setMessage(
        r.ok
          ? b.reused
            ? "Confirmed usage already recorded; no duplicate deduction."
            : "Confirmed usage recorded from the immutable configuration."
          : b.error,
      );
    } catch {
      setMessage(
        "Confirmation pending. Retry the same order and configuration references.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl">Daily stock and confirmed usage</h1>
      <Link href="/admin/reviews">Review queue</Link>
      <p className="my-4">
        New ordinary Bay orders use instant pricing. Only exceptions and
        specialist projects need review. Draft Orders, sample requests and
        unconfirmed enquiries do not consume stock.
      </p>
      <pre className="overflow-auto rounded bg-slate-100 p-4 text-xs">
        {status}
      </pre>
      <h2 className="my-4 text-xl">Record a confirmed order</h2>
      <p>
        Confirm only an actual order, using its Shopify Order ID. Do not enter
        an unpaid Draft Order. Metres come from the immutable configuration;
        this never places a supplier order.
      </p>
      <form onSubmit={submit} className="my-4 grid gap-4">
        <label>
          Configuration ID
          <input
            className="block w-full border p-2"
            name="configurationId"
            required
          />
        </label>
        <label>
          Shopify Order reference
          <input
            className="block w-full border p-2"
            name="orderReference"
            placeholder="gid://shopify/Order/..."
            required
          />
        </label>
        <label>
          <input type="checkbox" name="confirmedOrder" required /> I have
          verified this is a confirmed order, not an unpaid Draft Order.
        </label>
        <button className="rounded bg-slate-900 p-3 text-white" disabled={busy}>
          Record confirmed usage
        </button>
      </form>
      <p role="status">{message}</p>
    </main>
  );
}
