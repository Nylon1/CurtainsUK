const assert = require('node:assert/strict');
const tests = [['activity','low'],['activity','statement'],['pattern','abstract'],['texture','visible-weave'],['presence','light'],['presence','substantial']];
(async () => {
  const results = [];
  for (const [key,value] of tests) {
    const url = new URL('https://www.curtainsuk.com/apps/curtainsuk-decision/catalog');
    for (const [name,item] of Object.entries({view:'retail',browseGuide:'1',knowledge:'1',page:'1',[key]:value})) url.searchParams.set(name,item);
    const response = await fetch(url);
    assert.equal(response.status,200);
    const data = await response.json();
    const facet = data.facets.discovery.find(f => f.key === key);
    assert.equal(facet.active,true);
    assert.ok(facet.options.some(o => o.value === value));
    assert.ok(data.fabrics.length > 0);
    const matches = data.fabrics.every(f => {
      const values = f.intelligence?.dimensions?.find(d => d.key === key)?.values;
      const v = f.visualIntelligence;
      const fallback = key === 'activity' ? [v?.pattern?.activity] : key === 'pattern' ? [v?.pattern?.category,...v?.pattern?.motif || []] : key === 'texture' ? v?.texture : [v?.visualWeight];
      return (values || fallback || []).includes(value);
    });
    assert.ok(matches, `Unexpected ${key} results for ${value}`);
    results.push({key,value,total:data.total,returned:data.fabrics.length,allMatch:matches});
  }
  console.log(JSON.stringify(results,null,2));
})().catch(error => {console.error(error);process.exitCode=1;});
