import assets from './assets.json';
import fixed140 from './fixed140-assignments.json';
import type {searchRetailFabrics} from '../fabric-master/retail-repository';
import {withRoomPreview} from './server';

const PAGE_SIZE = 24;
const MAX_SOURCE_PAGES = 16;
const ALLOWED_FILTERS = ['query', 'colour', 'pattern'] as const;
const candidateIds = new Set([
  ...assets.fabrics.map(fabric => fabric.fabricId),
  ...Object.keys(fixed140.assignments),
]);

// Browse still supplies the live catalogue facts, ordering, and governed
// filters. The approved STANDARD manifest and FIXED140 assignment registry
// only restrict which identities the visualiser may hydrate; neither is a
// second catalogue.
export async function searchVisualiserFabrics(
  params: URLSearchParams,
  browse?: typeof searchRetailFabrics,
) {
  browse ??= (await import('../fabric-master/retail-repository')).searchRetailFabrics;
  const requested = Number(params.get('cursor'));
  let position = Number.isSafeInteger(requested) && requested >= 0 && requested <= 240_000 ? requested : 0;
  const filters = new URLSearchParams();
  for (const key of ALLOWED_FILTERS) {
    const value = params.get(key);
    if (value) filters.set(key, value);
  }
  const fabrics: ReturnType<typeof withRoomPreview<Awaited<ReturnType<typeof searchRetailFabrics>>['fabrics'][number]>>[] = [];
  let facets: Awaited<ReturnType<typeof searchRetailFabrics>>['facets'] | null = null;
  let sourceTotal = 240_000;
  let scannedPages = 0;
  while (position < sourceTotal && scannedPages < MAX_SOURCE_PAGES) {
    const query = new URLSearchParams(filters);
    query.set('page', String(Math.floor(position / PAGE_SIZE) + 1));
    const result = await browse(query, {includeIntelligence: false, candidateIds});
    scannedPages++;
    facets ??= result.facets;
    sourceTotal = result.total;
    const sourceIds = result.sourceIds;
    if (!sourceIds) throw new Error('VISUALISER_CATALOGUE_SOURCE_IDS_MISSING');
    const byId = new Map(result.fabrics.map(fabric => [fabric.id, fabric]));
    for (let index = position % PAGE_SIZE; index < sourceIds.length; index++) {
      const record = byId.get(sourceIds[index]);
      const preview = record && withRoomPreview(record);
      // Current catalogue status and approved physical-scale metadata must
      // both pass; a manifest ID alone never makes a card selectable.
      if (preview?.roomPreview.available) {
        if (fabrics.length === PAGE_SIZE) return {fabrics, nextCursor: position, facets, refineSearch: false};
        fabrics.push(preview);
      }
      position++;
    }
    if (sourceIds.length < PAGE_SIZE) break;
  }
  // Never turn a sparse, uncompleted scan into a false "no matches" page or
  // an unbounded customer request. A broad sparse filter asks for refinement;
  // partial pages with actual matches can continue from their cursor.
  const scanIncomplete = scannedPages === MAX_SOURCE_PAGES && position < sourceTotal;
  return {fabrics, nextCursor: scanIncomplete && fabrics.length ? position : null,
    facets, refineSearch: scanIncomplete && fabrics.length === 0};
}
