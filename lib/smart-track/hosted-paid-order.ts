import "server-only";
import { createSupplierServiceClient } from "../supabase/supplier-service";
import {
  shopifyDraftOrderConfigFromEnvironment,
  verifyCushionPaidDraftLink,
} from "../storefront/shopify-draft-order-server";
import { processSmartTrackPaidOrder } from "./paid-order";
export async function recordHostedSmartTrackPaidOrder(
  raw: Uint8Array,
  signature: string | null,
) {
  if (process.env.CURTAINSUK_SMART_TRACK_WEBHOOK_ENABLED !== "true")
    throw Error("TRACK_WEBHOOK_DISABLED");
  return processSmartTrackPaidOrder(raw, signature, {
    secret: process.env.CURTAINSUK_SHOPIFY_APP_SECRET ?? "",
    async group(key) {
      const { data, error } = await createSupplierServiceClient()
        .from("smart_track_checkout_groups")
        .select("payload")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) throw Error("TRACK_PAID_PERSISTENCE_FAILED");
      return data?.payload ?? null;
    },
    async verifyDraft(group, orderGid) {
      const config = shopifyDraftOrderConfigFromEnvironment();
      if (!config) throw Error("TRACK_PAID_DRAFT_INVALID");
      return verifyCushionPaidDraftLink({
        contract: group.contract,
        orderGid,
        config,
      });
    },
    async record(orderGid, manifest) {
      const { data, error } = await createSupplierServiceClient().rpc(
        "record_smart_track_paid_manifest",
        { p_order: orderGid, p_manifest: manifest },
      );
      if (error) throw Error("TRACK_PAID_PERSISTENCE_FAILED");
      return data;
    },
  });
}
