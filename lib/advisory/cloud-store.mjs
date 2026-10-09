import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {fail,UUID} from './contracts.mjs';
const uuid=new RegExp(UUID);
const known={CONSULTATION_BUSY:409,LEASE_LOST:409,REVISION_CONFLICT:409,SESSION_LIMIT:429,RATE_LIMITED:429,BUDGET_EXHAUSTED:429,INVALID_BUDGET_RECEIPT:500,UNAUTHORISED:401};
// rpc is a PRIVATE server client, never the browser's Supabase client. ownerId
// must come from verifyCloudPrincipal; no caller-selected owner is accepted at HTTP.
export class CloudSessionStore {
  constructor({rpc,ownerId,cipher}){if(!uuid.test(ownerId))fail('UNAUTHORISED',401);this.rpc=rpc;this.ownerId=ownerId;this.cipher=cipher;this.requireConsent=true;this.lease=new AsyncLocalStorage();}
  async command(action,payload){
    let response;try{response=await this.rpc({p_owner:this.ownerId,p_action:action,p_payload:payload});}catch{fail('STORAGE_UNAVAILABLE',503);}
    if(response.error){const code=Object.keys(known).find(k=>response.error.message?.includes(k));fail(code??'STORAGE_UNAVAILABLE',known[code]??503);}
    return response.data;
  }
  async get(id){if(!this.cipher)fail('STORAGE_KEY_REQUIRED',503);return this.cipher.open(await this.command('get',{id}));}
  async findStart(requestId){if(!this.cipher)fail('STORAGE_KEY_REQUIRED',503);return this.cipher.open(await this.command('findStart',{requestId}));}
  async commit(state,expected){
    if(state.owner!==this.ownerId||!state.saved)fail('CONSENT_REQUIRED',403);
    const token=this.lease.getStore();if(!token)fail('LEASE_LOST',409);
    if(!this.cipher)fail('STORAGE_KEY_REQUIRED',503);
    await this.command('commit',{id:state.id,state:this.cipher.seal(state),expected,token});
  }
  async remove(id){const token=this.lease.getStore();if(!token)fail('LEASE_LOST',409);await this.command('delete',{id,token});}
  async locked(resource,fn){
    const token=randomUUID();await this.command('lease',{resource,token});
    try{return await this.lease.run(token,fn);}finally{
      // A lost release response must not hide a successful committed operation.
      // The fixed lease expires; stale worker commits remain fenced out.
      await this.command('release',{resource,token}).catch(()=>{});
    }
  }
  take(){return this.command('limit',{});}
  purgeExpired(){return this.command('purgeExpired',{});}
  budget(runId,sessionId){
    if(!uuid.test(runId)||!uuid.test(sessionId))fail('INVALID_BUDGET',500);
    return {
      reserve:async usd=>{if(!Number.isFinite(usd)||usd<=0)fail('INVALID_BUDGET',500);const id=randomUUID();await this.command('reserve',{id,runId,sessionId,micro:Math.ceil(usd*1e6)});return id;},
      settle:async(id,usd)=>{if(usd!==null&&(!Number.isFinite(usd)||usd<0))fail('INVALID_BUDGET_RECEIPT',500);const r=await this.command('settle',{id,micro:usd===null?null:Math.ceil(usd*1e6)});if(r.ceilingExceeded)fail('BUDGET_CEILING_EXCEEDED',503);}
    };
  }
}
// getUser performs network verification; getClaims verifies the token signature,
// issuer/expiry. Also require an active Auth session for immediate logout/deletion
// enforcement. Raw JWT decoding or editable user_metadata are never authority.
export async function verifyCloudPrincipal({token,auth,sessionActive,issuer,now=()=>Date.now()}){
  if(typeof token!=='string'||token.length>8192||typeof sessionActive!=='function')fail('UNAUTHORISED',401);
  try{
    const [{data:userData,error:userError},{data:claimData,error:claimError}]=await Promise.all([auth.getUser(token),auth.getClaims(token)]);
    const user=userData?.user,c=claimData?.claims;
    if(userError||claimError||!user||user.is_anonymous||!c||!uuid.test(user.id)||c.sub!==user.id||c.role!=='authenticated'||c.iss!==issuer||!Number.isFinite(c.exp)||c.exp*1000<=now()||!uuid.test(c.session_id)||!await sessionActive(user.id,c.session_id))fail('UNAUTHORISED',401);
    return {owner:user.id,sessionId:c.session_id};
  }catch{fail('UNAUTHORISED',401);}
}
