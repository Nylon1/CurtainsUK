/** Loopback visual review of the exact section markup/assets. No Shopify writes. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('shopify-theme/curtainsuk-dawn-16');
const section = await readFile(path.join(root, 'sections/curtainsuk-how-to.liquid'), 'utf8');
const assets = new Set([...section.matchAll(/'([^']+)' \| asset_url/g)].map(match => match[1]));
const content = section.replace(/\{% schema %\}[\s\S]*?\{% endschema %\}/g, '')
  .replace(/\{\{ '([^']+)' \| asset_url \| stylesheet_tag \}\}/g, '<link rel="stylesheet" href="/assets/$1">')
  .replace(/\{\{ '([^']+)' \| asset_url \}\}/g, '/assets/$1');
if (/\{%|\{\{/.test(content)) throw new Error('Unsupported Liquid in local preview');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>How to use CurtainsUK | Local review</title><style>body{margin:0;background:#f9f7f1} .preview-header{padding:17px 5%;border-bottom:1px solid #e0e0d6;display:flex;justify-content:space-between;align-items:center;color:#3c4b42;font-family:Arial,sans-serif}.preview-header strong{font:italic 29px Georgia,serif}.preview-header span{font-size:11px}</style></head><body><header class="preview-header"><strong>CurtainsUK</strong><span>HOW TO USE · UNPUBLISHED REVIEW</span></header>${content}</body></html>`;
createServer(async (req,res) => {
  if (!['127.0.0.1:4363','localhost:4363'].includes(req.headers.host)) {res.writeHead(403).end();return;}
  const url = new URL(req.url,'http://127.0.0.1:4363');
  if (url.pathname === '/' || url.pathname === '/pages/how-to-use') {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(html);return;
  }
  if (url.pathname.startsWith('/assets/') && assets.has(url.pathname.slice(8))) {
    const name=url.pathname.slice(8),ext=path.extname(name);
    try {const data=await readFile(path.join(root,'assets',name));res.writeHead(200,{'Content-Type':{'.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'}[ext]||'application/octet-stream','Cache-Control':'no-store'}).end(data);return;} catch {}
  }
  // Feature links remain real storefront paths in Liquid; local preview redirects them.
  if (url.pathname.startsWith('/pages/') || url.pathname.startsWith('/apps/')) {
    res.writeHead(302,{Location:`https://www.curtainsuk.com${url.pathname}${url.search}`}).end();return;
  }
  res.writeHead(404).end('Not found');
}).listen(4363,'127.0.0.1',()=>console.log('Unpublished guide: http://127.0.0.1:4363/pages/how-to-use'));
