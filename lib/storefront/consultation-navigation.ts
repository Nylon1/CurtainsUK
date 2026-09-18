import { fullUrl } from '@/lib/sitemap-utils';

export function isPremiumConsultationPath(pathname: string) {
  return pathname.replace(/\/$/, '') === '/curtain-consultation-premium';
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
