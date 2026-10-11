import {open,readFile,unlink,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fail} from './contracts.mjs';

// Local operator evidence, not a product database. Dedicated directory outside
// public assets; each exact generated SQL plan is appended and fsynced before
// submission. Retain all history. A crash lock is never silently stolen.
export function createIndexJournal(directory){
  const file=path.join(directory,'journal.jsonl'),lock=path.join(directory,'operator.lock');let held=false;
  const append=async event=>{
    if(!held)fail('INDEX_OPERATOR_LOCK_REQUIRED',409);
    const h=await open(file,'a',0o600);try{await h.writeFile(JSON.stringify(event)+'\n');await h.sync();}finally{await h.close();}
  };
  return {
    async exclusive(fn){
      await mkdir(directory,{recursive:true,mode:0o700});
      let handle;try{handle=await open(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')fail('INDEX_OPERATOR_LOCKED',409);throw e;}
      held=true;
      try{await handle.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));await handle.sync();return await fn();}
      finally{held=false;await handle.close();await unlink(lock);}
    },
    async pending(){
      if(!held)fail('INDEX_OPERATOR_LOCK_REQUIRED',409);
      let text;try{text=await readFile(file,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}
      if(text&&!text.endsWith('\n'))fail('INDEX_JOURNAL_REQUIRES_REVIEW',409);
      let pending=null;
      try{for(const line of text.trim().split('\n').filter(Boolean)){
        const e=JSON.parse(line);
        if(e.kind==='prepared'&&!pending)pending=e.plan;
        else if(e.kind==='verified'&&pending?.sqlSha256===e.sqlSha256)pending=null;
        else fail('INDEX_JOURNAL_REQUIRES_REVIEW',409);
      }}catch{fail('INDEX_JOURNAL_REQUIRES_REVIEW',409);}
      return pending;
    },
    prepared:plan=>append({kind:'prepared',at:new Date().toISOString(),plan}),
    verified:(plan,receipt)=>append({kind:'verified',at:new Date().toISOString(),sqlSha256:plan.sqlSha256,receipt})
  };
}
