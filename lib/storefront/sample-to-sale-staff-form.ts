const STAFF_ORIGINS = new Set([
  'https://curtainsuk-production-api.vercel.app',
  'https://curtainsuk-staging-api.vercel.app',
  'https://curtainsuk-staging-gateway.vercel.app',
]);

export function validSampleToSaleStaffForm(request: Request): boolean {
  const host = request.headers.get('host') ?? new URL(request.url).host;
  const destination = `${new URL(request.url).protocol}//${host}`;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].toLowerCase();
  const length = Number(request.headers.get('content-length') ?? 0);

  if (!STAFF_ORIGINS.has(destination) || (fetchSite && fetchSite !== 'same-origin')) return false;
  if (origin && origin !== 'null' && origin !== destination) return false;
  if ((!origin || origin === 'null') && fetchSite !== 'same-origin') return false;
  return contentType === 'application/x-www-form-urlencoded' && Number.isFinite(length) && length <= 512;
}
