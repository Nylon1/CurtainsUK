// Read-only, bounded public publication evidence. Never writes Shopify or SQL.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir=process.env.ADVISORY_EVIDENCE_DIR??'artifacts/jane-eligible-scope-20261011';
const hash=s=>createHash('sha256').update(s).digest('hex');
const locations=s=>[...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
const index=await readFile(dir+'/shopify-sitemap.xml','utf8');
const urls=locations(index).filter(u=>/^https:\/\/www\.curtainsuk\.com\/sitemap_metaobject_pages_\d+\.xml$/.test(u));
if(!urls.length||urls.length>30||new Set(urls).size!==urls.length)throw Error('PUBLICATION_INVENTORY_BOUND');
const reference=JSON.parse(await readFile(dir+'/reference-identities.json','utf8'));
const candidates=JSON.parse(await readFile(dir+'/candidates.json','utf8'));
const mapping=new Map(reference.profiles.map(p=>[p.canonicalUrl,p.fabricMasterId]));
const receipts=[],locationsSeen=new Set(),ids=new Set(),unmapped=[];
// Sequential reads, capped response, no crawling or per-product fanout.
for(const url of urls){
 const started=performance.now(),response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw Error('PUBLICATION_READ_FAILED');
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>3000000)throw Error('PUBLICATION_RESPONSE_BOUND');chunks.push(chunk);}
 const body=Buffer.concat(chunks).toString('utf8'),locs=locations(body);
 if(!body.includes('<urlset')||locs.length>5000)throw Error('INVALID_PUBLICATION_SITEMAP');
 for(const loc of locs){
  if(!loc.startsWith('https://www.curtainsuk.com/pages/fabric/'))continue;
  if(locationsSeen.has(loc))throw Error('DUPLICATE_PUBLICATION_URL');locationsSeen.add(loc);
  const id=mapping.get(loc);if(id)ids.add(id);else unmapped.push(loc);
 }
 receipts.push({url,status:response.status,bytes:size,sha256:hash(body),urls:locs.length,elapsedMs:Math.round(performance.now()-started),observedAt:new Date().toISOString()});
}
const published=reference.profiles.filter(p=>ids.has(p.fabricMasterId));
const eligibleIds=candidates.ids.filter(id=>ids.has(id));
const candidateSet=new Set(candidates.ids);
const report={version:1,classification:'PUBLICATION_RECONCILIATION_NOT_EXECUTION_APPROVAL',observedAt:new Date().toISOString(),receipts,
 exactUrlIdentityMapping:'Existing generated/fabric-profile-sitemap.json; no guessed IDs',candidateCount:candidates.identity_count,
 nativePublishedUrls:locationsSeen.size,mappedPublishedIdentities:ids.size,unmappedUrls:unmapped,
 candidateAndPublishedCount:eligibleIds.length,candidateAndPublishedSha256:hash(eligibleIds.join('\n')),candidateAndPublishedIds:eligibleIds,
 unpublishedCandidateIds:candidates.ids.filter(id=>!ids.has(id)),publishedOutsideCandidates:published.filter(p=>!candidateSet.has(p.fabricMasterId)).map(p=>p.fabricMasterId),
 originalSix:{preservedHistoricalJob:'a6c0d329-935e-4c31-b8ef-71a52f6d9149',eligible:['pt-1200-907','pt-1204-212','pt-1223-374','pt-1224-002','pt-1225-314','pt-1225-722'].filter(id=>eligibleIds.includes(id))},
 remainingValidation:['Per-batch live retail revalidation and fresh source attestation','Post-write backup and short-window metrics','Reviewed separate-job connector implementation']};
await writeFile(dir+'/publication-reconciliation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({candidateCount:report.candidateCount,nativePublishedUrls:report.nativePublishedUrls,mappedPublishedIdentities:report.mappedPublishedIdentities,unmapped:unmapped.length,candidateAndPublished:eligibleIds.length,unpublishedCandidates:report.unpublishedCandidateIds.length,publishedOutsideCandidates:report.publishedOutsideCandidates.length,originalEligible:report.originalSix.eligible.length,hash:report.candidateAndPublishedSha256}));
