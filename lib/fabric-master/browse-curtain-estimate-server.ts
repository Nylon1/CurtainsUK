import 'server-only';
import { createSupplierServiceClient } from '../supabase/supplier-service';
import type { FabricMasterRecord } from './types';
import { browseCurtainEstimate } from './browse-curtain-estimate';
import { selectCurrentApprovedSupplierCostMinor, type SupplierPriceSnapshotCandidate, type SupplierPromotionObservation } from './verified-supplier-price';

/** Bounded page read, using checkout's approved-price selector. No per-card HTTP requests. */
export async function browseCurtainEstimates(records: FabricMasterRecord[]) {
  if (records.length > 48) throw Error('RETAIL_PAGE_TOO_LARGE');
  const result = new Map<string, ReturnType<typeof browseCurtainEstimate>>();
  if (!records.length) return result;
  const db = createSupplierServiceClient();
  type Candidate = SupplierPriceSnapshotCandidate & {supplier_id: string; supplier_sku: string};
  const snapshots: Candidate[] = [];
  const events: SupplierPromotionObservation[] = [];
  // A pathological history fails closed rather than slowing down the whole catalogue.
  const signal = AbortSignal.timeout(1800);
  for (let from = 0; from < 5000; from += 500) {
    const {data, error} = await db.from('supplier_snapshots')
      .select('supplier_id,supplier_sku,snapshot_id,checked_at,price_expires_at,prices:supplier_snapshot_prices!inner(standard_trade_price,cut_trade_price,currency)')
      .in('supplier_id', [...new Set(records.map(r => r.supplier_id))])
      .in('supplier_sku', [...new Set(records.map(r => r.supplier_sku))])
      .eq('validation_status', 'VALIDATED').order('checked_at', {ascending:false}).order('snapshot_id', {ascending:false})
      .range(from, from + 499).abortSignal(signal);
    if (error) throw Error('BROWSE_CURTAIN_ESTIMATE_UNAVAILABLE');
    const page = (data ?? []) as Candidate[];
    if (page.length) {
      // Paginate events as well: never lose a later revocation to the API row limit.
      for (let offset = 0; ; offset += 500) {
        const {data: approvals, error: approvalError} = await db.from('supplier_promotion_events')
          .select('snapshot_id,promotion_state,created_at')
          .in('snapshot_id', page.map(s => s.snapshot_id))
          .order('created_at', {ascending:false}).order('event_id', {ascending:false})
          .range(offset, offset + 499).abortSignal(signal);
        if (approvalError || offset >= 5000) throw Error('BROWSE_CURTAIN_ESTIMATE_UNAVAILABLE');
        events.push(...((approvals ?? []) as SupplierPromotionObservation[]));
        if ((approvals ?? []).length < 500) break;
      }
      snapshots.push(...page);
    }
    if (page.length < 500) {
      const now = new Date();
      for (const record of records) {
        const cost = selectCurrentApprovedSupplierCostMinor({
          supplierId: record.supplier_id,
          snapshots: snapshots.filter(s => s.supplier_id === record.supplier_id && s.supplier_sku === record.supplier_sku),
          promotionEvents: events, now,
        });
        result.set(record.fabric_id, browseCurtainEstimate(record, cost));
      }
      return result;
    }
  }
  throw Error('BROWSE_CURTAIN_ESTIMATE_UNAVAILABLE');
}
