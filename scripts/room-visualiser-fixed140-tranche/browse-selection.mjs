/** Pure, read-only selection rule: Browse owns the universe; metadata only narrows V1 eligibility. */
export function eligibleBrowseIds(browseIds,repeatIds,standardIds,v1Ids,priorIds){
  const browseSet=new Set(browseIds);
  if(browseIds.some(id=>typeof id!=='string'||!id)||browseSet.size!==browseIds.length)
    throw Error('Browse snapshot contains invalid or duplicate IDs');
  if([...repeatIds].some(id=>!browseSet.has(id)))
    throw Error('Repeat-metadata evidence includes a master-only ID outside Browse');
  const overlap=[...standardIds].filter(id=>v1Ids.has(id));
  if(overlap.length)throw Error(`STANDARD/V1 manifest overlap: ${overlap.length}`);
  const supported=new Set([...standardIds,...v1Ids]);
  const remaining=browseIds.filter(id=>!supported.has(id));
  const skippedPrior=remaining.filter(id=>priorIds.has(id));
  const eligible=remaining.filter(id=>!priorIds.has(id)&&repeatIds.has(id))
    .sort((a,b)=>a<b?-1:a>b?1:0);
  return {browseSet,overlap,remaining,skippedPrior,eligible};
}
