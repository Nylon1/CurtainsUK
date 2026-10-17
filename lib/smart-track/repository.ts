import "server-only";
import { createSupplierServiceClient } from "../supabase/supplier-service";
import { cushionOwnerHash } from "../cushion-studio/hosted-repository";
import type { ShopifyAppProxyContext } from "../storefront/security/shopify-app-proxy-core";
import {
  executeShopifyDraftOrder,
  shopifyDraftOrderConfigFromEnvironment,
} from "../storefront/shopify-draft-order-server";
import type { TrackCheckoutGroup, SmartTrackServices } from "./checkout";
import { trackPackage } from "./package";
import {
  smartTrackEnabled,
  smartTrackPurchasesEnabled,
  trackFabricWeight,
} from "./server";
export function createTrackServices(
  context: ShopifyAppProxyContext,
): SmartTrackServices | undefined {
  if (!smartTrackEnabled()) return;
  const owner = () => cushionOwnerHash(context);
  return {
    package: trackPackage,
    purchasesEnabled: smartTrackPurchasesEnabled(),
    fabricWeight: trackFabricWeight,
    async existing(key) {
      const { data, error } = await createSupplierServiceClient()
        .from("smart_track_checkout_groups")
        .select("payload")
        .eq("idempotency_key", key)
        .eq("owner_session_hash", owner())
        .maybeSingle();
      if (error) throw Error("TRACK_PERSISTENCE_FAILED");
      return (data?.payload as TrackCheckoutGroup) ?? null;
    },
    async persist(key, group) {
      const { error } = await createSupplierServiceClient().rpc(
        "commit_smart_track_checkout",
        { p_owner: owner(), p_key: key, p_group: group },
      );
      if (error) throw Error("TRACK_PERSISTENCE_FAILED");
    },
    async execute(key, contract) {
      const config = shopifyDraftOrderConfigFromEnvironment();
      if (
        !smartTrackPurchasesEnabled() ||
        config?.mode !== "CREATE_PRODUCTION_DRAFT"
      )
        throw Error("TRACK_PURCHASE_DISABLED");
      return executeShopifyDraftOrder({
        contract,
        config,
        claimCreate: async () => {
          const { data, error } = await createSupplierServiceClient().rpc(
            "claim_smart_track_draft_creation",
            { p_owner: owner(), p_key: key },
          );
          if (error) throw Error("TRACK_PERSISTENCE_FAILED");
          return data === true;
        },
      });
    },
  };
}
