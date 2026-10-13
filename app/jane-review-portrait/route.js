import {readFile} from 'node:fs/promises';
export const runtime='nodejs';
export async function GET(){
  if(process.env.VERCEL_ENV!=='preview'||process.env.CURTAINSUK_ADVISORY_PREVIEW!=='true'||process.env.ADVISORY_REVIEW_CHAT!=='true')return new Response(null,{status:404});
  const image=await readFile(new URL('../../shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-adviser-jane.webp',import.meta.url));
  return new Response(image,{headers:{'Content-Type':'image/webp','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
