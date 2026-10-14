import {fail,UUID} from './contracts.mjs';
import {EXISTING_PROJECT_REF} from './hosted-test.mjs';
import {knowledgeSearchParameters,knowledgeSearchSql} from './knowledge-query.mjs';
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

// The model receives this one bounded read operation, never a SQL client.
// The caller cannot select tables, columns, SQL text or a result limit.
export function createPrivateAdvisoryKnowledgeSearch({transaction,projectRef}){
  if(projectRef!==EXISTING_PROJECT_REF)fail('HOSTED_CLIENT_MISMATCH',503);
  return {search:async args=>{
    const params=knowledgeSearchParameters(args);
    return transaction(async tx=>{
      const role=(await tx.query('select current_user as role')).rows[0]?.role;
      if(role!=='advisory_runtime')fail('UNSCOPED_DATABASE_ROLE',503);
      // Use the already-reviewed ranked query on the isolated advisory index.
      // No hosted function replacement or Fabric Master scan is needed here.
      const result=await tx.query(knowledgeSearchSql(),params);
      const ids=result.rows.map(row=>row.fabric_id);
      if(ids.length>6||ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9-]{0,149}$/.test(id)))fail('INVALID_UPSTREAM_RESPONSE',503);
      return {ids,coverage:{state:'hosted-index-read',complete:false,source:'advisory.knowledge_search'}};
    });
  }};
}

// Only the authenticated server role can request today's fixed-cap ledger.
// The database chooses the UTC date and atomically creates at most one row.
export function createPrivateAdvisoryDailyRun({transaction,projectRef}){
  if(projectRef!==EXISTING_PROJECT_REF)fail('HOSTED_CLIENT_MISMATCH',503);
  return async()=>transaction(async tx=>{
    const role=(await tx.query('select current_user as role')).rows[0]?.role;
    if(role!=='advisory_runtime')fail('UNSCOPED_DATABASE_ROLE',503);
    const id=(await tx.query('select advisory.ensure_public_daily_run() as id')).rows[0]?.id;
    if(typeof id!=='string'||!new RegExp(UUID).test(id))fail('INVALID_BUDGET',503);
    return id;
  });
}
