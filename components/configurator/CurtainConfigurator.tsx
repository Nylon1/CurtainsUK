"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, LoaderCircle, LockKeyhole, Ruler, ShieldCheck, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConstructionType, CoverageMeasurementBasis, HeadingType, LiningType, StackDirection } from "@/lib/decision-engine/types";
import type { CustomerSafeFabricProjection } from "@/lib/fabric-master/types";
import { trackStorefrontEvent } from "@/lib/storefront/analytics";
import { STOREFRONT_WINDOW_TYPES, STOREFRONT_WINDOWS_BY_SLUG, formatHeading, formatLining } from "@/lib/storefront/window-catalog";
import type { StagingPriceResponse } from "@/lib/storefront/staging-pricing";

const STEPS = ["Window", "Measurements", "Heading", "Fabric", "Lining", "Pair / Single", "Extras", "Price / Review"];
const SPECIALIST_STEPS = ["Window", "Geometry", "Heading", "Fabric", "Lining", "Review"];

type SpecialistResult = {
  outcome: "INSTANT_PRICE" | "PRICE_WITH_REVIEW" | "MANUAL_QUOTE";
  pricingConfidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  message: string;
  paymentState: "BLOCKED";
  productionState: "BLOCKED";
};

interface FormState {
  windowSlug: string;
  measurementBasis: CoverageMeasurementBasis;
  widthCm: string;
  dropCm: string;
  baySegments: string;
  bayAngles: string;
  peakHeight: string;
  leftVertical: string;
  rightVertical: string;
  leftSlope: string;
  rightSlope: string;
  leftAngle: string;
  rightAngle: string;
  fixingPosition: string;
  heading: HeadingType;
  fabricId: string;
  liningChoice: LiningType | "INTERLINING";
  construction: ConstructionType;
  stackDirection: StackDirection;
  extras: string[];
  photoNames: string[];
  drawingName: string;
}

function numericList(value: string) {
  return value.split(",").map((item) => Number(item.trim())).filter((item) => Number.isFinite(item) && item > 0);
}

function currency(amountMinor: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(amountMinor / 100);
}

function repeatLabel(fabric: CustomerSafeFabricProjection) {
  if (fabric.patternMatchType === "RANDOM_MATCH") return "No pattern repeat";
  if (fabric.verticalRepeatMm === null) return "Repeat pending";
  return `${fabric.verticalRepeatMm / 10} cm vertical repeat`;
}

function ChoiceButton({ selected, title, detail, onClick }: { selected: boolean; title: string; detail?: string; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-20 rounded-2xl border p-4 text-left transition ${selected ? "border-[#173c32] bg-[#e8dfd2] ring-1 ring-[#173c32]" : "border-[#173c32]/12 bg-white hover:border-[#173c32]/35"}`}><span className="flex items-center justify-between gap-3 font-semibold">{title}{selected && <Check className="h-4 w-4" />}</span>{detail && <span className="mt-1 block text-xs leading-5 text-[#687a73]">{detail}</span>}</button>;
}

function Field({ label, value, onChange, suffix = "cm", placeholder }: { label: string; value: string; onChange: (value: string) => void; suffix?: string; placeholder?: string }) {
  return <label className="block text-sm font-semibold">{label}<span className="mt-2 flex overflow-hidden rounded-xl border border-[#173c32]/15 bg-white focus-within:border-[#173c32]"><input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 px-4 py-3 font-normal outline-none" /><span className="flex items-center bg-[#f0e9df] px-4 text-xs text-[#63756e]">{suffix}</span></span></label>;
}

export default function CurtainConfigurator({ fabrics, initialWindow, initialFabric }: { fabrics: [CustomerSafeFabricProjection, ...CustomerSafeFabricProjection[]]; initialWindow?: string; initialFabric?: string }) {
  const safeWindow = STOREFRONT_WINDOWS_BY_SLUG.has(initialWindow ?? "") ? initialWindow! : "standard-window";
  const safeFabric = fabrics.some((item) => item.id === initialFabric) ? initialFabric! : fabrics[0].id;
  const [step, setStep] = useState(initialWindow ? 1 : 0);
  const [form, setForm] = useState<FormState>({
    windowSlug: safeWindow, measurementBasis: "TRACK_WIDTH", widthCm: "", dropCm: "", baySegments: "", bayAngles: "", peakHeight: "", leftVertical: "", rightVertical: "", leftSlope: "", rightSlope: "", leftAngle: "", rightAngle: "", fixingPosition: "Wall fixed above glazing", heading: "PENCIL_PLEAT", fabricId: safeFabric, liningChoice: "STANDARD", construction: "PAIR", stackDirection: "SPLIT", extras: [], photoNames: [], drawingName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<StagingPriceResponse | null>(null);
  const [specialistResult, setSpecialistResult] = useState<SpecialistResult | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const windowType = STOREFRONT_WINDOWS_BY_SLUG.get(form.windowSlug)!;
  const specialist = windowType.journey === "SPECIALIST";
  const steps = specialist ? SPECIALIST_STEPS : STEPS;
  const fabric = fabrics.find((item) => item.id === form.fabricId) ?? fabrics[0];
  const availableHeadings = useMemo(() => windowType.headings, [windowType]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); setError(""); }

  function selectWindow(slug: string) {
    const selected = STOREFRONT_WINDOWS_BY_SLUG.get(slug)!;
    setForm((current) => ({ ...current, windowSlug: slug, heading: selected.headings[0], photoNames: [], drawingName: "" }));
    setPrice(null); setSpecialistResult(null);
    trackStorefrontEvent("window_type_selected", { window_type: slug, journey: selected.journey });
    trackStorefrontEvent("configurator_started", { window_type: slug });
  }

  function validateCurrentStep() {
    if (step === 0 && !form.windowSlug) return "Choose a window type.";
    if (step === 1) {
      if (specialist) {
        const required = [form.widthCm, form.peakHeight, form.leftVertical, form.rightVertical, form.leftSlope, form.rightSlope];
        if (required.some((value) => !Number.isFinite(Number(value)) || Number(value) <= 0)) return "Enter every required specialist measurement in centimetres.";
        if (!form.fixingPosition) return "Add the proposed fixing position.";
        if (!form.photoNames.length) return "Add at least one project photograph.";
      } else if (form.windowSlug === "bay-window") {
        const segments = numericList(form.baySegments);
        const angles = numericList(form.bayAngles);
        if (segments.length < 3) return "Enter at least three bay section widths, separated by commas.";
        if (angles.length !== segments.length - 1) return "Enter one fewer bay angle than bay sections.";
        if (!Number.isFinite(Number(form.dropCm)) || Number(form.dropCm) <= 0) return "Enter the finished drop.";
        if (!form.photoNames.length) return "Add a clear bay photograph for review.";
      } else if (![form.widthCm, form.dropCm].every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) return "Enter a valid coverage width and finished drop.";
    }
    return "";
  }

  async function next() {
    const issue = validateCurrentStep();
    if (issue) { setError(issue); trackStorefrontEvent("validation_failure", { step: steps[step], window_type: form.windowSlug, message: issue }); return; }
    trackStorefrontEvent("configurator_step_completed", { step: steps[step], step_number: step + 1, window_type: form.windowSlug });
    if (step < steps.length - 1) setStep((value) => value + 1);
    if (step === steps.length - 2) await submit();
  }

  async function submit() {
    setLoading(true); setError(""); setPrice(null); setSpecialistResult(null);
    try {
      if (specialist) {
        const response = await fetch("/api/staging/specialist-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          windowSlug: form.windowSlug,
          measurements: { coverage_width: Number(form.widthCm), peak_height: Number(form.peakHeight), left_vertical: Number(form.leftVertical), right_vertical: Number(form.rightVertical), left_slope: Number(form.leftSlope), right_slope: Number(form.rightSlope), ...(form.leftAngle ? { left_slope_angle_degrees: Number(form.leftAngle) } : {}), ...(form.rightAngle ? { right_slope_angle_degrees: Number(form.rightAngle) } : {}) },
          fabricId: form.fabricId, heading: form.heading, lining: form.liningChoice === "INTERLINING" ? "STANDARD" : form.liningChoice, fixingPosition: form.fixingPosition, stackDirection: form.stackDirection, photoNames: form.photoNames, drawingName: form.drawingName || undefined,
        }) });
        const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Review preparation failed");
        setSpecialistResult(body); trackStorefrontEvent("quote_review_submitted", { window_type: form.windowSlug, outcome: body.outcome, pricing_confidence: body.pricingConfidence });
      } else {
        const segments = numericList(form.baySegments);
        const width = form.windowSlug === "bay-window" ? segments.reduce((sum, value) => sum + value, 0) : Number(form.widthCm);
        const response = await fetch("/api/staging/curtains-price", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ windowSlug: form.windowSlug, measurementBasis: form.measurementBasis, widthCm: width, dropCm: Number(form.dropCm), baySegmentWidthsCm: segments, bayAnglesDegrees: numericList(form.bayAngles), fabricId: form.fabricId, heading: form.heading, lining: form.liningChoice === "INTERLINING" ? "STANDARD" : form.liningChoice, interlining: form.liningChoice === "INTERLINING" ? "INTERLINING" : "NONE", construction: form.construction, stackDirection: form.stackDirection, photoNames: form.photoNames }) });
        const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Price calculation failed");
        setPrice(body); trackStorefrontEvent("price_displayed", { window_type: form.windowSlug, outcome: body.outcome, amount_minor: body.totalAmountMinor, currency: body.currency, calculation_version: body.calculationVersion });
      }
    } catch (caught) { const message = caught instanceof Error ? caught.message : "Something needs checking"; setError(message); trackStorefrontEvent("validation_failure", { step: "Price / Review", message }); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-[1320px]">
      <div className="mb-8 overflow-x-auto pb-2"><ol className="flex min-w-max items-center gap-2">{steps.map((label, index) => <li key={label} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${index === step ? "bg-[#173c32] text-white" : index < step ? "bg-[#d9aa67] text-[#173c32]" : "bg-white text-[#75857f]"}`}><span>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>{label}</li>)}</ol></div>
      <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
        <section className="min-h-[560px] rounded-[30px] border border-[#173c32]/10 bg-white p-5 shadow-[0_18px_50px_rgba(23,60,50,0.08)] sm:p-8">
          {step === 0 && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Step 1</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Which window are we dressing?</h1><p className="mt-3 text-sm leading-6 text-[#667a72]">Window type is the first major decision because it controls every compatible step after it.</p><div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{STOREFRONT_WINDOW_TYPES.map((item) => <ChoiceButton key={item.slug} selected={form.windowSlug === item.slug} title={item.name} detail={item.journey === "SPECIALIST" ? "Technical review" : item.journey === "REVIEW" ? "Price with review" : "Instant price"} onClick={() => selectWindow(item.slug)} />)}</div></div>}

          {step === 1 && !specialist && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Measurements · centimetres</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Measure the full curtain coverage</h1>{form.windowSlug === "bay-window" ? <div className="mt-7 grid gap-5"><Field label="Bay section widths" value={form.baySegments} onChange={(value) => update("baySegments", value)} suffix="cm, comma-separated" placeholder="80, 180, 80" /><Field label="Angles between sections" value={form.bayAngles} onChange={(value) => update("bayAngles", value)} suffix="degrees" placeholder="135, 135" /><Field label="Finished curtain drop" value={form.dropCm} onChange={(value) => update("dropCm", value)} /><label className="rounded-2xl border border-dashed border-[#173c32]/25 bg-[#f7f3ec] p-5 text-sm font-semibold"><span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Clear photograph of the full bay</span><input type="file" accept="image/*" multiple onChange={(event) => update("photoNames", Array.from(event.target.files ?? []).map((file) => file.name))} className="mt-3 block w-full text-xs font-normal" /><button type="button" onClick={() => update("photoNames", ["demo-bay-window.jpg"])} className="mt-3 rounded-full border border-[#173c32]/15 bg-white px-3 py-2 text-xs font-semibold">Use demo photograph</button><span className="mt-2 block text-xs font-normal text-[#687a73]">Staging records names locally; files are not uploaded or persisted.</span></label></div> : <div className="mt-7 grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><div className="text-sm font-semibold">What did you measure?</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><ChoiceButton selected={form.measurementBasis === "TRACK_WIDTH"} title="Track width" detail="The complete usable track" onClick={() => update("measurementBasis", "TRACK_WIDTH")} /><ChoiceButton selected={form.measurementBasis === "POLE_USABLE_WIDTH"} title="Pole usable width" detail="Between finials or end stops" onClick={() => update("measurementBasis", "POLE_USABLE_WIDTH")} /></div></div><Field label="Full coverage width" value={form.widthCm} onChange={(value) => update("widthCm", value)} placeholder="e.g. 240" /><Field label="Finished drop" value={form.dropCm} onChange={(value) => update("dropCm", value)} placeholder="e.g. 220" /><div className="sm:col-span-2 rounded-2xl bg-[#f7f3ec] p-4 text-xs leading-5 text-[#60746d]"><Ruler className="mr-2 inline h-4 w-4 text-[#a36d2d]" />Enter the space the curtains cover, not the finished width of an existing curtain.</div></div>}</div>}

          {step === 1 && specialist && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Specialist geometry · centimetres</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Map every edge of the {windowType.name.toLowerCase()}</h1><p className="mt-3 text-sm leading-6 text-[#667a72]">These measurements create a review record only. They cannot release a curtain into payment or manufacture.</p><div className="mt-7 grid gap-5 sm:grid-cols-2"><Field label="Base width" value={form.widthCm} onChange={(value) => update("widthCm", value)} /><Field label="Overall peak height" value={form.peakHeight} onChange={(value) => update("peakHeight", value)} /><Field label="Left vertical" value={form.leftVertical} onChange={(value) => update("leftVertical", value)} /><Field label="Right vertical" value={form.rightVertical} onChange={(value) => update("rightVertical", value)} /><Field label="Left slope" value={form.leftSlope} onChange={(value) => update("leftSlope", value)} /><Field label="Right slope" value={form.rightSlope} onChange={(value) => update("rightSlope", value)} /><Field label="Left slope angle (optional)" value={form.leftAngle} onChange={(value) => update("leftAngle", value)} suffix="degrees" /><Field label="Right slope angle (optional)" value={form.rightAngle} onChange={(value) => update("rightAngle", value)} suffix="degrees" /><label className="sm:col-span-2 block text-sm font-semibold">Proposed fixing position<input value={form.fixingPosition} onChange={(event) => update("fixingPosition", event.target.value)} className="mt-2 w-full rounded-xl border border-[#173c32]/15 px-4 py-3 font-normal outline-none" /></label><label className="rounded-2xl border border-dashed border-[#173c32]/25 bg-[#f7f3ec] p-5 text-sm font-semibold"><span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Project photographs (required)</span><input type="file" accept="image/*" multiple onChange={(event) => update("photoNames", Array.from(event.target.files ?? []).map((file) => file.name))} className="mt-3 block w-full text-xs font-normal" /><button type="button" onClick={() => update("photoNames", ["demo-specialist-window.jpg"])} className="mt-3 rounded-full border border-[#173c32]/15 bg-white px-3 py-2 text-xs font-semibold">Use demo photograph</button></label><label className="rounded-2xl border border-dashed border-[#173c32]/25 bg-[#f7f3ec] p-5 text-sm font-semibold"><span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Drawing (optional)</span><input type="file" accept="image/*,.pdf" onChange={(event) => update("drawingName", event.target.files?.[0]?.name ?? "")} className="mt-3 block w-full text-xs font-normal" /></label><p className="sm:col-span-2 text-xs leading-5 text-[#6f7f79]">This staging proof records file names only. Secure upload storage is an outstanding Shopify/API dependency.</p></div></div>}

          {((!specialist && step === 2) || (specialist && step === 2)) && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Heading</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">How should the top of the curtain look?</h1><div className="mt-7 grid gap-3 sm:grid-cols-2">{availableHeadings.map((heading) => <ChoiceButton key={heading} selected={form.heading === heading} title={formatHeading(heading)} detail={heading === "WAVE" ? "A neat, even fold on a compatible track" : heading.includes("PINCH") ? "A tailored, structured finish" : heading === "EYELET" ? "Contemporary rings for a pole" : "A versatile traditional heading"} onClick={() => update("heading", heading)} />)}</div></div>}

          {((!specialist && step === 3) || (specialist && step === 3)) && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Approved supplier pilot</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Choose the exact colourway</h1><div className="mt-7 grid gap-4 sm:grid-cols-2">{fabrics.map((item) => <button key={item.id} type="button" onClick={() => { update("fabricId", item.id); trackStorefrontEvent("fabric_selected", { fabric_id: item.id, colour: item.colour, placement: "configurator" }); }} className={`overflow-hidden rounded-2xl border text-left ${form.fabricId === item.id ? "border-[#173c32] ring-1 ring-[#173c32]" : "border-[#173c32]/12"}`}><div className="relative aspect-[16/8] bg-[#e8dfd2]">{item.imageReferences[0] ? <Image src={item.imageReferences[0]} alt={`${item.design} ${item.colour} by ${item.brand}`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" /> : <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.14em] text-[#60736b]">Authorised image pending</div>}</div><div className="p-4"><div className="font-semibold">{item.design} — {item.colour}</div><div className="mt-1 text-xs text-[#6a7c75]">{item.brand} · {item.collection} · {item.usableWidthMm === null ? "Width pending" : `${item.usableWidthMm / 10} cm`} · {repeatLabel(item)}</div><div className="mt-1 text-xs font-semibold text-[#7a5a35]">{item.availability}</div></div></button>)}</div><Link href={`/fabrics?window=${form.windowSlug}`} className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4">See full fabric details</Link></div>}

          {((!specialist && step === 4) || (specialist && step === 4)) && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Lining</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Choose light, warmth and finish</h1><div className="mt-7 grid gap-3 sm:grid-cols-2">{(["UNLINED", "STANDARD", "BLACKOUT", "THERMAL", "INTERLINING"] as const).map((lining) => <ChoiceButton key={lining} selected={form.liningChoice === lining} title={lining === "INTERLINING" ? "Interlining" : formatLining(lining)} detail={lining === "BLACKOUT" ? "Stronger light control" : lining === "THERMAL" ? "Thermal-lined construction" : lining === "INTERLINING" ? "Additional body and insulation; always reviewed" : lining === "UNLINED" ? "Only where fabric and window allow" : "A practical everyday finish"} onClick={() => update("liningChoice", lining)} />)}</div></div>}

          {!specialist && step === 5 && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Construction</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">One curtain or a balanced pair?</h1><div className="mt-7 grid gap-3 sm:grid-cols-2"><ChoiceButton selected={form.construction === "PAIR"} title="Pair" detail="Two curtains allocated across balanced whole fabric widths" onClick={() => { update("construction", "PAIR"); update("stackDirection", "SPLIT"); }} /><ChoiceButton selected={form.construction === "SINGLE"} title="Single" detail="One curtain stacking to the selected side" onClick={() => update("construction", "SINGLE")} /></div><div className="mt-6"><div className="text-sm font-semibold">Opening / stack direction</div><div className="mt-3 grid gap-3 sm:grid-cols-3">{(["LEFT", "RIGHT", "SPLIT"] as StackDirection[]).map((direction) => <ChoiceButton key={direction} selected={form.stackDirection === direction} title={direction.charAt(0) + direction.slice(1).toLowerCase()} onClick={() => update("stackDirection", direction)} />)}</div></div></div>}

          {!specialist && step === 6 && <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#996a31]">Extras</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Useful additions, kept transparent</h1><div className="mt-7 grid gap-3 sm:grid-cols-2">{[{ code: "MATCHING_TIEBACK", title: "Matching tiebacks", detail: "Draft accessory price; excluded from the displayed total" }, { code: "HOOKS_GLIDERS", title: "Hooks / gliders", detail: "Compatibility and price pending catalogue approval" }].map((extra) => <ChoiceButton key={extra.code} selected={form.extras.includes(extra.code)} title={extra.title} detail={extra.detail} onClick={() => update("extras", form.extras.includes(extra.code) ? form.extras.filter((item) => item !== extra.code) : [...form.extras, extra.code])} />)}</div><p className="mt-5 rounded-2xl bg-[#fff6e7] p-4 text-xs leading-5 text-[#73572f]">No draft accessory is silently priced. Selected extras are flagged for review until their unit prices and VAT are approved.</p></div>}

          {step === steps.length - 1 && <div>{loading ? <div className="flex min-h-[400px] items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-[#a36d2d]" /></div> : specialist ? <div>{specialistResult ? <><div className="inline-flex items-center gap-2 rounded-full bg-[#fff0d8] px-3 py-1.5 text-xs font-semibold text-[#774d1b]"><ShieldCheck className="h-4 w-4" /> {specialistResult.outcome.replaceAll("_", " ")}</div><h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em]">Price subject to technical review</h1><p className="mt-4 max-w-xl text-lg leading-8 text-[#587168]">Your staging specification is ready for a specialist to check. Pricing confidence: {specialistResult.pricingConfidence.toLowerCase()}.</p><div className="mt-7 rounded-2xl bg-[#f7f3ec] p-5"><div className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-5 w-5 text-[#9a6b32]" /> Payment and manufacture blocked</div><ul className="mt-3 space-y-2 text-sm leading-6 text-[#61756d]">{specialistResult.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul></div></> : <p>Review result is not available.</p>}</div> : <div>{price ? <><div className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${price.outcome === "INSTANT_PRICE" ? "bg-[#dceadf] text-[#24533a]" : "bg-[#fff0d8] text-[#774d1b]"}`}>{price.outcome.replaceAll("_", " ")}</div><h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em]">{currency(price.totalAmountMinor)}</h1><p className="mt-2 text-sm font-semibold">VAT included · delivery shown separately</p><dl className="mt-7 divide-y divide-[#173c32]/10 rounded-2xl bg-[#f7f3ec] px-5 text-sm">{[["Window", windowType.name], ["Fabric", `${price.selectedFabric.design} — ${price.selectedFabric.colour}`], ["Heading", formatHeading(price.heading)], ["Lining", form.liningChoice === "INTERLINING" ? "Interlining" : formatLining(price.lining)], ["Construction", price.construction === "PAIR" ? "Pair" : "Single"], ["Fabric widths required", String(price.fabricWidths)], ["Delivery", price.delivery]].map(([key, value]) => <div key={key} className="flex justify-between gap-4 py-3"><dt className="text-[#6b7c75]">{key}</dt><dd className="text-right font-semibold">{value}</dd></div>)}</dl>{price.technicalReviewRequired && <div className="mt-5 rounded-2xl bg-[#fff0d8] p-4 text-sm text-[#765326]"><CircleAlert className="mr-2 inline h-4 w-4" />Price shown, subject to technical review before checkout.</div>}{form.extras.length > 0 && <div className="mt-4 rounded-2xl bg-[#fff0d8] p-4 text-xs text-[#765326]">Selected extras are excluded from this total until their catalogue prices are approved.</div>}<button onClick={() => { trackStorefrontEvent("checkout_started", { window_type: form.windowSlug, amount_minor: price.totalAmountMinor, staging_blocked: true }); setCheckoutMessage("Checkout remains disconnected in staging. No order or payment was created."); }} className="mt-6 w-full rounded-full bg-[#173c32] px-5 py-3.5 text-sm font-semibold text-white">Continue to staging checkout</button>{checkoutMessage && <p role="status" className="mt-3 text-center text-xs text-[#64776f]">{checkoutMessage}</p>}</> : <p>Price result is not available.</p>}</div>}</div>}

          {error && <div role="alert" className="mt-6 rounded-2xl bg-[#fde8e1] p-4 text-sm text-[#7e3f32]"><CircleAlert className="mr-2 inline h-4 w-4" />{error}</div>}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#173c32]/10 pt-6"><button type="button" onClick={() => { setStep((value) => Math.max(0, value - 1)); setError(""); }} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#173c32]/15 px-5 text-sm font-semibold disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Back</button>{step < steps.length - 1 && <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#173c32] px-6 text-sm font-semibold text-white">{step === steps.length - 2 ? specialist ? "Prepare review" : "Calculate price" : "Continue"}<ArrowRight className="h-4 w-4" /></button>}</div>
        </section>

        <aside className="h-fit rounded-[28px] bg-[#173c32] p-6 text-white lg:sticky lg:top-24">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e2bc82]">Your curtains</div><h2 className="mt-3 text-2xl font-semibold">{windowType.name}</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-white/55">Route</dt><dd className="font-semibold">{windowType.journey === "SPECIALIST" ? "Technical review" : windowType.journey === "REVIEW" ? "Price + review" : "Instant price"}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/55">Heading</dt><dd className="font-semibold">{formatHeading(form.heading)}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/55">Fabric</dt><dd className="text-right font-semibold">{fabric.design} · {fabric.colour}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/55">Lining</dt><dd className="font-semibold">{form.liningChoice === "INTERLINING" ? "Interlining" : formatLining(form.liningChoice)}</dd></div></dl><div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/65"><ShieldCheck className="mb-2 h-5 w-5 text-[#e2bc82]" />Staging only. No selection reaches live Shopify, checkout, Merchant Center or manufacture.</div>
        </aside>
      </div>
    </div>
  );
}
