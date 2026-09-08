"""Read-only paginated catalogue probes. Public projection only; no credentials."""
import argparse, json, statistics, time, urllib.parse, urllib.request
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--count', type=int, required=True)
p.add_argument('--local', action='store_true')
a = p.parse_args()
base = 'http://127.0.0.1:3217/api/catalog' if a.local else 'https://www.curtainsuk.com/apps/curtainsuk-decision/catalog'
common = {'view': 'retail'} if a.local else {'view': 'retail', 'brand': 'Prestigious Textiles'}
forbidden = {'supplierSku','supplier_sku','standard_trade_price','cut_trade_price','costing_price','margin','aggregate_available_quantity','batch_reference','batch_available_quantity','source_reference','portal_product_id','access_token','authorization','cookie'}
def probe(params):
    start = time.perf_counter()
    with urllib.request.urlopen(base + '?' + urllib.parse.urlencode(common | params), timeout=30) as r:
        body = r.read(); status = r.status
    data = json.loads(body)
    def check(v):
        if isinstance(v,dict):
            assert not forbidden.intersection(v), forbidden.intersection(v)
            for x in v.values(): check(x)
        elif isinstance(v,list):
            for x in v: check(x)
    check(data)
    fabrics = data.get('fabrics', [data['fabric']] if data.get('fabric') else [])
    assert len(fabrics) <= 24
    for f in fabrics:
        assert all(i['url'].startswith('https://cdn.shopify.com/') for i in f['images'])
        assert (not f['configurable'] and not f['launchReady']) if a.local else f['launchReady']
    return data, {'ms':round((time.perf_counter()-start)*1000),'bytes':len(body),'status':status,'total':data.get('total'),'returned':len(fabrics)}

cases = {'browse':{},'search':{'query':'Java'},'colour':{'colour':'green'},'pattern':{'pattern':'geometric'},'brand':{'brand':'Prestigious Textiles'},'collection':{'collection':'Java'},'detail':{'fabric':'pt-7248-032'},'page2':{'page':2}}
report=[]
for name, params in cases.items():
    results = [probe(params)[1] for _ in range(3)]
    report.append({'case':name,'medianMs':statistics.median(r['ms'] for r in results),'measurements':results})
first,_=probe({})
assert first['total']==a.count,(first['total'],a.count)
ids=[]; largest=0
for page in range(1,first['pages']+1):
    data, metric=probe({'page':page}); ids.extend(f['id'] for f in data['fabrics']); largest=max(largest,metric['bytes'])
assert len(ids)==len(set(ids))==a.count
output={'mode':'LOOPBACK_REAL_IDENTITY_FIXTURE' if a.local else 'UNPUBLISHED_DAWN_SHOPIFY_PROXY','count':a.count,'cases':report,'pagination':{'pages':first['pages'],'records':len(ids),'unique':len(set(ids)),'largestRawResponseBytes':largest},'publicLeakScan':'PASS','imageHosts':'SHOPIFY_CDN_ONLY'}
Path(f'artifacts/phase5h/performance-{a.count}{"-local" if a.local else "-verified"}.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'count':a.count,'medians':{r['case']:r['medianMs'] for r in report},'pages':first['pages'],'unique':len(set(ids)),'largestRawResponseBytes':largest}))
