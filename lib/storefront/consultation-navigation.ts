import { fullUrl } from '@/lib/sitemap-utils';

export function isPremiumConsultationPath(pathname: string) {
  return pathname.replace(/\/$/, '') === '/curtain-consultation-premium';
}

/** Existing customer destinations. Use the catalogue's published profile URL,
 * never manufacture a slug from a design name or load the full sitemap in the UI. */
export function consultationFabricLinks(fabricId: string, profileUrl?: string) {
  const base = fullUrl('/');
  const query = new URLSearchParams({ fabric: fabricId });
  let profile: URL | null = null;
  if (profileUrl) {
    try {
      const candidate = new URL(profileUrl, base);
      const slug = candidate.pathname.slice('/pages/fabric/'.length);
      if (candidate.origin === new URL(base).origin && candidate.pathname.startsWith('/pages/fabric/') &&
          /^[a-z0-9-]+$/i.test(slug) && (slug === fabricId || slug.startsWith(`${fabricId}-`))) {
        candidate.search = ''; candidate.hash = ''; profile = candidate;
      }
    } catch { /* Keep the established fabric-library fallback. */ }
  }
  const making = profile ? new URL(profile) : null;
  if (making) { making.searchParams.set('makingStep', '1'); making.hash = 'cuk-making-studio'; }
  return {
    details: profile?.href ?? fullUrl(`/pages/fabric-library?${query}`),
    room: fullUrl(`/pages/room-visualiser?${query}`),
    cushions: fullUrl(`/pages/cushion-studio?${query}`),
    making: making?.href ?? null,
    jane: fullUrl(`/pages/meet-our-team?${new URLSearchParams({ entry: 'fabric-detail', jane_fabric: fabricId })}`),
  };
}

export function shopifyConsultationHandoff(input: {
  sample: boolean;
  sessionId: string;
  profileSummary: string;
  fabricMasterId: string;
  supplierSku: string;
  strategyId: string;
  commerceToken: string;
}) {
  const url = new URL(fullUrl(input.sample ? '/pages/fabric-library' : '/pages/curtain-visualiser'));
  url.searchParams.set('fabric', input.fabricMasterId);
  if (input.sample) url.searchParams.set('intent', 'sample');
  url.hash = `cuk_hci=${encodeURIComponent(JSON.stringify({
    sessionId: input.sessionId,
    profileSummary: input.profileSummary,
    fabricMasterId: input.fabricMasterId,
    supplierSku: input.supplierSku,
    strategyId: input.strategyId,
    commerceToken: input.commerceToken,
  }))}`;
  return url.toString();
}
