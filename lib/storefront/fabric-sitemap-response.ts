import manifest from '@/generated/fabric-profile-sitemap.json';
import { renderFabricSitemapXml } from './fabric-sitemap';

const xml = renderFabricSitemapXml(manifest.profiles, manifest.profileCount);

export function fabricSitemapResponse(): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
