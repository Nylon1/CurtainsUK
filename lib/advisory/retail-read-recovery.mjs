// These helpers cannot write. A fresh successful response is still required for
// every ID; a missing product, redirect or changed identity is never waived.
export function requireRetailResponse(response,now=Date.now()){
 if(response.status===200)return;
 const transient=response.status===429||response.status>=500&&response.status<=599;
 const error=Error(transient?'TRANSIENT_RETAIL_READ':'LIVE_RETAIL_OR_PUBLICATION_UNAVAILABLE');
 if(transient){const seconds=Number(response.retryAfter),date=Date.parse(response.retryAfter);error.retryAfterMs=Math.max(15000,Number.isFinite(seconds)&&seconds>=0?seconds*1000:Number.isFinite(date)?date-now:0);}
 throw error;
}
export function retailNetworkError(error){
 if(error?.name==='TimeoutError'||['ECONNRESET','ETIMEDOUT','EAI_AGAIN','ENETUNREACH'].includes(error?.cause?.code))return Object.assign(Error('TRANSIENT_RETAIL_READ'),{retryAfterMs:15000});
 return error;
}
export async function settleReadPorts(ports){
 const results=await Promise.allSettled(ports),failure=results.find(r=>r.status==='rejected');
 if(failure)throw failure.reason;
 return results.map(r=>r.value);
}
