import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createSupplierServiceClient } from "@/lib/supabase/supplier-service";

export const MTM_CHANGE_REQUEST_COPY = "Need to request a change? Email us within 2 hours of placing your order at enquiries@curtainsuk.com. We’ll review your request and get in touch.";

export type MtmPaidOrderLifecycleState =
  | "PAID"
  | "CURTAINSUK_REVIEW"
  | "APPROVED_FOR_MANUFACTURE"
  | "WORKROOM_RELEASED"
  | "CHANGE_REQUESTED"
  | "REJECTED";

export type MtmPaidHouseCurtain = {
  snapshotId: string;
  configurationId: string;
  roomId: string;
  roomName: string;
  windowName: string;
  lineOrdinal: number;
};

export type MtmPaidHouse = {
  houseId: string;
  houseRevision: number;
  houseFingerprint: string;
  contractFingerprint: string;
  curtains: readonly MtmPaidHouseCurtain[];
};

export function verifiedShopifyWebhookPayloadSha256(rawBody: Uint8Array): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export async function recordVerifiedMtmPaidOrder(input: {
  snapshotId?: string;
  house?: MtmPaidHouse;
  shopifyOrderGid: string;
  shopifyOrderName: string;
  shopifyDraftOrderGid?: string | null;
  paidAt: string;
  rawWebhookBody: Uint8Array;
}) {
  if ((input.snapshotId ? 1 : 0) + (input.house ? 1 : 0) !== 1) {
    throw new Error("MTM_PAID_ORDER_CONTRACT_INVALID");
  }
  const { data, error } = await createSupplierServiceClient().rpc("record_mtm_paid_order", {
    p_payment: {
      paid_order_id: randomUUID(),
      ...(input.snapshotId ? { snapshot_id: input.snapshotId } : {}),
      ...(input.house ? {
        house_id: input.house.houseId,
        house_revision: input.house.houseRevision,
        house_fingerprint: input.house.houseFingerprint,
        contract_fingerprint: input.house.contractFingerprint,
        curtains: input.house.curtains.map((curtain) => ({
          snapshot_id: curtain.snapshotId,
          configuration_id: curtain.configurationId,
          room_id: curtain.roomId,
          room_name: curtain.roomName,
          window_name: curtain.windowName,
          line_ordinal: curtain.lineOrdinal,
        })),
      } : {}),
      shopify_order_gid: input.shopifyOrderGid,
      shopify_order_name: input.shopifyOrderName,
      shopify_draft_order_gid: input.shopifyDraftOrderGid ?? null,
      paid_at: input.paidAt,
      webhook_payload_sha256: verifiedShopifyWebhookPayloadSha256(input.rawWebhookBody),
    },
  });
  if (error) throw new Error("MTM_PAID_ORDER_RECORD_FAILED");
  return data as { paid_order_id: string; lifecycle_state: MtmPaidOrderLifecycleState; reused: boolean; contract_type: "SINGLE_CURTAIN" | "HOUSE" };
}

export async function transitionMtmPaidOrder(input: {
  paidOrderId: string;
  expectedState: MtmPaidOrderLifecycleState;
  toState: MtmPaidOrderLifecycleState;
  actorId: string;
  reason: string;
}) {
  const { data, error } = await createSupplierServiceClient().rpc("transition_mtm_paid_order", {
    p_transition: {
      paid_order_id: input.paidOrderId,
      expected_state: input.expectedState,
      to_state: input.toState,
      actor_id: input.actorId,
      reason: input.reason,
    },
  });
  if (error) throw new Error("MTM_PAID_ORDER_TRANSITION_FAILED");
  return data as { paid_order_id: string; lifecycle_state: MtmPaidOrderLifecycleState; updated_at: string };
}
