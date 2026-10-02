import { createHash } from "node:crypto";
import { createSupplierServiceClient } from "../lib/supabase/supplier-service";
import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";
import { SDG_PORTAL_DETAIL_URL } from "../lib/supplier-sync/adapters/sanderson-design-group";
import { normalizeSupplierSnapshot } from "../lib/supplier-sync/normalize";
import { validateSupplierIntelligenceSnapshot } from "../lib/supplier-intelligence/validation";
import { createValidationEvent } from "../lib/supplier-intelligence/promotion";

const SUPPLIER = "sanderson-design-group";
const SOURCE = "SDG authenticated trade portal Product/detail price recovery";
const ADAPTER = "sdg-portal-product-detail-price-recovery";
const RECOVERY = "sdg-price-recovery-20261002";
const EXPECTED_TARGET = 6700;
const EXPECTED_PRICE_SUM = 273623.43;
const EXPECTED_FINGERPRINT = "3adb50a381528aaccfaa0c16de0d928d15d811eb16661da0f904ed69182fc247";
const EXPECTED_STATUS_COUNTS: Record<string, number> = {
  "L|Live": 6107,
  "N|No Further Replen / MOQ Cust Special": 3,
  "W|Stock Limited - No Reorder": 590,
};
const CONTROLS = new Map<string, number>([
  ["DAPGPA203", 43.17],
  ["F1069/34", 25.67],
  ["F1325/03", 18.67],
  ["F1681/03", 16.33],
  ["F1740/03", 21],
]);

type Target = {
  supplierSku: string;
  brandId: string;
  lifecycleState: "CURRENT" | "UNKNOWN";
};
type Product = Record<string, unknown>;
type ObservedProduct = { raw: Product; observedAt: string };
type ValidPrice = Target & {
  price: number;
  status: string;
  statusCode: string;
  observedAt: string;
  unitName: string;
  unitCode: string;
};

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function textOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function money(value: number) {
  return value.toFixed(4);
}
function snapshotId(sku: string) {
  return `${RECOVERY}:${sku}`;
}
function runId(batch: number) {
  return `${RECOVERY}:${String(batch + 1).padStart(3, "0")}`;
}
function approvalEventId(sku: string) {
  return `${snapshotId(sku)}:recovery-policy`;
}

async function loadTargets(): Promise<Target[]> {
  const db = createSupplierServiceClient();
  const rows: Target[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("fabric_colourways")
      .select("supplier_sku,brand_id,lifecycle_state,price_verification_status,staging_catalog_visible,storefront_selectable")
      .eq("supplier_id", SUPPLIER)
      .neq("lifecycle_state", "DISCONTINUED")
      .eq("price_verification_status", "VERIFIED")
      .or("staging_catalog_visible.eq.true,storefront_selectable.eq.true")
      .order("supplier_sku")
      .range(offset, offset + 999);
    if (error) throw new Error("SDG_PRICE_RECOVERY_MANIFEST_FAILED");
    for (const row of data ?? []) {
      if (typeof row.supplier_sku !== "string" || typeof row.brand_id !== "string"
          || (row.lifecycle_state !== "CURRENT" && row.lifecycle_state !== "UNKNOWN")) {
        throw new Error("SDG_PRICE_RECOVERY_MANIFEST_IDENTITY_INVALID");
      }
      rows.push({ supplierSku: row.supplier_sku, brandId: row.brand_id, lifecycleState: row.lifecycle_state });
    }
    if ((data ?? []).length < 1000) break;
  }
  const unique = new Map(rows.map((row) => [row.supplierSku, row]));
  if (unique.size !== rows.length || rows.length !== EXPECTED_TARGET) {
    throw new Error(`SDG_PRICE_RECOVERY_TARGET_CHANGED_${rows.length}_${unique.size}`);
  }
  return [...unique.values()];
}

async function requestPricePart(
  session: SdgPortalSession,
  part: readonly Target[],
  depth = 0,
): Promise<{ products: ObservedProduct[]; exceptions: { sku: string; reason: string }[] }> {
  if (depth > 10) {
    return { products: [], exceptions: part.map((item) => ({ sku: item.supplierSku, reason: "SPLIT_DEPTH_EXCEEDED" })) };
  }
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = await session.getBearerToken();
    try {
      response = await fetch(SDG_PORTAL_DETAIL_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          price: true,
          stock: false,
          options: false,
          productCriteria: part.map(({ supplierSku }) => ({ productCode: supplierSku, orderUnit: "", orderQuantity: 1 })),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      if (attempt === 2) throw new Error("SDG_PRICE_RECOVERY_NETWORK_FAILED");
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
      continue;
    }
    if (response.status === 401 || response.status === 403) throw new Error("SDG_PRICE_RECOVERY_AUTH_FAILED");
    if (response.status === 429) {
      if (attempt === 2) throw new Error("SDG_PRICE_RECOVERY_RATE_LIMITED");
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 5000));
      continue;
    }
    if (response.status >= 500 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
      continue;
    }
    break;
  }
  if (response?.status === 404) {
    if (part.length === 1) return { products: [], exceptions: [{ sku: part[0].supplierSku, reason: "HTTP_404" }] };
    const middle = Math.floor(part.length / 2);
    const left = await requestPricePart(session, part.slice(0, middle), depth + 1);
    const right = await requestPricePart(session, part.slice(middle), depth + 1);
    return { products: [...left.products, ...right.products], exceptions: [...left.exceptions, ...right.exceptions] };
  }
  if (!response?.ok) throw new Error(`SDG_PRICE_RECOVERY_HTTP_${response?.status ?? "NO_RESPONSE"}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("SDG_PRICE_RECOVERY_SHAPE_CHANGED");
  const observedAt = new Date().toISOString();
  return {
    products: payload.map((raw) => {
      if (!raw || typeof raw !== "object") throw new Error("SDG_PRICE_RECOVERY_PRODUCT_INVALID");
      return { raw: raw as Product, observedAt };
    }),
    exceptions: [],
  };
}

async function retrieveAndValidate(session: SdgPortalSession, manifest: readonly Target[]): Promise<ValidPrice[]> {
  const observed: ObservedProduct[] = [];
  const exceptions: { sku: string; reason: string }[] = [];
  for (let offset = 0; offset < manifest.length; offset += 100) {
    const result = await requestPricePart(session, manifest.slice(offset, offset + 100));
    observed.push(...result.products);
    exceptions.push(...result.exceptions);
    console.log(JSON.stringify({
      event: "SDG_PRICE_RECOVERY_READ_PROGRESS",
      completed: Math.min(offset + 100, manifest.length),
      total: manifest.length,
      returned: observed.length,
      exceptions: exceptions.length,
    }));
  }
  if (exceptions.length) throw new Error(`SDG_PRICE_RECOVERY_EXCEPTIONS_${exceptions.length}`);

  const targetBySku = new Map(manifest.map((item) => [item.supplierSku, item]));
  const bySku = new Map<string, ObservedProduct[]>();
  for (const item of observed) {
    const sku = textOrEmpty(item.raw.productCode);
    if (!targetBySku.has(sku)) throw new Error("SDG_PRICE_RECOVERY_UNREQUESTED_SKU");
    const list = bySku.get(sku) ?? [];
    list.push(item);
    bySku.set(sku, list);
  }

  const valid: ValidPrice[] = [];
  const statusCounts = new Map<string, number>();
  for (const target of manifest) {
    const list = bySku.get(target.supplierSku) ?? [];
    if (list.length !== 1) throw new Error(`SDG_PRICE_RECOVERY_RESPONSE_COUNT_${target.supplierSku}_${list.length}`);
    const { raw, observedAt } = list[0];
    const unitPrice = numberOrNull(raw.unitPrice);
    const linePrice = numberOrNull(raw.linePrice);
    const unitName = textOrEmpty(raw.productStockUnit);
    const unitCode = textOrEmpty(raw.productStockUnitCode);
    const status = textOrEmpty(raw.productStatus);
    const statusCode = textOrEmpty(raw.productStatusCode);
    if (unitPrice === null || unitPrice <= 0) throw new Error(`SDG_PRICE_RECOVERY_UNIT_PRICE_INVALID_${target.supplierSku}`);
    if (linePrice === null || linePrice <= 0 || Math.abs(linePrice - unitPrice) > 0.0001) {
      throw new Error(`SDG_PRICE_RECOVERY_LINE_PRICE_MISMATCH_${target.supplierSku}`);
    }
    if (unitCode.toUpperCase() !== "M" && unitName.toLowerCase() !== "metre") {
      throw new Error(`SDG_PRICE_RECOVERY_NON_METRE_UNIT_${target.supplierSku}`);
    }
    statusCounts.set(`${statusCode}|${status}`, (statusCounts.get(`${statusCode}|${status}`) ?? 0) + 1);
    valid.push({ ...target, price: unitPrice, status, statusCode, observedAt, unitName, unitCode });
  }

  const fingerprintInput = [...valid]
    .sort((left, right) => left.supplierSku.localeCompare(right.supplierSku))
    .map((item) => `${item.supplierSku}:${item.price.toFixed(4)}`)
    .join("|");
  const fingerprint = createHash("sha256").update(fingerprintInput).digest("hex");
  const priceSum = Number(valid.reduce((sum, item) => sum + item.price, 0).toFixed(2));
  const controls = [...CONTROLS].map(([sku, expected]) => {
    const actual = valid.find((item) => item.supplierSku === sku)?.price ?? null;
    return { sku, expected, actual, match: actual !== null && Math.abs(actual - expected) < 0.0001 };
  });
  const actualStatusCounts = Object.fromEntries([...statusCounts].sort());
  if (fingerprint !== EXPECTED_FINGERPRINT) throw new Error(`SDG_PRICE_RECOVERY_FINGERPRINT_CHANGED_${fingerprint}`);
  if (priceSum !== EXPECTED_PRICE_SUM) throw new Error(`SDG_PRICE_RECOVERY_SUM_CHANGED_${priceSum}`);
  if (!controls.every((control) => control.match)) throw new Error("SDG_PRICE_RECOVERY_CONTROL_MISMATCH");
  if (JSON.stringify(actualStatusCounts) !== JSON.stringify(EXPECTED_STATUS_COUNTS)) {
    throw new Error(`SDG_PRICE_RECOVERY_STATUS_CHANGED_${JSON.stringify(actualStatusCounts)}`);
  }
  console.log(JSON.stringify({
    event: "SDG_PRICE_RECOVERY_PREWRITE_PROOF",
    target: valid.length,
    fingerprint,
    priceSum,
    statusCounts: actualStatusCounts,
    controls,
  }));
  return valid;
}

async function ensureApprovals(batch: readonly ValidPrice[]) {
  const db = createSupplierServiceClient();
  const ids = batch.map((item) => approvalEventId(item.supplierSku));
  const { data: existing, error: existingError } = await db.from("supplier_promotion_events")
    .select("event_id").in("event_id", ids);
  if (existingError) throw new Error("SDG_PRICE_RECOVERY_APPROVAL_READ_FAILED");
  const present = new Set((existing ?? []).map((row) => row.event_id));
  const missing = batch.filter((item) => !present.has(approvalEventId(item.supplierSku)));
  if (!missing.length) return;
  const approvedAt = new Date().toISOString();
  const { error } = await db.from("supplier_promotion_events").insert(missing.map((item) => ({
    event_id: approvalEventId(item.supplierSku),
    snapshot_id: snapshotId(item.supplierSku),
    promotion_state: "APPROVED_FOR_PROJECTION",
    actor_type: "POLICY",
    actor_id: null,
    reason: "Owner-authorised exact-SKU SDG first-party Product/detail price recovery after accidental stock-retention deletion; unitPrice and linePrice matched in GBP/metre, no inference, no stock materialisation, no supplier order and no Shopify write.",
    rejection_reason: null,
    previous_approved_snapshot_id: null,
    created_at: approvedAt,
  })));
  if (error) throw new Error("SDG_PRICE_RECOVERY_APPROVAL_APPEND_FAILED");
}

async function verifyExistingBatch(batchIndex: number, batch: readonly ValidPrice[]) {
  const db = createSupplierServiceClient();
  const id = runId(batchIndex);
  const { data: run, error: runError } = await db.from("supplier_sync_runs")
    .select("run_id,supplier_id,adapter_id,status,snapshots_received,snapshots_appended,shopify_writes,production_schedule_created")
    .eq("run_id", id).maybeSingle();
  if (runError) throw new Error("SDG_PRICE_RECOVERY_RUN_READ_FAILED");
  if (!run) return false;
  if (run.supplier_id !== SUPPLIER || run.adapter_id !== ADAPTER || run.status !== "SUCCEEDED"
      || Number(run.snapshots_received) !== batch.length || Number(run.snapshots_appended) !== batch.length
      || Number(run.shopify_writes) !== 0 || run.production_schedule_created !== false) {
    throw new Error(`SDG_PRICE_RECOVERY_EXISTING_RUN_MISMATCH_${id}`);
  }
  const ids = batch.map((item) => snapshotId(item.supplierSku));
  const { data: snapshots, error: snapshotError } = await db.from("supplier_snapshots")
    .select("snapshot_id,supplier_sku,run_id").eq("run_id", id);
  if (snapshotError || (snapshots ?? []).length !== batch.length) {
    throw new Error(`SDG_PRICE_RECOVERY_EXISTING_SNAPSHOT_MISMATCH_${id}`);
  }
  const expectedSku = new Set(batch.map((item) => item.supplierSku));
  if ((snapshots ?? []).some((row) => !expectedSku.has(row.supplier_sku) || row.snapshot_id !== snapshotId(row.supplier_sku))) {
    throw new Error(`SDG_PRICE_RECOVERY_EXISTING_IDENTITY_MISMATCH_${id}`);
  }
  const { data: prices, error: priceError } = await db.from("supplier_snapshot_prices")
    .select("snapshot_id,standard_trade_price,cut_trade_price,currency").in("snapshot_id", ids);
  if (priceError || (prices ?? []).length !== batch.length) {
    throw new Error(`SDG_PRICE_RECOVERY_EXISTING_PRICE_COUNT_MISMATCH_${id}`);
  }
  const expectedPrice = new Map(batch.map((item) => [snapshotId(item.supplierSku), item.price]));
  for (const row of prices ?? []) {
    if (row.currency !== "GBP" || row.standard_trade_price !== null
        || Math.abs(Number(row.cut_trade_price) - (expectedPrice.get(row.snapshot_id) ?? Number.NaN)) > 0.0001) {
      throw new Error(`SDG_PRICE_RECOVERY_EXISTING_PRICE_MISMATCH_${id}`);
    }
  }
  await ensureApprovals(batch);
  return true;
}

async function appendBatch(batchIndex: number, batch: readonly ValidPrice[]) {
  if (await verifyExistingBatch(batchIndex, batch)) {
    console.log(JSON.stringify({ event: "SDG_PRICE_RECOVERY_BATCH_ALREADY_VERIFIED", batch: batchIndex + 1, count: batch.length }));
    return;
  }
  const db = createSupplierServiceClient();
  const id = runId(batchIndex);
  const started = new Date().toISOString();
  const validationAt = new Date(Date.now() - 1000).toISOString();
  const items = batch.map((item) => {
    const snapshot = normalizeSupplierSnapshot({
      snapshot_id: snapshotId(item.supplierSku),
      supplier_id: SUPPLIER,
      brand_id: item.brandId,
      supplier_sku: item.supplierSku,
      checked_at: item.observedAt,
      cut_trade_price: money(item.price),
      standard_trade_price: null,
      currency: "GBP",
      lifecycle_state: item.lifecycleState,
      verification_status: "VERIFIED",
      source: { type: "MANUAL_PORTAL", name: SOURCE, reference: `sdg:Product/detail:price:${item.supplierSku}` },
    });
    const validation = validateSupplierIntelligenceSnapshot(snapshot, {
      known_supplier: true,
      known_sku: true,
      allowed_currencies: ["GBP"],
      allowed_stock_units: ["METRE"],
      required_price_field: "CUT_TRADE_PRICE",
      freshness_policies: [],
    }, new Date());
    if (validation.status !== "VALIDATED") {
      throw new Error(`SDG_PRICE_RECOVERY_VALIDATION_FAILED_${item.supplierSku}_${validation.errors.join("_")}`);
    }
    return {
      snapshot: {
        ...snapshot,
        run_id: id,
        source_type: snapshot.source.type,
        source_name: snapshot.source.name,
        source_reference: snapshot.source.reference,
        validation_status: validation.status,
        validation_errors: validation.errors,
        stock_expires_at: validation.stock_expires_at,
        price_expires_at: validation.price_expires_at,
        lifecycle_expires_at: validation.lifecycle_expires_at,
        normalized_payload: {
          ...snapshot,
          source: snapshot.source,
          supplier_portal_price: {
            unit_price: money(item.price),
            line_price: money(item.price),
            currency: "GBP",
            stock_unit: item.unitName,
            stock_unit_code: item.unitCode,
            product_status: item.status,
            product_status_code: item.statusCode,
          },
          recovery: {
            incident: "2026-10-02-stock-retention-price-evidence-deletion",
            census_sha256: EXPECTED_FINGERPRINT,
            price_changed: false,
            inferred: false,
            stock_materialised: false,
            shopify_writes: 0,
          },
        },
      },
      validation_event: createValidationEvent(snapshot.snapshot_id, validation, validationAt),
    };
  });

  const completed = new Date().toISOString();
  const run = {
    run_id: id,
    supplier_id: SUPPLIER,
    adapter_id: ADAPTER,
    mode: "SHADOW",
    source_type: "MANUAL_PORTAL",
    source_name: SOURCE,
    started_at: started,
    completed_at: completed,
    status: "SUCCEEDED",
    snapshots_received: batch.length,
    snapshots_appended: batch.length,
    error_code: null,
    shopify_writes: 0,
    production_schedule_created: false,
  };
  const { error } = await db.rpc("append_supplier_snapshot_batch", { p_run: run, p_items: items });
  if (error) throw new Error(`SDG_PRICE_RECOVERY_APPEND_FAILED_${batchIndex + 1}`);
  await ensureApprovals(batch);
  if (!(await verifyExistingBatch(batchIndex, batch))) throw new Error(`SDG_PRICE_RECOVERY_BATCH_VERIFY_FAILED_${batchIndex + 1}`);
  console.log(JSON.stringify({ event: "SDG_PRICE_RECOVERY_BATCH_APPLIED", batch: batchIndex + 1, count: batch.length }));
}

async function finalProof(valid: readonly ValidPrice[]) {
  const db = createSupplierServiceClient();
  const { count: snapshotCount, error: snapshotError } = await db.from("supplier_snapshots")
    .select("snapshot_id", { count: "exact", head: true }).like("snapshot_id", `${RECOVERY}:%`);
  const { count: priceCount, error: priceError } = await db.from("supplier_snapshot_prices")
    .select("snapshot_id", { count: "exact", head: true }).like("snapshot_id", `${RECOVERY}:%`);
  const { count: approvalCount, error: approvalError } = await db.from("supplier_promotion_events")
    .select("event_id", { count: "exact", head: true }).like("event_id", `${RECOVERY}:%:recovery-policy`);
  if (snapshotError || priceError || approvalError) throw new Error("SDG_PRICE_RECOVERY_FINAL_COUNT_READ_FAILED");
  if (snapshotCount !== EXPECTED_TARGET || priceCount !== EXPECTED_TARGET || approvalCount !== EXPECTED_TARGET) {
    throw new Error(`SDG_PRICE_RECOVERY_FINAL_COUNT_MISMATCH_${snapshotCount}_${priceCount}_${approvalCount}`);
  }
  const priceSum = Number(valid.reduce((sum, item) => sum + item.price, 0).toFixed(2));
  console.log(JSON.stringify({
    outcome: "SUCCEEDED",
    supplier: SUPPLIER,
    recovered: EXPECTED_TARGET,
    snapshots: snapshotCount,
    prices: priceCount,
    approvals: approvalCount,
    priceSum,
    evidenceSetSha256: EXPECTED_FINGERPRINT,
    stockMaterialised: 0,
    shopifyWrites: 0,
  }));
}

async function main() {
  const email = process.env.SDG_TRADE_EMAIL;
  const password = process.env.SDG_TRADE_PASSWORD;
  if (!email || !password) throw new Error("SDG_PRICE_RECOVERY_CREDENTIALS_REQUIRED");
  const manifest = await loadTargets();
  const session = new SdgPortalSession({ email, password });
  await session.login();
  const valid = await retrieveAndValidate(session, manifest);
  for (let offset = 0, batchIndex = 0; offset < valid.length; offset += 100, batchIndex += 1) {
    await appendBatch(batchIndex, valid.slice(offset, offset + 100));
  }
  await finalProof(valid);
}

void main().catch((error) => {
  console.error(JSON.stringify({
    outcome: "FAILED",
    code: error instanceof Error ? error.message : "SDG_PRICE_RECOVERY_UNEXPECTED_FAILURE",
  }));
  process.exitCode = 1;
});
