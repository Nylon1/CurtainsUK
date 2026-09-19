import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { retailFabricDetail, searchRetailFabrics } from '@/lib/fabric-master/retail-repository';
import { consumeEndpointRateLimit, endpointRateLimitResponse } from '@/lib/storefront/security/endpoint-rate-limit';
import { PUBLIC_NO_STORE_HEADERS } from '@/lib/storefront/security/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Candidate theme testing only. Live uses the existing signed app proxy.
// Public customer projections only. No credentials, supplier amounts, checkout or writes.
function headers(request: Request) {
  const origin = request.headers.get('origin');
  if (process.env.VERCEL_ENV !== 'preview' || process.env.CURTAINSUK_BROWSE_PREVIEW !== 'true'
      || origin !== 'https://www.curtainsuk.com') return null;
  return { ...PUBLIC_NO_STORE_HEADERS, 'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}

export function OPTIONS(request: Request) {
  const allowed = headers(request);
  return new NextResponse(null, { status: allowed ? 204 : 404, headers: allowed ?? PUBLIC_NO_STORE_HEADERS });
}

export async function GET(request: Request) {
  const allowed = headers(request);
  if (!allowed) return new NextResponse(null, { status: 404, headers: PUBLIC_NO_STORE_HEADERS });
  try {
    if (request.url.length > 4096) throw new Error('BROWSE_REQUEST_INVALID');
    const address = (request.headers.get('x-vercel-forwarded-for') ?? 'unknown').split(',',1)[0].slice(0,128);
    await consumeEndpointRateLimit(createHash('sha256').update(`browse-preview:${address}`).digest('hex'), {limit:60,windowSeconds:60});
    const params = new URL(request.url).searchParams;
    if (params.has('fabric')) {
      const fabric = await retailFabricDetail(params.get('fabric') ?? '', true);
      return NextResponse.json({fabric}, {status: fabric ? 200 : 404, headers: allowed});
    }
    params.set('browseGuide','1');
    return NextResponse.json(await searchRetailFabrics(params), { headers: allowed });
  } catch (error) {
    const rate = endpointRateLimitResponse(error);
    return NextResponse.json({error:rate?.message ?? 'Unable to load fabrics. Please try again.'},
      { status:rate?.status ?? 503, headers:{...allowed,...rate?.headers} });
  }
}
