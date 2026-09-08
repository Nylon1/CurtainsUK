import "server-only";
import { allocateVatFromGross } from "./shopify-draft-order-core";
import { randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";
import type { StagingCheckoutHandoff } from "./checkout-gates";
import type { ShopifyDraftOrderExecutionResult } from "./shopify-draft-order-server";

export async function persistShopifyDraftOrderExecution(input: {
  handoff: Readonly<StagingCheckoutHandoff>;
  execution: Exclude<ShopifyDraftOrderExecutionResult, { status: "DISABLED" }>;
  executedBy: string;
}) {
  const expected = input.handoff.snapshot;
  const shippingGrossAmountMinor = expected.shipping.grossAmountMinor;
  if (expected.shipping.status !== "READY" || shippingGrossAmountMinor === null) {
    throw new Error("SHOPIFY_DRAFT_ORDER_EXECUTION_SHIPPING_INVALID");
  }
  const shippingVatAmountMinor = allocateVatFromGross(shippingGrossAmountMinor, expected.customerPrice.vatRateBasisPoints);
  const { data, error } = await createSupplierServiceClient().rpc(
    "record_staging_checkout_execution",
    {
      p_execution: {
        execution_id: randomUUID(),
        handoff_id: input.handoff.handoffId,
        snapshot_id: expected.snapshotId,
        execution_mode: input.execution.status === "CALCULATED"
          ? "CALCULATE_ONLY"
          : "CREATE_TEST_DRAFT",
        execution_status: input.execution.status,
        shopify_draft_order_gid: input.execution.draftOrderId,
        shopify_draft_order_name: input.execution.draftOrderName,
        shopify_write_performed: input.execution.shopifyWritePerformed,
        checkout_url_issued: input.execution.checkoutUrl !== null,
        payment_enabled: false,
        financial_verification: {
          currency: "GBP",
          taxes_included: true,
          goods_gross_amount_minor: expected.customerPrice.grossAmountMinor,
          goods_vat_amount_minor: expected.customerPrice.vatAmountMinor,
          shipping_gross_amount_minor: shippingGrossAmountMinor,
          shipping_vat_amount_minor: shippingVatAmountMinor,
          order_gross_amount_minor: expected.customerPrice.grossAmountMinor
            + shippingGrossAmountMinor,
          order_vat_amount_minor: expected.customerPrice.vatAmountMinor
            + shippingVatAmountMinor,
          discount_amount_minor: 0,
        },
        executed_by: input.executedBy,
      },
    },
  );
  if (error) throw new Error("SHOPIFY_DRAFT_ORDER_EXECUTION_PERSISTENCE_FAILED");
  return data as Record<string, unknown>;
}


/** Recover by the durable receipt, avoiding Shopify's eventually indexed tag search. */
export async function persistedShopifyDraftOrderId(handoffId: string): Promise<string | null> {
  const {data,error} = await createSupplierServiceClient().from("staging_checkout_executions")
    .select("shopify_draft_order_gid").eq("handoff_id",handoffId)
    .not("shopify_draft_order_gid","is",null);
  if(error) throw new Error("SHOPIFY_DRAFT_ORDER_RECEIPT_UNAVAILABLE");
  const ids = [...new Set((data ?? []).map(row => String(row.shopify_draft_order_gid)))];
  if(ids.length > 1) throw new Error("SHOPIFY_DRAFT_ORDER_DUPLICATE");
  return ids[0] ?? null;
}
