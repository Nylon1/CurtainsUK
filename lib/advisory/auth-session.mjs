import {fail,UUID} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';
// Server-only, indexed Auth-session existence check after signature/getUser
// verification. Never trusts user_metadata and never caches a revoked session.
export function createAuthSessionVerifier({transaction,projectRef}){
 if(projectRef!==EXISTING_PROJECT_REF)fail('HOSTED_CLIENT_MISMATCH',503);
 return async(owner,sessionId)=>{
  if(!new RegExp(UUID).test(owner??'')||!new RegExp(UUID).test(sessionId??''))return false;
  try{return await transaction(async tx=>{
    const role=(await tx.query('select current_user as role')).rows[0].role;
    if(role!=='advisory_auth_verifier')return false;
    await tx.query("select set_config('statement_timeout','2000',true)");
    return (await tx.query('select exists(select 1 from auth.sessions where id=$1 and user_id=$2 and (not_after is null or not_after>clock_timestamp())) as active',[sessionId,owner])).rows[0]?.active===true;
  });}catch{return false;}
 };
}
