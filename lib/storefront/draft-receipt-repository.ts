import 'server-only';
import { createSupplierServiceClient } from '../supabase/supplier-service';

export function myHomeDraftReceipt(input: {
  kind: 'CUSHION' | 'SMART_TRACK'; owner: string; key: string; tag: string;
}) {
  const db = createSupplierServiceClient();
  return {
    async load(): Promise<string | null> {
      const {data,error} = await db.from('my_home_draft_receipts')
        .select('shopify_draft_order_gid,idempotency_tag')
        .eq('checkout_kind',input.kind).eq('idempotency_key',input.key)
        .eq('owner_session_hash',input.owner).maybeSingle();
      if (error) throw Error('MY_HOME_DRAFT_RECEIPT_UNAVAILABLE');
      if (data && data.idempotency_tag !== input.tag) throw Error('MY_HOME_DRAFT_RECEIPT_CONFLICT');
      return data?.shopify_draft_order_gid ?? null;
    },
    async save(id: string) {
      const {error} = await db.rpc('record_my_home_draft_receipt',{
        p_kind:input.kind,p_owner:input.owner,p_key:input.key,p_tag:input.tag,p_draft_gid:id,
      });
      if (error) throw Error('MY_HOME_DRAFT_RECEIPT_UNAVAILABLE');
    },
  };
}
