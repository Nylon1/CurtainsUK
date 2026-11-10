import { DESIGN_GUIDES } from './design-guides';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

/** Shopify app proxy keeps the guide on the public CurtainsUK origin. */
export function designGuideResponse(request: Request): Response {
  const params = new URL(request.url).searchParams;
  const topic = params.get('topic') ?? '';
  const guide = Object.hasOwn(DESIGN_GUIDES, topic)
    ? DESIGN_GUIDES[topic as keyof typeof DESIGN_GUIDES] : null;
  if (!guide) return Response.redirect('https://www.curtainsuk.com/pages/fabric-library', 302);
  const title = escape(guide.title);
  const backQuery = new URLSearchParams({ experience: 'premium', entry: 'match' });
  for (const key of ['source', 'space', 'direction', 'colour', 'primary', 'secondary', 'accent', 'fabric']) {
    const value = params.get(key);
    if (value && value.length <= 100 && /^[a-zA-Z0-9#-]+$/.test(value)) backQuery.set(key, value);
  }
  const back = `/apps/curtainsuk-decision/consultation?${backQuery}`;
  const browseQuery = new URLSearchParams({ view: 'browse-fabrics' });
  if (/^[a-z0-9-]{1,80}$/.test(params.get('fabric') ?? '')) browseQuery.set('fabric', params.get('fabric')!);
  const browse = `/pages/fabric-library?${browseQuery}`;
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${title} | CurtainsUK Design Library</title><style>
  :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f7f5ee;color:#163f36;font-family:Arial,sans-serif;line-height:1.55}a{color:inherit}header{background:#163f36;color:#fff;padding:1rem max(1rem,calc((100vw - 1100px)/2));display:flex;justify-content:space-between;align-items:center;gap:1rem}.brand{font-family:Georgia,serif;font-size:1.55rem;text-decoration:none}.brand span{color:#e5bc71}main{max-width:1100px;margin:auto;padding:clamp(1.25rem,4vw,3rem)}.back{display:inline-block;margin-bottom:1.5rem}.hero{display:grid;grid-template-columns:1.5fr 1fr;gap:2rem;align-items:center}.eyebrow{text-transform:uppercase;letter-spacing:.13em;font-size:.78rem;font-weight:700;color:#648473}h1{font:clamp(2.4rem,6vw,4.7rem)/1.08 Georgia,serif;margin:.5rem 0 1rem;color:#132d29}.lead{font-size:1.2rem;max-width:45rem}.palette{min-height:260px;border-radius:20px;background:linear-gradient(140deg,#e8dec9 0 38%,#afbd9f 38% 70%,#4d5f4a 70%);box-shadow:0 12px 35px #173d3620}.points{margin:2rem 0;padding:1.5rem;background:#fff;border-radius:20px}.points li{padding:.6rem .3rem}.tip{border-left:5px solid #cfa663;padding:1rem 1.3rem;background:#ecf0e7}.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin:2rem 0}.actions a{background:#163f36;color:white;padding:.85rem 1.2rem;border-radius:8px;text-decoration:none;font-weight:700}.actions a.secondary{background:#fff;color:#163f36;border:1px solid #163f36}footer{border-top:1px solid #cdd7cc;padding:1.5rem;text-align:center}@media(max-width:700px){header{padding:1rem}.hero{grid-template-columns:1fr}.palette{min-height:130px}.actions a{width:100%;text-align:center}}
  </style></head><body><header><a class="brand" href="/">Curtains<span>UK</span></a><span>Design Library</span></header><main><a class="back" href="${back.replaceAll('&','&amp;')}">← Return to Fabric Intelligence</a><section class="hero"><div><p class="eyebrow">Design Library</p><h1>${title}</h1><p class="lead">${escape(guide.intro)}</p></div><div class="palette" role="img" aria-label="Illustrative palette of warm stone, sage and deep green"></div></section><section class="points"><h2>What to look for</h2><ol>${guide.points.map((point) => `<li>${escape(point)}</li>`).join('')}</ol></section><aside class="tip"><h2>For your curtains</h2><p>${escape(guide.tip)}</p></aside><nav class="actions" aria-label="Continue shopping"><a href="${browse.replaceAll('&','&amp;')}">Browse fabrics</a><a class="secondary" href="/pages/samples">Order fabric samples</a><a class="secondary" href="${back.replaceAll('&','&amp;')}">Continue Fabric Intelligence</a></nav></main><footer><a href="/">CurtainsUK home</a></footer></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
}
