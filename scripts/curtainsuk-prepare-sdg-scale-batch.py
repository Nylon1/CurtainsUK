"""Prepare governed import jobs from saved CUA listing observations.

Uses the existing exact-identity reconciler in <=250-row chunks. This command
does not upload media, activate browsing, or change supplier commercial data.
"""
import argparse
from collections import defaultdict
from pathlib import Path
import json
import subprocess

p=argparse.ArgumentParser()
p.add_argument('--batch-size',type=int,default=1000,choices=(1000,2500))
p.add_argument('--batch',required=True)
args=p.parse_args()
assert args.batch.replace('-','').isalnum()
root=Path('artifacts/phase5k')
out=root / args.batch
out.mkdir(parents=True,exist_ok=True)
if (out/'import.jsonl').exists():
    raise SystemExit('STARTED_BATCH_MANIFEST_IS_IMMUTABLE')
latest={}
for path in sorted((root/'observations').glob('*.json')):
    obs=json.loads(path.read_text(encoding='utf-8'))
    for row in obs['rows']:
        key=(row['brand'],row['sku'])
        if key not in latest or obs['checkedAt']>latest[key][0]:
            latest[key]=(obs['checkedAt'],row)
brands={'Clarke and Clarke':'Clarke & Clarke','Morris and Co.':'Morris & Co.'}
groups=defaultdict(list)
for checked,row in latest.values():
    groups[(brands.get(row['brand'],row['brand']),row['status'])].append((checked,row))
results={}
summaries=[]
excluded=[]
for index,((brand,status),items) in enumerate(sorted(groups.items())):
    # Explicit discontinued observations go to the existing guarded workflow.
    if status=='Discontinued':
        for start in range(0,len(items),48):
            part=items[start:start+48]
            data={'observedDate':min(t for t,r in part)[:10],'brand':brand,'supplierLabel':status,'productType':'Fabric','source':'SDG authenticated fabric listing','rows':[[r['sku'],r['title']] for t,r in part]}
            path=out/f'discontinued-{index}-{start}.json'
            path.write_text(json.dumps(data,indent=2),encoding='utf-8')
            excluded.append(str(path))
        continue
    for start in range(0,len(items),250):
        part=items[start:start+250]
        input_path=out/f'observed-{index}-{start}.json'
        output_path=out/f'manifest-{index}-{start}.json'
        report_path=out/f'reconciliation-{index}-{start}.json'
        data={'checkedAt':min(t for t,r in part),'brand':brand,'productType':'FABRIC','status':status,'rows':[[r['sku'],r['title'],r['imagePath']] for t,r in part]}
        input_path.write_text(json.dumps(data,indent=2),encoding='utf-8')
        command=['node','node_modules/tsx/dist/cli.mjs','scripts/curtainsuk-reconcile-observed-media.ts',f'--input={input_path}',f'--output={output_path}',f'--report={report_path}']
        run=subprocess.run(command,capture_output=True,text=True)
        if run.returncode:
            summaries.append({'brand':brand,'status':status,'observed':len(part),'failure':'RECONCILIATION_FAILED'})
            continue
        report=json.loads(report_path.read_text(encoding='utf-8'))
        summaries.append({'brand':brand,'status':status,'observed':report['observed'],'matched':report['exactIdentityMatches'],'withheld':report['withheld']})
        results.update(json.loads(output_path.read_text(encoding='utf-8'))['results'])
state=json.loads(Path('artifacts/phase5f/checkpoints/supplier-media.json').read_text(encoding='utf-8'))
mapped={m['fabricId'] for m in state['mappings'].values() if m['imageType']=='MAIN'}
reserved=set()
for previous in root.glob('batch-*/approved-manifest.json'):
    if previous.parent != out:
        reserved.update(json.loads(previous.read_text(encoding='utf-8'))['results'])
pending={k:v for k,v in sorted(results.items()) if k not in mapped and k not in reserved}
selected=dict(list(pending.items())[:args.batch_size])
manifest={'results':selected,'rows':[[v['record']['supplier_sku']] for v in selected.values()]}
(out/'approved-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
summary={'observedUnique':len(latest),'exactMatches':len(results),'alreadyMapped':len(set(results)&mapped),'reservedInEarlierBatches':len(set(results)&reserved),'pendingVerified':len(pending),'selected':len(selected),'requestedBatchSize':args.batch_size,'discontinuedInputs':excluded,'groups':summaries,'pricingChanges':0}
(out/'preparation.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k not in ('groups','discontinuedInputs')}))
