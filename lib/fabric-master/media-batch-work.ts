/** Bounded operation of the existing media pipeline; no background queue. */
export async function forEachMediaRecord<T>(items: T[], concurrency: number, work: (item:T)=>Promise<void>) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("MEDIA_CONCURRENCY_INVALID");
  let next=0;
  // Wait for all workers before a caller releases the shared import lock, even
  // when one worker encounters a checkpoint/filesystem failure.
  const outcomes=await Promise.allSettled(Array.from({length:Math.min(concurrency,items.length)},async()=>{
    for (;;) { const index=next++; if(index>=items.length)return; await work(items[index]); }
  }));
  const failed=outcomes.find((o):o is PromiseRejectedResult=>o.status==="rejected");
  if(failed)throw failed.reason;
}

/** Serialize shared-hash jobs and atomic checkpoint writes within one process. */
export function mediaOperationLocks() {
  const tails=new Map<string,Promise<unknown>>();
  return async function locked<T>(key:string,work:()=>Promise<T>):Promise<T>{
    const before=tails.get(key) ?? Promise.resolve();
    const task=before.catch(()=>undefined).then(work);
    tails.set(key,task);
    try{return await task;}finally{if(tails.get(key)===task)tails.delete(key);}
  };
}

/** Windows sync/indexing can briefly hold an atomic checkpoint rename open. */
export async function retryMediaCheckpointRename(
  rename:()=>Promise<void>,
  pause:(ms:number)=>Promise<void> = ms=>new Promise(resolve=>setTimeout(resolve,ms)),
) {
  for(let attempt=0;;attempt++) {
    try { await rename(); return; }
    catch(error) {
      if(attempt>=4 || !["EPERM","EBUSY","EACCES"].includes((error as {code?:string})?.code??""))throw error;
      await pause(100 * 2 ** attempt);
    }
  }
}
