export function normaliseLedger(ledger,manifestIds){
  if(ledger.version!==1||!Array.isArray(ledger.published)||!Array.isArray(ledger.staged))throw Error('Invalid publication ledger');
  if(ledger.holds===undefined)ledger.holds={};
  if(!ledger.holds||typeof ledger.holds!=='object'||Array.isArray(ledger.holds))throw Error('Invalid publication HOLD ledger');
  const accounted=new Set([...ledger.published,...ledger.staged]);
  if(accounted.size!==ledger.published.length+ledger.staged.length)throw Error('Duplicate publication ledger ID');
  if([...accounted].some(id=>Object.hasOwn(ledger.holds,id)))throw Error('A fabric cannot be both published/staged and held');
  if(manifestIds.some(id=>!accounted.has(id)))throw Error('Manifest contains unaccounted fabric IDs');
  return ledger;
}

export function recordHold(ledger,id,reason){
  if(ledger.published.includes(id)||ledger.staged.includes(id))throw Error('Cannot hold a published/staged fabric');
  ledger.holds[id]=reason;
}

// A few fabrics can lose retail eligibility between staging and the protected
// release. Remove only those identities; the other reviewed fabrics continue.
export function holdPreflightFailures(ledger,manifest,report,failures){
  const unique=new Map(failures.map(failure=>[failure.id,failure.reason]));
  if(unique.size!==failures.length)throw Error('Duplicate preflight failure');
  if(unique.size>Math.max(10,Math.floor(ledger.staged.length*.1)))throw Error('SYSTEMIC_PREFLIGHT_FAILURE');
  const staged=new Set(ledger.staged);
  const entries=new Map(manifest.fabrics.map(entry=>[entry.fabricId,entry]));
  for(const id of unique.keys()){
    if(!staged.has(id)||!entries.has(id))throw Error(`Preflight identity missing: ${id}`);
  }
  const removed=manifest.fabrics.filter(entry=>unique.has(entry.fabricId));
  manifest.fabrics=manifest.fabrics.filter(entry=>!unique.has(entry.fabricId));
  ledger.staged=ledger.staged.filter(id=>!unique.has(id));
  for(const [id,reason] of unique)recordHold(ledger,id,`PREFLIGHT:${reason}`);
  report.staged=ledger.staged.length;
  report.newlyHeld+=unique.size;
  report.held+=unique.size;
  report.manifestTotal=manifest.fabrics.length;
  report.stagedFabricIds=report.stagedFabricIds.filter(id=>!unique.has(id));
  for(const item of report.results){
    if(!unique.has(item.fabricId))continue;
    if(item.status!=='STAGED')throw Error(`Preflight report mismatch: ${item.fabricId}`);
    item.status='HOLD';item.reason=`PREFLIGHT:${unique.get(item.fabricId)}`;
    delete item.sha256;delete item.encodedBytes;delete item.quality;
  }
  for(const reason of unique.values()){
    const key=`PREFLIGHT:${reason}`;
    report.holdReasons[key]=(report.holdReasons[key]||0)+1;
  }
  return removed;
}
