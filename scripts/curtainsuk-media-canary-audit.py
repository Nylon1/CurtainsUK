"""Read-only public projection QA after a supplier media batch; never authenticates."""
import argparse, json, statistics, time, urllib.parse, urllib.request
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--expected-total', type=int, required=True)
p.add_argument('--manifest', required=True)
p.add_argument('--report', required=True)
a = p.parse_args()
manifest = json.loads(Path(a.manifest).read_text(encoding='utf-8-sig'))
ids = {'sdg-' + r[0].lower().replace('/', '-') for r in manifest['rows']}
base = 'https://www.curtainsuk.com/apps/curtainsuk-decision/catalog?'
forbidden = {'suppliersku','cuttradeprice','standardtradeprice','cutcost','costingprice','margin','stockmetres','dyelot','batchreference','batchavailablequantity','aggregateavailablequantity','sourcereference','portalproductid','authorization','accesstoken','cookie','password'}
def scan(v):
    if isinstance(v, dict):
        assert not {k.replace('_','').lower() for k in v}.intersection(forbidden)
        for x in v.values(): scan(x)
    elif isinstance(v, list):
        for x in v: scan(x)
def get(params):
    started = time.perf_counter()
    with urllib.request.urlopen(base + urllib.parse.urlencode({'view':'retail'} | params), timeout=40) as r:
        body = r.read()
    data = json.loads(body); scan(data)
    return data, {'ms':round(1000*(time.perf_counter()-started)), 'bytes':len(body)}
first, _ = get({}); assert first['total'] == a.expected_total, first['total']
records, largest = [], 0
for page in range(1, first['pages']+1):
    data, metric = get({'page':page})
    assert len(data['fabrics']) <= 24
    records.extend(data['fabrics']); largest=max(largest,metric['bytes'])
assert len(records) == len({r['id'] for r in records}) == a.expected_total
canary = [r for r in records if r['id'] in ids]
assert len(canary) == len(ids), (len(canary),len(ids))
for r in canary:
    assert r['launchReady'] and not r['configurable'] and not r['feedEligible']
    assert r['description'] and r['metadata']['robots'] == 'noindex, nofollow'
    assert all(i['url'].startswith('https://cdn.shopify.com/') for i in r['images'])
cases = {'browse':{},'search':{'query':'Audubon'},'brand':{'brand':'Clarke & Clarke'},'colour':{'colour':'green'},'pattern':{'pattern':'geometric'},'collection':{'collection':canary[0]['collection']},'detail':{'fabric':sorted(ids)[0]},'page2':{'page':2}}
checks = {'brand':lambda r:r['brand']=='Clarke & Clarke','colour':lambda r:'green' in r['colourFamilies'],'pattern':lambda r:'geometric' in r['patterns'],'collection':lambda r:r['collection']==canary[0]['collection'],'search':lambda r:'audubon' in r['design'].lower()}
timings={}
for name, params in cases.items():
    observations=[]
    for _ in range(3):
        data, metric=get(params); observations.append(metric)
        if name in checks:
            assert all(checks[name](r) for r in data['fabrics']), name
            assert data['total']==sum(checks[name](r) for r in records), name
    timings[name]={'medianMs':statistics.median(x['ms'] for x in observations),'measurements':observations}
report={'publicRecords':len(records),'publicPriceReady':sum(r['configurable'] is True for r in records),'publicOrderReady':sum(r['orderReady'] is True for r in records),'canaryRecords':len(canary),'canaryPriceBlocked':len(canary),'sampleKnownAvailable':sum(r['sampleAvailable'] is True for r in canary),'pages':first['pages'],'maxRecordsPerPayload':24,'largestRawResponseBytes':largest,'commercialOrCredentialLeaks':0,'imageHost':'Shopify CDN','robots':'noindex, nofollow','filterSemantics':'PASS','testedCollection':canary[0]['collection'],'timings':timings}
Path(a.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
