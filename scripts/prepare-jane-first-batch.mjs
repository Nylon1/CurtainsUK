// Creates reviewable SQL only. The approved operator submits its exact bytes
// through the existing project connector and reads back its durable checkpoint.
import {readFile,writeFile} from 'node:fs/promises';
import {prepareFirstBatch} from '../lib/advisory/first-batch-plan.mjs';
const input=JSON.parse(await readFile(process.argv[2],'utf8'));
const plan=prepareFirstBatch(input);
await writeFile(process.argv[3],plan.sql,{flag:'wx'});
await writeFile(process.argv[3]+'.json',JSON.stringify({...plan,sql:undefined,records:undefined},null,2),{flag:'wx'});
console.log(JSON.stringify({jobId:plan.jobId,sqlSha256:plan.sqlSha256,deadline:plan.deadline,ids:plan.ids}));
