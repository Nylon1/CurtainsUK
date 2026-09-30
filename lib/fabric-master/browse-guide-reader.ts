import { createSupplierServiceClient } from '../supabase/supplier-service';

type BrowseControl = { active_generation: string | null; next_time_change_at: string | null } | null;
type GuideRow = { guide_minor: unknown } | null;

interface BrowseGuideReads {
  control(): Promise<BrowseControl>;
  hasDirtyRows(): Promise<boolean>;
  prepared(fabricId: string, generationId: string): Promise<GuideRow>;
  current(supplierId: string, supplierSku: string): Promise<GuideRow>;
}

function validGuideMinor(row: GuideRow) {
  const amount = row?.guide_minor;
  return typeof amount === 'number' && Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

/** Match Browse's active prepared generation, including its stale-generation fallback. */
export async function resolveBrowseGuideMinor(input: {
  fabricId: string;
  supplierId: string;
  supplierSku: string;
  preparedEnabled: boolean;
  now?: Date;
}, reads: BrowseGuideReads) {
  if (input.preparedEnabled) {
    const control = await reads.control();
    const nextChange = control?.next_time_change_at === 'infinity' ? Infinity : control?.next_time_change_at ? Date.parse(control.next_time_change_at) : NaN;
    if (control?.active_generation && (input.now ?? new Date()).getTime() < nextChange && !(await reads.hasDirtyRows())) {
      return validGuideMinor(await reads.prepared(input.fabricId, control.active_generation));
    }
  }
  return validGuideMinor(await reads.current(input.supplierId, input.supplierSku));
}

/** Customer guide only. Configuration, checkout and MTM retain their own price authority. */
export async function browseGuideMinorForFabric(fabricId: string, supplierId: string, supplierSku: string) {
  const db = createSupplierServiceClient();
  const row = async <T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> => {
    const { data, error } = await query;
    if (error) throw new Error('BROWSE_GUIDE_UNAVAILABLE');
    return data;
  };
  return resolveBrowseGuideMinor({
    fabricId, supplierId, supplierSku,
    preparedEnabled: process.env.CURTAINSUK_BROWSE_READ_PROJECTION === 'enabled',
  }, {
    control: () => row(db.from('browse_projection_control').select('active_generation,next_time_change_at').limit(1).maybeSingle()),
    hasDirtyRows: async () => !!(await row(db.from('browse_projection_dirty').select('fabric_id').limit(1).maybeSingle())),
    prepared: (id, generation) => row(db.from('browse_read_projection').select('guide_minor').eq('generation_id', generation).eq('fabric_id', id).maybeSingle()),
    current: (supplier, sku) => row(db.from('browse_current_guide_prices_set_v1').select('guide_minor').eq('supplier_id', supplier).eq('supplier_sku', sku).maybeSingle()),
  });
}
