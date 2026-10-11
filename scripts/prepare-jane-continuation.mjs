// Review-only CLI. Never opens a database connection or submits SQL.
import {readFile,writeFile} from 'node:fs/promises';
import {prepareContinuationBatch} from '../lib/advisory/continuation-plan.mjs';
const input=JSON.parse(await readFile(process.argv[2],'utf8'));
const plan=prepareContinuationBatch(input);
await writeFile(process.argv[3],plan.sql,{flag:'wx'});
await writeFile(process.argv[3]+'.json',JSON.stringify({...plan,sql:undefined},null,2),{flag:'wx'});
console.log(JSON.stringify({jobId:plan.jobId,fromOffset:plan.fromOffset,cursor:plan.cursor,ids:plan.ids,sqlSha256:plan.sqlSha256,deadline:plan.deadline}));
