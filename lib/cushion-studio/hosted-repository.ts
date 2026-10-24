import "server-only";
import { createHash } from "node:crypto";
import { createSupplierServiceClient } from "../supabase/supplier-service";
import type { ShopifyAppProxyContext } from "../storefront/security/shopify-app-proxy-core";
import type { CushionDesign } from "./domain";
import type { CushionOrderSnapshot, SavedCushionDesign } from "./repository";
import type { ShopifyDraftOrderExecutionContract } from "../storefront/shopify-draft-order-core";

export function cushionOwnerHash(context: ShopifyAppProxyContext) {
  if (!context.loggedInCustomerId || !/^\d+$/.test(context.loggedInCustomerId))
    throw new Error("CUSHION_SIGN_IN_REQUIRED");
  return createHash("sha256")
    .update(`cushion-owner-v1:${context.shop}:${context.loggedInCustomerId}`)
    .digest("hex");
}
/** My Home purchases are bound to the browser's random checkout attempt, while
 * saved Cushion Studio designs remain bound to a signed-in customer. */
export function myHomeCheckoutOwnerHash(
  context: ShopifyAppProxyContext,
  idempotencyKey: string,
) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(idempotencyKey))
    throw new Error("MY_HOME_CHECKOUT_INVALID");
  return createHash("sha256")
    .update(`my-home-checkout-v1:${context.shop}:${idempotencyKey.toLowerCase()}`)
    .digest("hex");
}
function databaseError(error: unknown) {
  if (error) throw new Error("CUSHION_PERSISTENCE_UNAVAILABLE");
}
export function createHostedCushionRepository(ownerHash: string) {
  if (!/^[a-f0-9]{64}$/.test(ownerHash))
    throw new Error("CUSHION_OWNER_INVALID");
  const db = createSupplierServiceClient();
  return {
    async load(id: string): Promise<SavedCushionDesign | null> {
      const { data, error } = await db
        .from("cushion_designs")
        .select("design,revision,updated_at")
        .eq("owner_session_hash", ownerHash)
        .eq("design_id", id)
        .maybeSingle();
      databaseError(error);
      return data
        ? {
            design: data.design,
            revision: data.revision,
            updatedAt: data.updated_at,
          }
        : null;
    },
    async list(): Promise<SavedCushionDesign[]> {
      const { data, error } = await db
        .from("cushion_designs")
        .select("design,revision,updated_at")
        .eq("owner_session_hash", ownerHash)
        .order("updated_at", { ascending: false })
        .limit(100);
      databaseError(error);
      return (data ?? []).map((row) => ({
        design: row.design,
        revision: row.revision,
        updatedAt: row.updated_at,
      }));
    },
    async save(
      design: CushionDesign,
      revision: number,
    ): Promise<SavedCushionDesign> {
      if (!Number.isSafeInteger(revision) || revision < 0)
        throw new Error("CUSHION_REVISION_REQUIRED");
      const { data, error } = await db.rpc("save_cushion_design", {
        p_owner: ownerHash,
        p_design: design,
        p_revision: revision,
      });
      if (
        error?.code === "23505" ||
        error?.message?.includes("CUSHION_REVISION_CONFLICT")
      )
        throw new Error("CUSHION_REVISION_CONFLICT");
      databaseError(error);
      return data as SavedCushionDesign;
    },
    async appendCheckout(input: {
      key: string;
      snapshots: CushionOrderSnapshot[];
      contract: ShopifyDraftOrderExecutionContract;
    }) {
      const { error } = await db.rpc("commit_cushion_checkout", {
        p_owner: ownerHash,
        p_key: input.key,
        p_snapshots: input.snapshots,
        p_contract: input.contract,
      });
      databaseError(error);
    },
    async checkout(key: string): Promise<{
      snapshots: CushionOrderSnapshot[];
      contract: ShopifyDraftOrderExecutionContract;
    } | null> {
      const { data, error } = await db
        .from("cushion_checkout_groups")
        .select("snapshots,contract")
        .eq("idempotency_key", key)
        .eq("owner_session_hash", ownerHash)
        .maybeSingle();
      databaseError(error);
      return data;
    },
    async claimCreate(key: string) {
      const { data, error } = await db.rpc("claim_cushion_draft_creation", {
        p_owner: ownerHash,
        p_key: key,
      });
      databaseError(error);
      return data === true;
    },
  };
}
export async function hostedCushionSnapshot(
  id: string,
): Promise<CushionOrderSnapshot | null> {
  const { data, error } = await createSupplierServiceClient()
    .from("cushion_order_snapshots")
    .select("*")
    .eq("snapshot_id", id)
    .maybeSingle();
  databaseError(error);
  if (!data) return null;
  return {
    version: 1,
    productType: "CUSHION",
    id: data.snapshot_id,
    designId: data.design_id,
    createdAt: data.created_at,
    spec: data.spec,
    specSha256: data.spec_sha256,
    fabricIdentity: data.fabric_identity,
    rulesVersion: data.rules_version,
    price: {
      currency: "GBP",
      goodsGrossMinor: Number(data.goods_gross_minor),
      goodsVatMinor: Number(data.goods_vat_minor),
    },
    manufacturing: data.manufacturing,
    commercial: data.commercial,
    revalidatedAt: data.revalidated_at,
  };
}
export async function recordHostedCushionManifest(
  orderGid: string,
  manifest: Record<string, unknown>,
) {
  const { data, error } = await createSupplierServiceClient().rpc(
    "record_cushion_paid_manifest",
    { p_order: orderGid, p_manifest: manifest },
  );
  databaseError(error);
  return data as { duplicate: boolean };
}
