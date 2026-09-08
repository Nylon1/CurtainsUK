import json,time,urllib.request,urllib.parse
from pathlib import Path
base='https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?view=retail&'
forbidden={'suppliersku','cuttradeprice','standardtradeprice','cutcost','costingprice','margin','stockmetres','dyelot','batchreference','batchavailablequantity','aggregateavailablequantity','sourcereference','portalproductid','authorization','accesstoken','cookie','password'}
def scan(v):
 if isinstance(v,dict):
  assert not {k.replace('_','').lower() for k in v}.intersection(forbidden)
  for x in v.values():scan(x)
 elif isinstance(v,list):
  for x in v:scan(x)
results=[]
for label,params in [('initial',{}),('page2',{'page':2}),('lastPage',{'page':264}),('search',{'query':'Painters Garden'}),('brand',{'brand':'Sanderson'}),('collection',{'collection':'Esala'}),('colour',{'colour':'green'}),('pattern',{'pattern':'floral'}),('detail',{'fabric':'sdg-dapgpa203'})]:
 start=time.perf_counter()
 with urllib.request.urlopen(base+urllib.parse.urlencode(params),timeout=45) as r:
  raw=r.read(); data=json.loads(raw);scan(data)
 elapsed=time.perf_counter()-start
 fs=data.get('fabrics',[data['fabric']] if 'fabric' in data else [])
 assert len(fs)<=24
 assert all(f['browseReady'] and f['images'] and f['description'] and f['metadata']['robots']=='noindex, nofollow' for f in fs)
 assert all(i['url'].startswith('https://cdn.shopify.com/') for f in fs for i in f['images'])
 if label=='initial':assert data['total']==6328
 results.append({'case':label,'seconds':round(elapsed,3),'bytes':len(raw),'records':len(fs),'total':data.get('total'),'status':'PASS'})
report={'checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'checks':results,'maxRecordsPerPayload':24,'commercialOrCredentialLeaks':0}
Path('artifacts/phase5l/public-performance.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
