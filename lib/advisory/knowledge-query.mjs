import {fail,validate,tools} from './contracts.mjs';

// Spelling equivalents only. These are search alternatives, never new fabric
// facts. Preserve phrases, explicit OR and exclusions without rewriting them.
export function knowledgeQuery(value){
  const text=value.trim();
  const equivalents={grey:'grey OR gray',gray:'gray OR grey',matt:'matt OR matte',matte:'matte OR matt'};
  return equivalents[text.toLowerCase()]??text;
}
// Fixed SQL shape shared by the direct local port and the reviewed private RPC.
// Every user value is a parameter; no master-table fallback or browse rebuild.
export function knowledgeSearchSql(parameters=['$1','$2','$3','$4','$5']){
  const columns=['document','colour','pattern','texture','composition'];
  const expressions=parameters.map(p=>`websearch_to_tsquery('english',${p})`);
  const filters=columns.map((c,i)=>i===0?`k.${c} @@ q.q0`:`(${parameters[i]}='' or k.${c} @@ q.q${i})`);
  // Require a positive, indexable term in each supplied filter. Pure negative
  // and stop-word queries must not turn into an unbounded index traversal.
  const indexable=parameters.map((p,i)=>`${i?`(${p}='' or `:''}(querytree(q.q${i}) not in ('','T'))${i?')':''}`);
  const score=columns.map((c,i)=>`ts_rank_cd(k.${c},q.q0,32)*${i?2:1}`);
  for(let i=1;i<columns.length;i++)score.push(`ts_rank_cd(k.${columns[i]},q.q${i},32)*2`);
  return `with q as (select ${expressions.map((e,i)=>e+' as q'+i).join(',')})
select k.fabric_id from advisory.knowledge_search k cross join q
where ${[...indexable,...filters].join(' and ')}
order by (${score.join('+')}) desc,k.fabric_id limit 6`;
}
export function knowledgeSearchParameters(args){
  validate(tools.find(t=>t.name==='search_fabric_knowledge').parameters,args);
  const values=[args.query,args.colour,args.pattern,args.texture,args.composition].map(knowledgeQuery);
  if(!values[0])fail('INVALID_INPUT');
  return values;
}
