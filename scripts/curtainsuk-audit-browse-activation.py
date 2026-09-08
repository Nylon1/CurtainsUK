"""Read-only verification of the owner catalogue activation rule."""
import json,time,urllib.parse,urllib.request,urllib.error
from pathlib import Path
base="https://www.curtainsuk.com/apps/curtainsuk-decision/catalog"
forbidden={"supplierSku","supplier_sku","cut_trade_price","standard_trade_price","margin","aggregate_available_quantity","batch_reference","batch_available_quantity","source_reference","access_token","authorization","cookie"}
def check(value):
 if isinstance(value,dict):
  assert not forbidden.intersection(value)
  for item in value.values(): check(item)
 elif isinstance(value,list):
  for item in value: check(item)
def get(params):
 start=time.perf_counter()
 with urllib.request.urlopen(base+"?"+urllib.parse.urlencode(params),timeout=30) as r: body=r.read()
 data=json.loads(body);check(data)
 return data,{"ms":round((time.perf_counter()-start)*1000),"bytes":len(body)}
first,_=get({"view":"retail"});assert first["total"]==265
ids=[];metrics=[]
for page in range(1,first["pages"]+1):
 data,m=get({"view":"retail","page":page});assert len(data["fabrics"])<=24
 for fabric in data["fabrics"]:
  assert fabric["browseReady"] and not fabric["orderReady"]
  assert fabric["images"] and all(i["url"].startswith("https://cdn.shopify.com/") for i in fabric["images"])
  ids.append(fabric["id"])
 metrics.append(m)
assert len(ids)==len(set(ids))==265
probes={}
for name,params in {"unknownLifecycle":{"availability":"CONFIRM"},"allPrestigious":{"brand":"Prestigious Textiles"},"search":{"query":"Velour"},"pattern":{"pattern":"geometric"},"colour":{"colour":"green"},"collection":{"collection":"Formation"}}.items():
 data,m=get({"view":"retail",**params});probes[name]={**m,"total":data["total"]}
assert probes["unknownLifecycle"]["total"]==6 and probes["allPrestigious"]["total"]==258
for fid in ["pt-4273-658","pt-4282-543","sdg-f1787-02"]:
 data,m=get({"view":"retail","fabric":fid});f=data["fabric"]
 assert f["browseReady"] and not f["orderReady"] and not f["configurable"]
 assert f["description"]
 config,_=get({"fabric":fid});selected=next(f for f in config["fabrics"] if f["id"]==fid)
 assert selected["configurable"] and len(config["fabrics"])<=49
 probes[fid]={**m,"measurementSelection":True}
for fid in ["sdg-nesf120872","sdg-darp222519","sdg-eazu132713"]:
 try:get({"view":"retail","fabric":fid});raise AssertionError("Hidden record exposed")
 except urllib.error.HTTPError as e:assert e.code==404
report={"checkedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"uniqueBrowsed":len(ids),"pages":len(metrics),"pageMetrics":metrics,"probes":probes,"security":"PASS","onlyShopifyImages":True,"hiddenRecordsDenied":True}
Path("artifacts/catalogue-activation/public-audit.json").write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(report))
