"use client";

import Link from "next/link";
import { CURTAINSUK_REVIEW_EMAIL, EMAIL_EVIDENCE_STATES, type EmailEvidenceState } from "@/lib/storefront/email-evidence";
import { useCallback, useEffect, useState } from "react";
import {
  REVIEW_STATES,
  REVIEW_TRANSITIONS,
  isActionReason,
  parseReviewDetailResponse,
  parseReviewListResponse,
  reviewEndpoints,
  type AmendmentRequest,
  type CheckoutRequest,
  type JsonValue,
  type ReviewDetail,
  type ReviewListItem,
  type ReviewState,
  type TransitionRequest,
} from "./contracts";

type ReviewFilter = ReviewState | "ALL";

const CONTROL = "min-h-11 rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-base text-white outline-none transition focus:border-[#f1cf8a] focus:ring-2 focus:ring-[#f1cf8a]/30 disabled:cursor-not-allowed disabled:opacity-45";
const BUTTON = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#f1cf8a] focus:ring-offset-2 focus:ring-offset-[#102c26] disabled:cursor-not-allowed disabled:opacity-45";

const STATE_STYLE: Record<ReviewState, string> = {
  PENDING: "border-sky-200/30 bg-sky-300/10 text-sky-100",
  NEEDS_INFORMATION: "border-amber-200/30 bg-amber-300/10 text-amber-100",
  UNDER_REVIEW: "border-violet-200/30 bg-violet-300/10 text-violet-100",
  APPROVED: "border-emerald-200/30 bg-emerald-300/10 text-emerald-100",
  REJECTED: "border-red-200/30 bg-red-300/10 text-red-100",
  READY_FOR_CHECKOUT: "border-[#f1cf8a]/40 bg-[#f1cf8a]/15 text-[#f7dda5]",
};

function humanise(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatMoney(value: number | null, currency: "GBP" = "GBP") {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value / 100);
}


function statusLabel(error: unknown) {
  if (!(error instanceof Error)) return "Review workspace request failed";
  if (error.message === "REVIEW_RESUME_NOT_CONFIGURED") {
    return "The unpublished Dawn customer-resume URL is not configured; the request remains approved and was not made checkout-ready";
  }
  return error.message.replace(/^REVIEW_API_CONTRACT_INVALID:/, "Unexpected review-service response: ");
}

async function responseJson(response: Response) {
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `Review request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

function StatusPill({ state }: { state: ReviewState }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATE_STYLE[state]}`}>{humanise(state)}</span>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="border-t border-white/10 py-3 first:border-t-0"><dt className="text-xs uppercase tracking-[0.12em] text-white/45">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-white/90">{value ?? "Not recorded"}</dd></div>;
}

function Panel({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"><h2 className="text-xl font-semibold">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>}<div className="mt-5">{children}</div></section>;
}

function QueueItem({ item, selected, onSelect }: { item: ReviewListItem; selected: boolean; onSelect: () => void }) {
  const price = item.finalGrossPriceMinor ?? item.provisionalGrossPriceMinor;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-11 w-full rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#f1cf8a] ${selected ? "border-[#f1cf8a]/60 bg-[#f1cf8a]/10" : "border-white/10 bg-black/15 hover:bg-white/[0.06]"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2"><span className="font-semibold">{item.reference}</span><StatusPill state={item.reviewState} /></div>
      <p className="mt-2 text-sm text-white/75">{item.windowTypeLabel} · {item.fabric.design} {item.fabric.colour}</p>
      <p className="mt-1 text-xs text-white/45">{item.customerName || item.customerEmail} · {formatDate(item.submittedAt)}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60"><span>{humanise(item.pricingOutcome)}</span><span>{formatMoney(price)}</span><span>Evidence handled by email</span></div>
    </button>
  );
}

export default function ReviewDashboard() {
  const [filter, setFilter] = useState<ReviewFilter>("ALL");
  const [query, setQuery] = useState("");
  const [list, setList] = useState<ReviewListItem[]>([]);
  const [counts, setCounts] = useState<Record<ReviewState, number>>(() => Object.fromEntries(REVIEW_STATES.map((state) => [state, 0])) as Record<ReviewState, number>);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [listBusy, setListBusy] = useState(true);
  const [detailBusy, setDetailBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadList = useCallback(async (cursor: string | null = null, append = false) => {
    setListBusy(true);
    setError("");
    try {
      const response = await fetch(reviewEndpoints.list({ state: filter, query, cursor, limit: 30 }), { cache: "no-store" });
      const parsed = parseReviewListResponse(await responseJson(response));
      setList((current) => append ? [...current, ...parsed.reviews] : parsed.reviews);
      setCounts(parsed.counts);
      setNextCursor(parsed.nextCursor);
      if (!append) setSelectedId((current) => parsed.reviews.some((item) => item.requestId === current) ? current : parsed.reviews[0]?.requestId ?? "");
    } catch (caught) {
      setError(statusLabel(caught));
      if (!append) setList([]);
    } finally {
      setListBusy(false);
    }
  }, [filter, query]);

  const loadDetail = useCallback(async (requestId: string) => {
    if (!requestId) { setDetail(null); return; }
    setDetailBusy(true);
    setError("");
    try {
      const response = await fetch(reviewEndpoints.detail(requestId), { cache: "no-store" });
      setDetail(parseReviewDetailResponse(await responseJson(response)).review);
    } catch (caught) {
      setDetail(null);
      setError(statusLabel(caught));
    } finally {
      setDetailBusy(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadList(); }, query ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadList, query]);

  useEffect(() => { void loadDetail(selectedId); }, [loadDetail, selectedId]);

  const refresh = useCallback(async () => {
    await Promise.all([loadList(), selectedId ? loadDetail(selectedId) : Promise.resolve()]);
  }, [loadDetail, loadList, selectedId]);

  async function mutate(url: string, body: TransitionRequest | AmendmentRequest | CheckoutRequest | { state: EmailEvidenceState; reason: string; revisionId: string; expectedEventId: string | null }, success: string): Promise<unknown | null> {
    setActionBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await responseJson(response);
      if (payload && typeof payload === "object" && "analyticsEvent" in payload) {
        const event = payload.analyticsEvent;
        if (event && typeof event === "object" && "event" in event && event.event === "curtainsuk_review_approved") {
          const safeEvent = { event: "curtainsuk_review_approved", review_request_id: selectedId };
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push(safeEvent);
          window.dispatchEvent(new CustomEvent("curtainsuk:analytics", { detail: safeEvent }));
        }
      }
      setNotice(success);
      await refresh();
      return payload;
    } catch (caught) {
      setError(statusLabel(caught));
      return null;
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#102c26] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-xs uppercase tracking-[0.2em] text-[#f1cf8a]">Private curtain operations</p><h1 className="mt-3 text-4xl font-semibold">Technical review queue</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">Review customer projects, evidence and pricing revisions. Payment remains disabled; readiness is recorded for a later controlled checkout phase.</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/admin" className={`${BUTTON} border border-white/15 text-white hover:bg-white/5`}>Admin home</Link><button type="button" onClick={() => void refresh()} disabled={listBusy || detailBusy} className={`${BUTTON} bg-[#f1cf8a] text-[#102c26] hover:bg-[#f7dda5]`}>Refresh queue</button></div>
        </header>

        <div aria-live="polite" aria-atomic="true" className="mt-5">
          {notice && <p role="status" className="rounded-2xl border border-emerald-200/25 bg-emerald-300/10 p-4 text-sm text-emerald-100">{notice}</p>}
          {error && <p role="alert" className="rounded-2xl border border-red-200/25 bg-red-300/10 p-4 text-sm text-red-100">{error}. No review or payment state was changed.</p>}
        </div>

        <section aria-labelledby="review-filters" className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <h2 id="review-filters" className="sr-only">Review queue filters</h2>
          <label className="block text-sm font-medium text-white/70" htmlFor="review-search">Search reference, customer, SKU or window</label>
          <input id="review-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${CONTROL} mt-2 w-full`} placeholder="Search the private queue" />
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by review state">
            {(["ALL", ...REVIEW_STATES] as ReviewFilter[]).map((state) => <button key={state} type="button" aria-pressed={filter === state} onClick={() => setFilter(state)} className={`${BUTTON} shrink-0 border ${filter === state ? "border-[#f1cf8a] bg-[#f1cf8a]/15 text-[#f7dda5]" : "border-white/10 bg-black/15 text-white/70"}`}>{state === "ALL" ? `All (${Object.values(counts).reduce((sum, value) => sum + value, 0)})` : `${humanise(state)} (${counts[state]})`}</button>)}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.72fr)]">
          <aside aria-label="Review requests" className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Requests</h2>{listBusy && <span role="status" className="text-xs text-white/50">Loading…</span>}</div>
            <div className="mt-4 space-y-3">{list.map((item) => <QueueItem key={item.requestId} item={item} selected={selectedId === item.requestId} onSelect={() => setSelectedId(item.requestId)} />)}{!listBusy && list.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/50">No review requests match this filter.</p>}</div>
            {nextCursor && <button type="button" disabled={listBusy} onClick={() => void loadList(nextCursor, true)} className={`${BUTTON} mt-4 w-full border border-white/15 text-white`}>Load more requests</button>}
          </aside>

          <section aria-label="Selected review request" aria-busy={detailBusy}>
            {detailBusy && <div role="status" className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/60">Loading request detail…</div>}
            {!detailBusy && detail && <ReviewDetailWorkspace key={detail.requestId} detail={detail} actionBusy={actionBusy} mutate={mutate} />}
            {!detailBusy && !detail && <div className="rounded-3xl border border-dashed border-white/15 p-8 text-sm text-white/50">Choose a request to inspect its customer, configuration, evidence, pricing and audit history.</div>}
          </section>
        </div>
      </div>
    </main>
  );
}

function ReviewDetailWorkspace({ detail, actionBusy, mutate }: { detail: ReviewDetail; actionBusy: boolean; mutate: (url: string, body: TransitionRequest | AmendmentRequest | CheckoutRequest | { state: EmailEvidenceState; reason: string; revisionId: string; expectedEventId: string | null }, success: string) => Promise<unknown | null> }) {
  const latestRevision = detail.revisions.toSorted((left, right) => right.revisionNumber - left.revisionNumber)[0] ?? null;
  const [transitionState, setTransitionState] = useState<ReviewState | "">(REVIEW_TRANSITIONS[detail.reviewState][0] ?? "");
  const [transitionReason, setTransitionReason] = useState("");
  const [evidenceReason, setEvidenceReason] = useState("");
  const [emailState, setEmailState] = useState<EmailEvidenceState>("EVIDENCE_RECEIVED");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [pricingVersion, setPricingVersion] = useState(detail.pricing.pricingRuleVersion ?? detail.pricing.calculationVersion ?? "");
  const [specification, setSpecification] = useState(() => JSON.stringify(latestRevision?.specification ?? detail.configuration, null, 2));
  const [grossGbp, setGrossGbp] = useState(detail.pricing.finalPrice ? String(detail.pricing.finalPrice.grossAmountMinor / 100) : "");
  const [checkoutReason, setCheckoutReason] = useState("");
  const [reviewResumeUrl, setReviewResumeUrl] = useState("");
  const [reviewResumeStatus, setReviewResumeStatus] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const revision = detail.revisions.toSorted((left, right) => right.revisionNumber - left.revisionNumber)[0] ?? null;
    setTransitionState(REVIEW_TRANSITIONS[detail.reviewState][0] ?? "");
    setTransitionReason("");
    setEvidenceReason("");
    setAmendmentReason("");
    setPricingVersion(detail.pricing.pricingRuleVersion ?? detail.pricing.calculationVersion ?? "");
    setSpecification(JSON.stringify(revision?.specification ?? detail.configuration, null, 2));
    setGrossGbp(detail.pricing.finalPrice ? String(detail.pricing.finalPrice.grossAmountMinor / 100) : "");
    setCheckoutReason("");
    setFormError("");
  }, [detail]);

  const grossMinor = wholePoundsToMinor(grossGbp);
  const netMinor = grossMinor === null ? null : Math.round(grossMinor * 10_000 / 12_000);
  const vatMinor = grossMinor === null || netMinor === null ? null : grossMinor - netMinor;
  async function submitTransition(event: React.FormEvent) {
    event.preventDefault();
    if (!transitionState || !isActionReason(transitionReason)) { setFormError("Choose a permitted state and enter a reason of at least three characters."); return; }
    setFormError("");
    await mutate(reviewEndpoints.transition(detail.requestId), { toState: transitionState, reason: transitionReason.trim(), expectedState: detail.reviewState, latestRevisionId: latestRevision?.revisionId ?? null }, `Request moved to ${humanise(transitionState)}.`);
  }

  async function submitAmendment(event: React.FormEvent) {
    event.preventDefault();
    if (!latestRevision) { setFormError("A source revision is required before staff can amend this request."); return; }
    if (!isActionReason(amendmentReason) || !pricingVersion.trim() || netMinor === null || netMinor <= 0 || vatMinor === null || grossMinor === null) { setFormError("Enter a valid whole-pound VAT-inclusive price, specification, pricing version and reason."); return; }
    let parsed: Record<string, JsonValue>;
    try {
      const value = JSON.parse(specification) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      parsed = value as Record<string, JsonValue>;
    } catch {
      setFormError("The amended specification must be a valid JSON object.");
      return;
    }
    setFormError("");
    await mutate(reviewEndpoints.amend(detail.requestId), { specification: parsed, finalPrice: { netAmountMinor: netMinor, vatAmountMinor: vatMinor, grossAmountMinor: grossMinor, vatRateBasisPoints: 2000, currency: "GBP" }, pricingRuleVersion: pricingVersion.trim(), reason: amendmentReason.trim(), previousRevisionId: latestRevision.revisionId }, "Staff amendment and final price recorded as a new revision.");
  }

  async function prepareCheckout(event: React.FormEvent) {
    event.preventDefault();
    if (!latestRevision || detail.reviewState !== "APPROVED" || !detail.checkout.eligible || !isActionReason(checkoutReason)) { setFormError("Checkout readiness requires an approved request, an eligible final revision and a reason."); return; }
    setFormError("");
    const payload = await mutate(reviewEndpoints.checkout(detail.requestId), { reason: checkoutReason.trim(), expectedState: "APPROVED", revisionId: latestRevision.revisionId }, "Request marked ready for customer acceptance. No payment was taken.");
    const acceptance = payload && typeof payload === "object" && "customerAcceptance" in payload
      && payload.customerAcceptance && typeof payload.customerAcceptance === "object"
      ? payload.customerAcceptance as Record<string, unknown>
      : null;
    setReviewResumeUrl(typeof acceptance?.resumeUrl === "string" ? acceptance.resumeUrl : "");
    setReviewResumeStatus(typeof acceptance?.resumeUrlStatus === "string" ? acceptance.resumeUrlStatus : "BLOCKED_RESPONSE_INVALID");
  }

  async function copyReviewResumeLink() {
    if (!reviewResumeUrl) return;
    try {
      await navigator.clipboard.writeText(reviewResumeUrl);
      setReviewResumeStatus("COPIED");
    } catch {
      setReviewResumeStatus("COPY_FAILED");
    }
  }

  async function recordEmailEvidence(event: React.FormEvent) {
    event.preventDefault();
    if (!latestRevision || !isActionReason(evidenceReason)) return;
    await mutate(`/api/admin/reviews/${encodeURIComponent(detail.requestId)}/email-evidence`, { state: emailState, reason: evidenceReason.trim(), revisionId: latestRevision.revisionId, expectedEventId: detail.emailEvidence.latestEventId }, "Email evidence status recorded. Files remain outside CurtainsUK.");
  }

  return <div className="space-y-6">
    <Panel title={detail.reference} description={`Submitted ${formatDate(detail.submittedAt)} · updated ${formatDate(detail.updatedAt)}`}>
      <div className="flex flex-wrap items-center gap-3"><StatusPill state={detail.reviewState} /><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">{humanise(detail.pricingOutcome)}</span><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">{detail.availability.label}</span></div>
      <dl className="mt-5 grid gap-x-6 sm:grid-cols-2"><Field label="Request ID" value={detail.requestId} /><Field label="Configuration ID" value={detail.configurationId} /><Field label="Window" value={`${detail.windowTypeLabel} (${detail.windowTypeSlug})`} /><Field label="Supplier SKU" value={`${detail.fabric.supplierName} · ${detail.fabric.supplierSku}`} /></dl>
    </Panel>

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Customer"><dl><Field label="Name" value={detail.customer.name || "Not provided"} /><Field label="Email" value={<a className="underline underline-offset-4" href={`mailto:${detail.customer.email}`}>{detail.customer.email}</a>} /><Field label="Phone" value={detail.customer.phone || "Not provided"} /><Field label="Notes" value={detail.customer.notes || "None"} /></dl></Panel>
      <Panel title="Fabric & availability"><dl><Field label="Fabric" value={`${detail.fabric.design} — ${detail.fabric.colour}`} /><Field label="Brand / collection" value={[detail.fabric.brand, detail.fabric.collection].filter(Boolean).join(" · ") || "Not recorded"} /><Field label="Supplier / SKU" value={`${detail.fabric.supplierName} · ${detail.fabric.supplierSku}`} /><Field label="Customer-safe state" value={`${detail.availability.label} (${humanise(detail.availability.state)})`} /><Field label="Checked" value={formatDate(detail.availability.checkedAt)} /></dl></Panel>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Configuration"><dl><Field label="Measurement basis" value={detail.configuration.measurementBasis || "Specialist review"} /><Field label="Measurements" value={<pre className="whitespace-pre-wrap font-mono text-xs leading-5">{JSON.stringify(detail.configuration.measurements, null, 2)}</pre>} /><Field label="Heading" value={humanise(detail.configuration.heading)} /><Field label="Lining / interlining" value={`${humanise(detail.configuration.lining)} · ${humanise(detail.configuration.interlining)}`} /><Field label="Construction / stack" value={`${humanise(detail.configuration.construction)} · ${humanise(detail.configuration.stackDirection)}`} /><Field label="Fixing position" value={detail.configuration.fixingPosition || "Not recorded"} /><Field label="Shipping parcel class" value={detail.configuration.shippingParcelClass ? humanise(detail.configuration.shippingParcelClass) : "Required before checkout readiness"} /><Field label="Accessories" value={detail.configuration.accessories.length ? <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(detail.configuration.accessories, null, 2)}</pre> : "None"} /></dl></Panel>
      <Panel title="Pricing" description="Internal review values only. Supplier costs and margins are not part of this UI contract."><dl><Field label="Outcome" value={humanise(detail.pricing.outcome)} /><Field label="Provisional gross" value={formatMoney(detail.pricing.provisionalGrossPriceMinor)} /><Field label="Final net" value={formatMoney(detail.pricing.finalPrice?.netAmountMinor ?? null)} /><Field label="VAT" value={formatMoney(detail.pricing.finalPrice?.vatAmountMinor ?? null)} /><Field label="VAT rate" value={detail.pricing.finalPrice ? `${detail.pricing.finalPrice.vatRateBasisPoints / 100}%` : "Not recorded"} /><Field label="Final VAT-inclusive total" value={formatMoney(detail.pricing.finalPrice?.grossAmountMinor ?? null)} /><Field label="Calculation version" value={detail.pricing.calculationVersion || "Not recorded"} /><Field label="Pricing ruleset" value={detail.pricing.pricingRuleVersion || "Not recorded"} /></dl></Panel>
    </div>

    <Panel title="Email evidence" description={`Photos and drawings are handled at ${CURTAINSUK_REVIEW_EMAIL}. CurtainsUK records only the status, revision, staff actor and reason; do not paste files, links or email contents here.`}>
      <p className="mb-3 font-semibold">{detail.emailEvidence.state}</p>
      <p className="mb-4 text-sm text-white/60">Use reference {detail.reference}. {detail.emailEvidence.required ? "Evidence must be reviewed for this revision before approval." : "Evidence is optional unless requested by staff."} A new specification revision requires a fresh evidence review.</p>
      <form onSubmit={recordEmailEvidence} className="space-y-3">
        <label className="block">Evidence status<select className={`${CONTROL} mt-2 w-full`} value={emailState} onChange={(event) => setEmailState(event.target.value as EmailEvidenceState)}>{EMAIL_EVIDENCE_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
        <label className="block">Status reason<input className={`${CONTROL} mt-2 w-full`} value={evidenceReason} onChange={(event) => setEvidenceReason(event.target.value)} placeholder="Record receipt or review, without file contents" /></label>
        <button className={BUTTON} disabled={actionBusy || !isActionReason(evidenceReason) || !["PENDING", "NEEDS_INFORMATION", "UNDER_REVIEW"].includes(detail.reviewState)}>Record evidence status</button>
      </form>
      <ol className="mt-4 space-y-2 text-sm">{detail.emailEvidence.events.map((event) => <li key={event.eventId}>{event.state} · {formatDate(event.createdAt)} · {event.actorId || "System"} · {event.reason} · Revision {event.revisionId}</li>)}</ol>
    </Panel>

    <Panel title="Staff amendment" description="Saving creates an immutable revision. It does not overwrite the customer submission.">
      <form onSubmit={submitAmendment} className="grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-medium text-white/70 lg:col-span-2">Amended specification (JSON)<textarea rows={12} value={specification} onChange={(event) => setSpecification(event.target.value)} spellCheck={false} className={`${CONTROL} mt-2 w-full font-mono text-sm`} /></label>
        <label className="block text-sm font-medium text-white/70 lg:col-span-2">Final VAT-inclusive price (£, whole pounds)<input inputMode="numeric" pattern="[0-9]+" value={grossGbp} onChange={(event) => setGrossGbp(event.target.value)} className={`${CONTROL} mt-2 w-full`} /></label>
        <div className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm lg:col-span-2"><span className="text-white/50">Stored price snapshot</span><strong className="ml-3">{formatMoney(netMinor)} net + {formatMoney(vatMinor)} VAT = {formatMoney(grossMinor)}</strong></div>
        <label className="block text-sm font-medium text-white/70">Pricing ruleset version<input value={pricingVersion} onChange={(event) => setPricingVersion(event.target.value)} className={`${CONTROL} mt-2 w-full`} /></label>
        <label className="block text-sm font-medium text-white/70">Amendment reason<input value={amendmentReason} onChange={(event) => setAmendmentReason(event.target.value)} className={`${CONTROL} mt-2 w-full`} placeholder="Required for audit history" /></label>
        <button type="submit" disabled={actionBusy || !latestRevision || !isActionReason(amendmentReason)} className={`${BUTTON} bg-[#f1cf8a] text-[#102c26] lg:col-span-2`}>Save new revision and final price</button>
      </form>
    </Panel>

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Review decision" description="Every state change is append-only and requires a reason."><form onSubmit={submitTransition} className="space-y-4"><label className="block text-sm font-medium text-white/70">Next state<select value={transitionState} onChange={(event) => setTransitionState(event.target.value as ReviewState)} disabled={REVIEW_TRANSITIONS[detail.reviewState].length === 0} className={`${CONTROL} mt-2 w-full`}><option value="">No transition available</option>{REVIEW_TRANSITIONS[detail.reviewState].map((state) => <option key={state} value={state}>{humanise(state)}</option>)}</select></label><label className="block text-sm font-medium text-white/70">Decision reason<textarea rows={3} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} className={`${CONTROL} mt-2 w-full`} placeholder="Required for audit history" /></label><button type="submit" disabled={actionBusy || !transitionState || !isActionReason(transitionReason)} className={`${BUTTON} w-full border border-[#f1cf8a]/50 bg-[#f1cf8a]/10 text-[#f7dda5]`}>Record review decision</button></form></Panel>
      <Panel title="Checkout readiness" description="Payment remains disabled. This records readiness and can issue a revision-bound staging acceptance link; it cannot charge a customer or release manufacture."><div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 p-4 text-sm text-amber-100"><strong>Real payment disabled</strong><p className="mt-1 text-amber-100/70">Only the explicitly gated Shopify development-store test checkout can be prepared.</p></div>{detail.checkout.blockedReasons.length > 0 && <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/60">{detail.checkout.blockedReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}{detail.checkout.reference && <p className="mt-4 text-sm">Readiness reference: <strong>{detail.checkout.reference}</strong></p>}{reviewResumeUrl && <div className="mt-4 rounded-2xl border border-emerald-200/25 bg-emerald-300/10 p-4 text-sm text-emerald-100"><strong>Customer staging link ready</strong><p className="mt-1 text-emerald-100/70">The link contains a short-lived, revision-bound capability in its URL fragment. Send it only to this customer.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void copyReviewResumeLink()} className={`${BUTTON} border border-emerald-100/30 text-emerald-50`}>Copy secure link</button><a href={reviewResumeUrl} target="_blank" rel="noopener noreferrer" className={`${BUTTON} border border-emerald-100/30 text-emerald-50`}>Open customer acceptance</a></div>{reviewResumeStatus === "COPIED" && <p role="status" className="mt-2 text-emerald-100/75">Secure link copied.</p>}{reviewResumeStatus === "COPY_FAILED" && <p role="alert" className="mt-2 text-red-100">Clipboard access was blocked. Open the link and copy it from the new tab.</p>}</div>}{!reviewResumeUrl && reviewResumeStatus && <div className="mt-4 rounded-2xl border border-red-200/25 bg-red-300/10 p-4 text-sm text-red-100"><strong>Acceptance link blocked</strong><p className="mt-1 text-red-100/70">{reviewResumeStatus === "BLOCKED_BASE_URL_NOT_CONFIGURED" ? "Configure CURTAINSUK_STAGING_REVIEW_RESUME_URL with the unpublished Dawn preview URL." : "The configured staging resume URL is invalid or outside the allowed staging origins."}</p></div>}<form onSubmit={prepareCheckout} className="mt-4 space-y-4"><label className="block text-sm font-medium text-white/70">Readiness reason<textarea rows={3} value={checkoutReason} onChange={(event) => setCheckoutReason(event.target.value)} className={`${CONTROL} mt-2 w-full`} placeholder="Required for audit history" /></label><button type="submit" disabled={actionBusy || detail.reviewState !== "APPROVED" || !detail.checkout.eligible || !latestRevision || !isActionReason(checkoutReason)} className={`${BUTTON} w-full bg-[#f1cf8a] text-[#102c26]`}>Mark ready and create acceptance link</button></form></Panel>
    </div>

    {formError && <p role="alert" className="rounded-2xl border border-red-200/25 bg-red-300/10 p-4 text-sm text-red-100">{formError}</p>}

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Revision history">{detail.revisions.length ? <ol className="space-y-4">{detail.revisions.toSorted((left, right) => right.revisionNumber - left.revisionNumber).map((revision) => <li key={revision.revisionId} className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>Revision {revision.revisionNumber} · {humanise(revision.kind)}</strong><time className="text-xs text-white/45">{formatDate(revision.createdAt)}</time></div><p className="mt-2 text-sm text-white/60">{revision.reason}</p><p className="mt-2 text-xs text-white/45">Actor: {revision.actorLabel || "Customer"} · Pricing: {revision.pricingRuleVersion || "Not priced"} · Total: {formatMoney(revision.finalPrice?.grossAmountMinor ?? null)}</p></li>)}</ol> : <p className="text-sm text-white/50">No revision history is available.</p>}</Panel>
      <Panel title="Audit history">{detail.audit.length ? <ol className="space-y-4">{detail.audit.toSorted((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)).map((entry) => <li key={entry.eventId} className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{entry.fromState ? `${humanise(entry.fromState)} → ` : ""}{humanise(entry.toState)}</strong><time className="text-xs text-white/45">{formatDate(entry.occurredAt)}</time></div><p className="mt-2 text-sm text-white/60">{entry.reason}</p><p className="mt-2 text-xs text-white/45">Actor: {entry.actorLabel}</p></li>)}</ol> : <p className="text-sm text-white/50">No audit events are available.</p>}</Panel>
    </div>
  </div>;
}

function wholePoundsToMinor(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount * 100 : null;
}
