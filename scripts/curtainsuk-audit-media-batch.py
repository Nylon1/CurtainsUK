"""Verify a completed media batch against its immutable manifest and local bytes."""
import argparse, collections, hashlib, json, re
from pathlib import Path
from urllib.parse import urlparse, unquote

p=argparse.ArgumentParser()
p.add_argument('--manifest',required=True)
p.add_argument('--report',required=True)
a=p.parse_args()
manifest=json.loads(Path(a.manifest).read_text(encoding='utf-8'))['results']
state=json.loads(Path('artifacts/phase5f/checkpoints/supplier-media.json').read_text(encoding='utf-8'))
mapped={m['fabricId']:m for m in state['mappings'].values() if m['imageType']=='MAIN'}
brands=collections.Counter(); hashes=set(); dimensions=collections.Counter(); errors=[]
for fid,job in manifest.items():
 m=mapped.get(fid);r=job['record']
 if not m:errors.append({'fabricId':fid,'reason':'UNMAPPED'});continue
 try:
  assert m['fabricId']==fid and m['supplierSku']==r['supplier_sku'] and m['supplier']==r['supplier_id']
  assert m['rightsState']=='APPROVED' and m['mappingState']=='VERIFIED' and m['mediaScope']=='COLOURWAY'
  assert m['width']>=600 and m['height']>=600
  assert m['shopifyFileId'].startswith('gid://shopify/MediaImage/')
  url=urlparse(m['shopifyCdnUrl']);assert url.hostname=='cdn.shopify.com' and not url.query
  assert re.fullmatch(r'[a-f0-9]{64}',m['contentHash'])
  path=Path('artifacts/phase5f/media')/(m['contentHash']+'.jpg')
  assert hashlib.sha256(path.read_bytes()).hexdigest()==m['contentHash']
  for media in job['media']:
   assert media['evidence']['sku']==r['supplier_sku']
   assert media['evidence']['brand']==r['brand_name']
   assert media['evidence']['productType']=='FABRIC'
   filename=unquote(urlparse(media['url']).path).rsplit('/',1)[-1]
   assert filename.upper().startswith(r['supplier_sku'].replace('/','_').upper()+'_')
  brands[r['brand_name']]+=1;hashes.add(m['contentHash']);dimensions[f"{m['width']}x{m['height']}"]+=1
 except (AssertionError,KeyError,OSError):errors.append({'fabricId':fid,'reason':'MEDIA_BATCH_VALIDATION_FAILED'})
report={'manifestRecords':len(manifest),'verifiedMappings':sum(brands.values()),'byBrand':dict(brands),'uniqueContentHashes':len(hashes),'sharedHashMappings':sum(brands.values())-len(hashes),'dimensions':dict(dimensions),'imageSkuMismatchesAccepted':0 if not errors else None,'errors':errors,'status':'PASS' if not errors else 'BLOCKED'}
Path(a.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
raise SystemExit(0 if not errors else 1)
