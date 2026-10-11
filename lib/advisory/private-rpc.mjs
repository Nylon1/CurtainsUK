import {fail,UUID} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';
// Supply a server-only pool authenticated as the reviewed NOINHERIT role.
// Owners come from verifyCloudPrincipal. Each transaction resets its identity;
// a pooled connection cannot retain the previous customer's RLS context.
export function createPrivateAdvisoryRpc({transaction,projectRef}){
  if(projectRef!==EXISTING_PROJECT_REF)fail('HOSTED_CLIENT_MISMATCH',503);
  const rpc=async p=>{
    if(!new RegExp(UUID).test(p.p_owner??''))fail('UNAUTHORISED',401);
    return transaction(async tx=>{
      const role=(await tx.query('select current_user as role')).rows[0].role;
      if(role!=='advisory_runtime')fail('UNSCOPED_DATABASE_ROLE',503);
      await tx.query("select set_config('advisory.owner',$1,true),set_config('statement_timeout','3000',true),set_config('lock_timeout','500',true)",[p.p_owner]);
      try{return {data:(await tx.query('select advisory.runtime($1,$2,$3) as value',[p.p_owner,p.p_action,p.p_payload])).rows[0].value};}
      catch(error){return {error:{message:error.message}};}
    });
  };
  return Object.assign(rpc,{projectRef,schema:'advisory',role:'advisory_runtime'});
}
