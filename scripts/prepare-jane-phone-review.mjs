// Creates a GitHub-readable review from a saved synthetic evaluation.
// No provider, key, database or network access.
import {readFile,writeFile} from 'node:fs/promises';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/prepare-jane-phone-review.mjs <evaluation.json> <review.md>');
const report=JSON.parse(await readFile(input,'utf8'));
if(report.mode!=='openai'||report.version!=='jane-foundations-v3'||report.cases?.length!==20)throw Error('INVALID_REVIEW_SOURCE');
const clean=value=>String(value??'').replace(/\r\n?/g,'\n').trim();
const text=['# Jane: phone review of 20 conversations',
  '',
  'These are invented-customer conversations from **profile 2.3.0-preview.1**, tested on 13 October 2026. They are evidence for review, not the current profile or a live customer service. Profile 2.4 has not had a real-model evaluation. The test used a limited 36-fabric knowledge fixture and no live retail offers.',
  '',
  'Please read each full conversation, then tell us which case numbers **work**, **need changes**, or are **uncertain**. For a case needing changes, explain what Jane missed, repeated or said at excessive length. You can reply in this chat or [comment on draft PR #169](https://github.com/Nylon1/CurtainsUK/pull/169) using a label such as `Case 04: ...`. Your qualitative feedback will be recorded separately from the formal two-reviewer scorecards.',
  '',
  'The eight review dimensions are room understanding, colour/pattern/texture reasoning, meaningful alternatives, response to feedback, concise natural voice, current tool accuracy, evidence and eligibility, and useful next steps. A fabricated product fact, price, stock claim, exact colour guarantee or nonexistent tool feature is a critical failure.',
  '',
  '## Jump to a case',
  '',
  ...report.cases.map((c,i)=>`- [Case ${String(i+1).padStart(2,'0')}: ${c.id}](#case-${String(i+1).padStart(2,'0')}-${c.id})`),
  ''];
for(let i=0;i<report.cases.length;i++){
  const c=report.cases[i],number=String(i+1).padStart(2,'0');
  text.push(`## Case ${number}: ${c.id}`,'','**Review focus**','',...c.reviewCriteria.map(item=>`- ${clean(item)}`),'');
  for(const turn of c.transcript){
    if(turn.action&&!['message','summary'].includes(turn.action)){
      text.push(`**Private test action:** ${turn.action} (${turn.status??'unknown'})`,'');
      continue;
    }
    text.push(`**Customer:** ${clean(turn.customer)}`,'',`**Jane:** ${clean(turn.advice?.text??turn.error??'No reply recorded')}`,'');
  }
  text.push('**Feedback:** Works / Needs changes / Unsure. What should Jane remember, solve or say differently?','','[Back to cases](#jump-to-a-case)','','---','');
}
await writeFile(output,text.join('\n'),{flag:'wx'});
console.log(JSON.stringify({cases:report.cases.length,output}));
