"""Scan tracked and proposed files; report locations, never matching secret text."""
import json,re,subprocess
from pathlib import Path
patterns={
 'shopify_token':re.compile(rb'\bshp(?:at|ua|ss|ca)_[A-Za-z0-9]{24,}'),
 'supabase_secret':re.compile(rb'\bsb_secret_[A-Za-z0-9_-]{24,}'),
 'jwt':re.compile(rb'\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'),
 'private_key':re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'github_token':re.compile(rb'\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})'),
 'aws_access_key':re.compile(rb'\bAKIA[A-Z0-9]{16}\b'),
}
paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode('utf-8').split('\0')
findings=[]; scanned=0
for path in sorted(set(filter(None,paths))):
    f=Path(path)
    if not f.is_file():continue
    data=f.read_bytes()
    if b'\0' in data:continue
    scanned+=1
    for kind,pattern in patterns.items():
        for match in pattern.finditer(data):
            findings.append({'path':path,'line':data[:match.start()].count(b'\n')+1,'kind':kind})
report={'scope':'Tracked and proposed non-ignored text files','filesScanned':scanned,'findings':findings,'status':'PASS' if not findings else 'BLOCKED','limitations':'Pattern scan plus public-payload and provenance checks; not a guarantee that every possible secret format is detected.'}
Path('artifacts/phase5h/secret-scan.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
raise SystemExit(bool(findings))
