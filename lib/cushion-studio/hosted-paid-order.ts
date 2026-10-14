import "server-only";
import { createSupplierServiceClient } from "../supabase/supplier-service";
import {
  processCushionPaidOrder,
  verifyPersistedCushionPayment,
} from "./paid-order";
import {
  hostedCushionSnapshot,
  recordHostedCushionManifest,
} from "./hosted-repository";
import {
  shopifyDraftOrderConfigFromEnvironment,
  verifyCushionPaidDraftLink,
} from "../storefront/shopify-draft-order-server";
import {
  housePaymentFromShopify,
  shopifyOrderAttributes,
  type ShopifyPaidLine,
} from "../storefront/mtm-house-paid-webhook";
import { createHash } from "node:crypto";
import type { CushionOrderSnapshot } from "./repository";
import type { ShopifyDraftOrderExecutionContract } from "../storefront/shopify-draft-order-core";

export function hasCushionPaidLines(payload: unknown) {
  const lines = (
    payload as {
      line_items?: { properties?: { name?: string; value?: string }[] }[];
    }
  )?.line_items;
  return (
    Array.isArray(lines) &&
    lines.some((line) =>
      line.properties?.some(
        (property) =>
          property.name === "_curtainsuk_cushion_snapshot_id" ||
          (property.name === "_curtainsuk_product_type" &&
            property.value === "CUSHION"),
      ),
    )
  );
}

/** Native mixed-domain manifest stays in staff review; no workroom release,
 * customer email, inventory mutation or fulfilment call is made here. */
export async function recordHostedCushionPaidOrder(
  raw: Uint8Array,
  signature: string | null,
) {
  if (
    process.env.CUSHION_STUDIO_HOSTED_ENABLED !== "true" ||
    process.env.CUSHION_STUDIO_WEBHOOK_ENABLED !== "true"
  )
    throw new Error("CUSHION_WEBHOOK_DISABLED");
  return processCushionPaidOrder(raw, signature, {
    secret: process.env.CURTAINSUK_SHOPIFY_APP_SECRET ?? "",
    snapshot: hostedCushionSnapshot,
    record: recordHostedCushionManifest,
    async verifyOrder(payload, manifest) {
      const attributes = shopifyOrderAttributes(
        payload.note_attributes as Parameters<typeof shopifyOrderAttributes>[0],
      );
      const key = attributes.get("curtainsuk_cushion_checkout_key");
      if (!key || !/^[A-Za-z0-9-]{8,100}$/.test(key))
        throw new Error("CUSHION_PAID_CHECKOUT_BINDING_INVALID");
      const { data, error } = await createSupplierServiceClient()
        .from("cushion_checkout_groups")
        .select("snapshots,contract")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error || !data)
        throw new Error("CUSHION_PAID_CHECKOUT_BINDING_INVALID");
      const group = data as {
        snapshots: CushionOrderSnapshot[];
        contract: ShopifyDraftOrderExecutionContract;
      };
      verifyPersistedCushionPayment(payload, manifest, group);
      const config = shopifyDraftOrderConfigFromEnvironment();
      if (!config) throw new Error("CUSHION_PAID_DRAFT_LINK_INVALID");
      const draftId = await verifyCushionPaidDraftLink({
        contract: group.contract,
        orderGid: String(manifest.orderGid),
        config,
      });
      const curtains = (payload.line_items as ShopifyPaidLine[]).filter(
        (line) =>
          (line.properties ?? []).some(
            (property) => property.name === "_curtainsuk_snapshot_id",
          ),
      );
      if (!curtains.length)
        return { verifiedDraftOrderGid: draftId, checkoutKey: key };
      const contractAttributes = shopifyOrderAttributes(
        group.contract.input.customAttributes,
      );
      const house = housePaymentFromShopify({
        orderAttributes: contractAttributes,
        lineItems: curtains,
      });
      const snapshotId = contractAttributes.get("curtainsuk_snapshot_id");
      if (!house && !snapshotId)
        throw new Error("CUSHION_NATIVE_CURTAIN_CONTRACT_REQUIRED");
      // Stable ID keeps native lifecycle retry identity unchanged. The SQL
      // manifest transaction invokes the existing record_mtm_paid_order RPC.
      const hex = createHash("sha256")
        .update(`mixed-paid:${manifest.orderGid}`)
        .digest("hex");
      const paidId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
      return {
        verifiedDraftOrderGid: draftId,
        checkoutKey: key,
        nativeCurtainPayment: {
          paid_order_id: paidId,
          ...(house
            ? {
                house_id: house.houseId,
                house_revision: house.houseRevision,
                house_fingerprint: house.houseFingerprint,
                contract_fingerprint: house.contractFingerprint,
                curtains: house.curtains.map((c) => ({
                  snapshot_id: c.snapshotId,
                  configuration_id: c.configurationId,
                  room_id: c.roomId,
                  room_name: c.roomName,
                  window_name: c.windowName,
                  line_ordinal: c.lineOrdinal,
                })),
              }
            : { snapshot_id: snapshotId }),
          shopify_order_gid: manifest.orderGid,
          shopify_order_name: manifest.orderName,
          shopify_draft_order_gid: draftId,
          paid_at: manifest.paidAt,
          webhook_payload_sha256: createHash("sha256")
            .update(raw)
            .digest("hex"),
        },
      };
    },
    async curtainPacket(id, line) {
      if (!/^[a-f0-9-]{36}$/i.test(id))
        throw new Error("CUSHION_CURTAIN_SNAPSHOT_INVALID");
      const { data, error } = await createSupplierServiceClient()
        .from("staging_configuration_snapshots")
        .select("*")
        .eq("snapshot_id", id)
        .maybeSingle();
      if (error || !data)
        throw new Error("CUSHION_CURTAIN_SNAPSHOT_UNAVAILABLE");
      const props = new Map(
        (line.properties ?? []).map((property) => [
          property.name,
          property.value,
        ]),
      );
      if (
        props.get("_curtainsuk_configuration_id") !== data.configuration_id ||
        line.quantity !== 1 ||
        Number(line.price) !== Number(data.customer_price_minor) / 100 ||
        Number(line.total_discount ?? 0) !== 0
      )
        throw new Error("CUSHION_CURTAIN_PAID_MISMATCH");
      return {
        version: 1,
        productType: "CURTAIN",
        snapshotId: id,
        configurationId: data.configuration_id,
        manufacturing: data,
      };
    },
  });
}
