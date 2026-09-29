import { NAILA_PREPARED_CONTRACT } from '../../fabric-master/naila-prepared-browse';

/** Shared by the signed gateway and owner bridge; changing transport never
 * changes the governed filters, price level, or prepared-only requirement. */
export function nailaCatalogPath(path: string) {
  const url = new URL(path, 'https://www.curtainsuk.com');
  if (url.pathname.endsWith('/catalog') && url.searchParams.get('naila') === '1' && !url.searchParams.has('fabric'))
    url.pathname = url.pathname.replace(/\/catalog$/, '/naila-catalog');
  return url.pathname + url.search;
}

/** The caller must authenticate the app-proxy request before invoking this.
 * An unavailable dedicated route must never be replaced with ordinary Browse. */
export async function serveNailaCatalog<T>(params: URLSearchParams, enabled: boolean,
  search: (params: URLSearchParams) => Promise<T>) {
  if (!enabled) throw Error('HCI_DISABLED');
  if (params.get('view') !== 'retail' || params.has('fabric')) throw Error('NAILA_PREPARED_BROWSE_UNAVAILABLE');
  const result = await search(params);
  return { ...result, preparedBrowse: { contract: NAILA_PREPARED_CONTRACT, source: 'prepared_hci' as const } };
}
