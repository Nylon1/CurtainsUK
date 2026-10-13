import {fail} from './contracts.mjs';

// Operator-only metadata. Query text, addresses and customer parameters never
// leave PostgreSQL. Client names alone never establish read-only behaviour.
export const ACTIVE_CLIENT_SQL=String.raw`coalesce((select jsonb_agg(to_jsonb(m)) from (
 select a.pid,
 case when a.usename='authenticator' and a.application_name like 'PostgREST %' then 'customer'
      when a.usename='supabase_admin' and a.application_name='postgres_exporter' then 'monitor'
      else 'unknown' end as identity,
 a.state, a.wait_event_type as "waitType",
 a.query is not null and a.query<>'<insufficient privilege>' and a.query_start is not null as visible,
 greatest(0,extract(epoch from clock_timestamp()-a.query_start)*1000) as "queryMs",
 greatest(0,extract(epoch from clock_timestamp()-coalesce(a.xact_start,a.query_start))*1000) as "transactionMs",
 coalesce(a.query ~* '^\s*(select|with)\M' and a.query !~* '\m(insert|update|delete|merge|alter|drop|truncate|create|grant|revoke|copy|vacuum|analyze|refresh|call|do)\M',false) as "readLike",
 a.backend_xid is not null as "hasXid",
 exists(select 1 from pg_locks l where l.pid=a.pid and l.locktype='relation' and l.mode<>'AccessShareLock') as "writeLock",
 exists(select 1 from pg_locks l where l.pid=a.pid and l.locktype='advisory') as "advisoryLock",
 cardinality(pg_blocking_pids(a.pid))>0 or exists(select 1 from pg_locks l where l.pid=a.pid and not l.granted) as blocked,
 exists(select 1 from pg_stat_activity w where a.pid=any(pg_blocking_pids(w.pid))) as blocking,
 coalesce(a.usename ~* 'supplier|advisory_indexer' or a.application_name ~* 'supplier|webtex|sdg-portal|jane.*index',false) as "jobIdentity"
 from pg_stat_activity a where a.pid<>pg_backend_pid() and a.datname=current_database()
 and a.backend_type='client backend' and (a.state='active' or a.backend_xid is not null or a.wait_event_type='Lock')
 order by a.pid limit 61
) m),'[]'::jsonb)`;

export function classifyActiveClients(clients){
 if(!Array.isArray(clients)||clients.length>60)fail('ACTIVITY_EVIDENCE_INVALID',503);
 const result={routineReads:0,transientUnknown:0,conflicts:0,prolonged:0};
 for(const c of clients){
  if(!Number.isInteger(c.pid)||!['customer','monitor','unknown'].includes(c.identity)||c.visible!==true||!Number.isFinite(c.queryMs)||c.queryMs<0||!Number.isFinite(c.transactionMs)||c.transactionMs<0||['readLike','hasXid','writeLock','advisoryLock','blocked','blocking','jobIdentity'].some(k=>typeof c[k]!=='boolean'))fail('ACTIVITY_EVIDENCE_INVALID',503);
  if(c.jobIdentity||c.hasXid||c.writeLock||c.advisoryLock||c.blocked||c.blocking||c.waitType==='Lock'){result.conflicts++;continue;}
  if(c.queryMs>=3000||c.transactionMs>=3000){result.prolonged++;continue;}
  if(c.state==='active'&&c.identity!=='unknown'&&c.readLike)result.routineReads++;
  else result.transientUnknown++;
 }
 return {...result,decision:result.conflicts?'conflict':result.prolonged?'prolonged':result.transientUnknown?'drain':'admit'};
}

export function requireSafeActivity(clients){
 const result=classifyActiveClients(clients);
 if(result.decision!=='admit')fail('INDEX_ACTIVITY_'+result.decision.toUpperCase(),503);
 return result;
}
