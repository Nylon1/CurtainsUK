"""Read every public page after activation and assert privacy/readiness boundaries."""
import json, urllib.request, urllib.error, urllib.parse
from pathlib import Path
base='https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?view=retail&'
forbidden={'suppliersku','cuttradeprice','standardtradeprice','cutcost','costingprice','margin','stockmetres','dyelot','batchreference','batchavailablequantity','aggregateavailablequantity','sourcereference','portalproductid','authorization','accesstoken','cookie','password'}
def scan(v):
    if isinstance(v,dict):
        assert not {k.replace('_','').lower() for k in v}.intersection(forbidden)
        for x in v.values():scan(x)
    elif isinstance(v,list):
        for x in v:scan(x)
def get(params):
    with urllib.request.urlopen(base+urllib.parse.urlencode(params),timeout=30) as r:
        data=json.load(r);scan(data);return data
first=get({}); records=[]
for page in range(1,first['pages']+1):
    data=first if page==1 else get({'page':page})
    assert len(data['fabrics'])<=24
    records.extend(data['fabrics'])
assert len(records)==len({f['id'] for f in records})==257
for f in records:
    assert f['launchReady'] and f['images'] and f['description'] and f['feedEligible'] is False
    assert f['metadata']['robots']=='noindex, nofollow'
    assert all(i['url'].startswith('https://cdn.shopify.com/') and '?' not in i['url'] for i in f['images'])
    assert '£0' not in f['description']
for n in range(1,7):
    f=get({'fabric':f'sdg-f1787-0{n}'})['fabric']
    assert f['configurable'] is False and f['sampleAvailable'] is True and f['launchReady']
held=['sdg-darp222519','sdg-eazu132713','sdg-zald332700','sdg-nesf120872','pt-4282-543','pt-7150-168','pt-7895-038']
for fabric in held:
    try:
        result=get({'fabric':fabric});assert result.get('fabric') is None
    except urllib.error.HTTPError as e:
        assert e.code==404
report={'publicRecords':len(records),'byBrand':{b:sum(f['brand']==b for f in records) for b in sorted({f['brand'] for f in records})},'pages':first['pages'],'maxRecordsPerPayload':24,'commercialOrCredentialLeaks':0,'approvedImageHost':'Shopify CDN','unverifiedPriceBrowseOnly':6,'heldDeepLinksBlocked':held,'feedEligible':False,'metadataNoindex':True}
Path('artifacts/phase5h/public-security-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
