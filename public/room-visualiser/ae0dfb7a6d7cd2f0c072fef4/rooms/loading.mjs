// Loading orchestration only. No scene, material, geometry or motion imports.
export const LOADING_STAGES=Object.freeze(['Preparing your fabric','Dressing the window','Bringing your room together']);

export function createLoadingPhases({onChange=()=>{},now=()=>performance.now()}={}){
  let generation=0,current=null;const history=[];
  function publish(operation,status,stage=operation.stage,error=null){
    if(operation.id!==generation)return false;
    operation.stage=stage;operation.status=status;
    const state={id:operation.id,status,stage,label:status==='error'?'This view could not load. Please try again.':LOADING_STAGES[stage],at:now(),error:error?String(error):null};
    history.push(state);onChange(state);return true;
  }
  return {history,begin({stage=0,retry}={}){
    if(!Number.isInteger(stage)||!LOADING_STAGES[stage])throw Error('INVALID_LOADING_STAGE');
    const operation={id:++generation,stage,status:'loading',retry};current=operation;publish(operation,'loading');
    return {get current(){return operation.id===generation;},advance(next){if(next<operation.stage||!LOADING_STAGES[next])throw Error('INVALID_LOADING_STAGE');return publish(operation,'loading',next);},complete(){return publish(operation,'ready');},fail(error){return publish(operation,'error',operation.stage,error);}};
  },async retry(){if(current?.status!=='error'||typeof current.retry!=='function')return false;const failed=current;try{await failed.retry();return true;}catch(error){publish(failed,'error',failed.stage,error);return false;}}};
}

/** Memoize required work; rejected requests are removable/retryable, resolved
 * values have a bounded least-recently-used lifetime. Pending work is shared. */
export function createResourceCache({load,weigh=value=>value.byteLength,release=()=>{},maxEntries=4,maxBytes=4*1024*1024}){
  const entries=new Map();let bytes=0;
  function remove(key){const entry=entries.get(key);if(!entry)return;entries.delete(key);if(entry.resolved){bytes-=entry.bytes;release(key,entry.value);}}
  function trim(){for(const [key,entry] of entries){if(entries.size<=maxEntries&&bytes<=maxBytes)break;if(entry.resolved)remove(key);}}
  return {has:key=>entries.has(key),get size(){return entries.size;},get bytes(){return bytes;},keys:()=>[...entries.keys()],
    get(key){const found=entries.get(key);if(found){entries.delete(key);entries.set(key,found);return found.promise;}
      const entry={resolved:false,bytes:0,value:null};entries.set(key,entry);
      entry.promise=Promise.resolve().then(()=>load(key)).then(value=>{entry.value=value;entry.bytes=weigh(value);if(!Number.isFinite(entry.bytes)||entry.bytes<0)throw Error('INVALID_RESOURCE_SIZE');entry.resolved=true;bytes+=entry.bytes;trim();return value;}).catch(error=>{if(entries.get(key)===entry)remove(key);throw error;});return entry.promise;
    },clear(){for(const [key,entry] of entries)if(entry.resolved)remove(key);}};
}

export function mayPreload(connection){return !connection?.saveData&&!['slow-2g','2g'].includes(connection?.effectiveType);}

/** One bounded request at a time, after first-ready. Activity pauses the next
 * task; an already in-flight fetch is allowed to finish and populate its cache. */
export function createIdlePreloader({tasks,isBusy=()=>false,isAllowed=()=>true,onResult=()=>{},onError=()=>{},requestIdle=fn=>globalThis.requestIdleCallback?requestIdleCallback(fn,{timeout:3000}):setTimeout(fn,700),cancelIdle=id=>globalThis.cancelIdleCallback?cancelIdleCallback(id):clearTimeout(id),defer=fn=>setTimeout(fn,750),cancelDefer=clearTimeout}){
  let started=false,stopped=false,scheduled=null,delayed=null,running=false,index=0;
  function schedule(){if(!started||stopped||running||scheduled!==null||delayed!==null||index>=tasks.length||!isAllowed())return;scheduled=requestIdle(async()=>{scheduled=null;if(stopped||!isAllowed())return;if(isBusy()){delayed=defer(()=>{delayed=null;schedule();});return;}const task=tasks[index++];running=true;try{onResult(task,await task.run());}catch(error){onError(task,error);}finally{running=false;schedule();}});}
  return {start(){started=true;schedule();},wake:schedule,stop(){stopped=true;if(scheduled!==null)cancelIdle(scheduled);if(delayed!==null)cancelDefer(delayed);scheduled=delayed=null;},get state(){return{started,stopped,running,completed:index-(running?1:0),total:tasks.length};}};
}

export function resourceBytes(entries){return entries.reduce((sum,r)=>({decodedBodyBytes:sum.decodedBodyBytes+(r.decodedBodySize||0),transferBytes:sum.transferBytes+(r.transferSize||0),resources:sum.resources+1}),{decodedBodyBytes:0,transferBytes:0,resources:0});}
