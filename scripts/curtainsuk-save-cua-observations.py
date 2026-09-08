"""Save only explicitly emitted, sanitized CUA observations from this task's transcript.

This transfers already-observed browser output; it never reads browser storage,
credentials, network traffic, or unrelated conversations.
"""
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--transcript', required=True)
p.add_argument('--output', default='artifacts/phase5k/observations')
args = p.parse_args()
root = Path(args.output)
root.mkdir(parents=True, exist_ok=True)
marker = 'SDG_PHASE5K_SAFE_OBSERVATIONS='
compact_marker = 'SDG_PHASE5K_COMPACT_OBSERVATIONS='
screen_marker = 'SDG_PHASE5K_SCREENSHOT='
saved = rows = 0
for line in Path(args.transcript).open(encoding='utf-8'):
    if marker not in line and compact_marker not in line and screen_marker not in line:
        continue
    event = json.loads(line)
    payload = event.get('payload', {})
    if event.get('type') != 'response_item' or payload.get('type') != 'function_call_output':
        continue
    output = payload.get('output', [])
    if not isinstance(output, list):
        continue
    screen = next((b.get('text','')[len(screen_marker):] for b in output if b.get('text','').startswith(screen_marker)),None)
    if screen:
        # CUA can append another explicitly emitted value to the same text block.
        name = re.match(r'([a-z0-9-]{1,100})(?=$|[\s{])', screen)
        assert name
        screen = name.group(1)
        images=[b['image_url'] for b in output if b.get('type')=='input_image']
        if not images:
            continue # Failed screenshot tool call; never invent an artifact.
        assert len(images)==1 and images[0].startswith('data:image/jpeg;base64,')
        image_root=root.parent/'screenshots'
        image_root.mkdir(exist_ok=True)
        (image_root/(screen+'.jpg')).write_bytes(base64.b64decode(images[0].split(',',1)[1],validate=True))
    for block in output:
        value = block.get('text', '')
        prefix = marker if marker in value else compact_marker if compact_marker in value else None
        if not prefix:
            continue
        data, _ = json.JSONDecoder().raw_decode(value.split(prefix,1)[1])
        if prefix == compact_marker:
            data['rows'] = [dict(zip(('sku','title','imagePath','status','brand'), row), productType='Fabric') for row in data['rows']]
        if not data.get('rows'):
            continue # A page that has not advanced is not a completed checkpoint.
        assert set(data) == {'checkedAt', 'location', 'progress', 'rows'}
        assert re.fullmatch(r'[A-Za-z0-9_.:-]{1,100}', data['location'])
        assert re.fullmatch(r'Viewing \d+ of \d+', data['progress'])
        assert 0 < len(data['rows']) <= 2500
        for row in data['rows']:
            assert set(row) in ({'sku','title','brand','status','imagePath','productPath','productType'}, {'sku','title','brand','status','imagePath','productType'})
            assert row['productType'] == 'Fabric'
            assert all(isinstance(v,str) and len(v) < 350 for v in row.values())
            assert re.fullmatch(r'[A-Za-z0-9/_ .-]{0,300}', row['imagePath'])
            if 'productPath' in row:
                assert re.fullmatch(r'/products/[a-zA-Z0-9-]+', row['productPath'])
            assert re.fullmatch(r'[A-Za-z0-9/_.-]{1,80}', row['sku'])
            assert row['status'] in ('Live','Live (Special Order)','Discontinued','Limited Stock','UNKNOWN')
            assert row['brand'] in ('Clarke and Clarke','Morris and Co.','Sanderson','Harlequin','Scion','Zoffany')
        encoded = json.dumps(data, ensure_ascii=False, sort_keys=True).encode()
        target = root / (hashlib.sha256(encoded).hexdigest() + '.json')
        if not target.exists():
            target.write_bytes(encoded)
            saved += 1
            rows += len(data['rows'])
print(json.dumps({'checkpointsSaved':saved,'rowsSaved':rows}))
