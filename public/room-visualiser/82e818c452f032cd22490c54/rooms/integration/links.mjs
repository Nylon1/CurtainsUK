// Review integration contracts. No requests, commerce events or local storage.
export const ROOM_VISUALISER_PATH = '/pages/room-visualiser';
export const STOREFRONT_ORIGIN = 'https://www.curtainsuk.com';
const FABRIC_ID = /^[a-zA-Z0-9-]{1,150}$/;

export function requireFabricId(value) {
  if (typeof value !== 'string' || !FABRIC_ID.test(value)) throw Error('INVALID_FABRIC_MASTER_ID');
  return value;
}

export function roomVisualiserHref(fabricId) {
  return fabricId == null ? ROOM_VISUALISER_PATH : `${ROOM_VISUALISER_PATH}?fabric=${encodeURIComponent(requireFabricId(fabricId))}`;
}

export function readPreselectedFabric(search) {
  const params = new URLSearchParams(search);
  if (!params.has('fabric')) return null;
  if (params.getAll('fabric').length !== 1) throw Error('AMBIGUOUS_FABRIC_MASTER_ID');
  return requireFabricId(params.get('fabric'));
}

export function candidateLinksEnabled({themeRole, enabled}) {
  return (themeRole === 'unpublished' || themeRole === 'development') && enabled === true;
}

/** Supply fabricProfileUrl from the existing customer projection/manifest, never a query parameter. */
export function existingCommerceHandoffs({id, fabricProfileUrl, sampleAvailable, orderReady}) {
  requireFabricId(id);
  const fallback = new URL('/pages/fabric-library', STOREFRONT_ORIGIN);
  fallback.searchParams.set('view', 'browse-fabrics');
  fallback.searchParams.set('fabric', id);
  let profile = fallback.href;
  if (fabricProfileUrl != null) {
    const published = new URL(fabricProfileUrl, STOREFRONT_ORIGIN);
    if (published.origin !== STOREFRONT_ORIGIN || published.username || published.password
      || !published.pathname.startsWith(`/pages/fabric/${id}-`) || published.search || published.hash) {
      throw Error('INVALID_CANONICAL_FABRIC_PROFILE');
    }
    profile = published.href;
  }
  const make = new URL('/pages/curtain-visualiser', STOREFRONT_ORIGIN);
  make.searchParams.set('fabric', id);
  return {
    viewFabric: profile,
    sample: sampleAvailable === true ? profile : null,
    makeCurtains: orderReady === true ? make.href : null
  };
}
