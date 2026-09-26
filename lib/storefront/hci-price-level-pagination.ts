const projectionPageSize = 1_000;
// Every page evaluates the same governed price projection. Keep this lane
// serial so one customer request cannot multiply that database work and cause
// statement-timeout contention while still collecting the exact full tier.
const projectionConcurrency = 1;
type ProjectionRow = { fabric_id?: unknown };
export type ProjectionPage = { data: ProjectionRow[] | null; error: unknown; count: number | null };
type ProjectionPageReader = (from: number, to: number, exactCount: boolean) => Promise<ProjectionPage>;

export function requiresRetailGuideProjection(
  selectedPriceLevel: string | undefined,
  calibrationNeedsEligibility: boolean,
  styleDirectionsNeedEligibility: boolean,
) {
  return Boolean(selectedPriceLevel && (calibrationNeedsEligibility || styleDirectionsNeedEligibility));
}

export async function collectRetailGuideProjection(readPage: ProjectionPageReader) {
  const first = await readPage(0, projectionPageSize - 1, true);
  if (first.error) throw Error('RETAIL_GUIDE_PRICE_PROJECTION_UNAVAILABLE');
  const pages: ProjectionRow[][] = [first.data ?? []];
  if (typeof first.count === 'number') {
    if (!Number.isSafeInteger(first.count) || first.count < pages[0]!.length)
      throw Error('RETAIL_GUIDE_PRICE_PROJECTION_INVALID');
    const starts = Array.from(
      { length: Math.max(0, Math.ceil(first.count / projectionPageSize) - 1) },
      (_, index) => (index + 1) * projectionPageSize,
    );
    for (let index = 0; index < starts.length; index += projectionConcurrency) {
      const group = starts.slice(index, index + projectionConcurrency);
      const results = await Promise.all(group.map((from) =>
        readPage(from, Math.min(from + projectionPageSize - 1, first.count! - 1), false),
      ));
      for (const result of results) {
        if (result.error) throw Error('RETAIL_GUIDE_PRICE_PROJECTION_UNAVAILABLE');
        pages.push(result.data ?? []);
      }
    }
    if (pages.reduce((total, page) => total + page.length, 0) !== first.count)
      throw Error('RETAIL_GUIDE_PRICE_PROJECTION_INVALID');
  } else {
    for (let from = projectionPageSize; pages.at(-1)!.length === projectionPageSize; from += projectionPageSize) {
      const page = await readPage(from, from + projectionPageSize - 1, false);
      if (page.error) throw Error('RETAIL_GUIDE_PRICE_PROJECTION_UNAVAILABLE');
      pages.push(page.data ?? []);
    }
  }
  const ids = pages.flat().map((row) => row.fabric_id).filter((id): id is string =>
    typeof id === 'string' && /^[-a-zA-Z0-9]{1,150}$/.test(id),
  );
  if (ids.length !== pages.reduce((total, page) => total + page.length, 0) || new Set(ids).size !== ids.length)
    throw Error('RETAIL_GUIDE_PRICE_PROJECTION_INVALID');
  return ids.sort();
}
