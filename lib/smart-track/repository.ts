import "server-only";
import { createSupplierServiceClient } from "../supabase/supplier-service";
import { cushionOwnerHash, myHomeCheckoutOwnerHash } from "../cushion-studio/hosted-repository";
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
  const owner = (key: string) => myHomeCheckoutOwnerHash(context, key);
  const legacyOwner = context.loggedInCustomerId ? cushionOwnerHash(context) : null;
  const executionOwners = new Map<string, string>();
  const checkout = async (key: string, ownerHash: string) => {
    const { data, error } = await createSupplierServiceClient()
      .from("smart_track_checkout_groups")
      .select("payload")
      .eq("idempotency_key", key)
      .eq("owner_session_hash", ownerHash)
      .maybeSingle();
    if (error) throw Error("TRACK_PERSISTENCE_FAILED");
    return (data?.payload as TrackCheckoutGroup) ?? null;
  };
  return {
    package: trackPackage,
    purchasesEnabled: smartTrackPurchasesEnabled(),
    fabricWeight: trackFabricWeight,
    async existing(key) {
      const currentOwner = owner(key);
      const current = await checkout(key, currentOwner);
      if (current) {
        executionOwners.set(key, currentOwner);
        return current;
      }
      if (!legacyOwner) return null;
      const previous = await checkout(key, legacyOwner);
      if (previous) executionOwners.set(key, legacyOwner);
      return previous;
    },
    async persist(key, group) {
      const currentOwner = owner(key);
      const { error } = await createSupplierServiceClient().rpc(
        "commit_smart_track_checkout",
        { p_owner: currentOwner, p_key: key, p_group: group },
      );
      if (error) throw Error("TRACK_PERSISTENCE_FAILED");
      executionOwners.set(key, currentOwner);
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
            { p_owner: executionOwners.get(key) ?? owner(key), p_key: key },
          );
          if (error) throw Error("TRACK_PERSISTENCE_FAILED");
          return data === true;
        },
      });
    },
  };
}
