import "server-only";
import { randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import { shippingPolicyBlockers } from "./shipping-owner-inputs";
import {
  shippingRuleFromVersion,
  type ShippingParcelClass,
  type ShippingRateVersionRecord,
  type ShippingRule,
  type UkShippingRegion,
} from "./shipping";

const SELECT_COLUMNS = "rate_version_id,region,parcel_class,gross_amount_minor,currency,status,effective_from,created_at";

export interface ShippingRateAdminRecord extends ShippingRule {
  rateVersionId: string;
  effectiveFrom: string;
  createdAt: string;
}

function recordKey(record: Pick<ShippingRule, "region" | "parcelClass">) {
  return `${record.region}:${record.parcelClass}`;
}

export async function currentStagingShippingRates(now: Date = new Date()): Promise<ShippingRateAdminRecord[]> {
  if (Number.isNaN(now.getTime())) throw new Error("SHIPPING_RATE_CONFIGURATION_UNAVAILABLE");
  const { data, error } = await createSupplierServiceClient()
    .from("staging_shipping_rate_versions")
    .select(SELECT_COLUMNS)
    .lte("effective_from", now.toISOString())
    .order("effective_from", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("SHIPPING_RATE_CONFIGURATION_UNAVAILABLE");
  const current = new Map<string, ShippingRateAdminRecord>();
  for (const raw of data ?? []) {
    const row = raw as unknown as ShippingRateVersionRecord;
    const parsed = shippingRuleFromVersion(row);
    const key = recordKey(parsed);
    if (current.has(key)) continue;
    current.set(key, {
      ...parsed,
      rateVersionId: row.rate_version_id,
      effectiveFrom: row.effective_from,
      createdAt: row.created_at,
    });
  }
  return [...current.values()].filter(rule => rule.parcelClass !== "SPECIALIST")
    .sort((left, right) => recordKey(left).localeCompare(recordKey(right)));
}

export async function loadStagingUkShippingRules(): Promise<readonly ShippingRule[]> {
  const rates = await currentStagingShippingRates();
  // Confirming money alone cannot enable delivery before the operating policy.
  return shippingPolicyBlockers().length
    ? rates.map(rate => ({ ...rate, grossAmountMinor: null, status: "AWAITING_OWNER_CONFIRMATION" as const }))
    : rates;
}

export async function appendStagingShippingRate(input: {
  expectedCurrentRateVersionId: string;
  region: UkShippingRegion;
  parcelClass: ShippingParcelClass;
  grossAmountMinor: number | null;
  status: ShippingRule["status"];
  actorId: string;
  reason: string;
  effectiveFrom?: string;
}) {
  const { data, error } = await createSupplierServiceClient().rpc("append_staging_shipping_rate_version", {
    p_rate: {
      rate_version_id: randomUUID(),
      expected_current_rate_version_id: input.expectedCurrentRateVersionId,
      region: input.region,
      parcel_class: input.parcelClass,
      gross_amount_minor: input.grossAmountMinor,
      status: input.status,
      actor_id: input.actorId,
      reason: input.reason,
      effective_from: input.effectiveFrom ?? new Date().toISOString(),
    },
  });
  if (error || !data) throw new Error("SHIPPING_RATE_UPDATE_FAILED");
  return shippingRuleFromVersion({
    ...(data as unknown as ShippingRateVersionRecord),
    created_at: (data as { created_at?: string }).created_at ?? new Date().toISOString(),
  });
}
