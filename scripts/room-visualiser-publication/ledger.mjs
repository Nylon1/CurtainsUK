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
