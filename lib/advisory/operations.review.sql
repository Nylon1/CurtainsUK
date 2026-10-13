-- REVIEW ONLY, final advisory-storage grants. Existing project, advisory schema only.
-- No LOGIN passwords, memberships, Auth changes, schedules or API exposure.
create role advisory_runtime nologin noinherit;
create role advisory_indexer nologin noinherit;
create role advisory_retention nologin noinherit;
revoke all on schema advisory from public,anon,authenticated,service_role;
revoke all on all tables in schema advisory from public,anon,authenticated,service_role;
revoke all on all functions in schema advisory from public,anon,authenticated,service_role;
grant usage on schema advisory to advisory_runtime,advisory_indexer,advisory_retention;
grant select,insert,update,delete on advisory.consultations,advisory.leases,advisory.usage_windows,advisory.spend_reservations to advisory_runtime;
grant select,update on advisory.evaluation_runs to advisory_runtime;
grant execute on function advisory.runtime(uuid,text,jsonb) to advisory_runtime;
create policy advisory_runtime_consultations on advisory.consultations to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
create policy advisory_runtime_leases on advisory.leases to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
create policy advisory_runtime_windows on advisory.usage_windows to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
create policy advisory_runtime_spend on advisory.spend_reservations to advisory_runtime
 using(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid)
 with check(owner_id=nullif(current_setting('advisory.owner',true),'')::uuid);
-- Shared run accounting must be locked across owners. Only trusted backend has
-- this role; the HTTP boundary cannot choose owner, SQL or spend values.
create policy advisory_runtime_runs on advisory.evaluation_runs to advisory_runtime using(true) with check(true);
grant select on advisory.knowledge_search to advisory_runtime;
create policy advisory_runtime_knowledge on advisory.knowledge_search for select to advisory_runtime using(true);
grant execute on function advisory.search_knowledge(text,text,text,text,text) to advisory_runtime;
grant select,insert,update,delete on advisory.knowledge_search to advisory_indexer;
grant select,insert,update on advisory.index_jobs,advisory.index_job_items to advisory_indexer;
grant select,update on advisory.index_gate to advisory_indexer;
grant usage on sequence advisory.index_job_items_write_sequence_seq to advisory_indexer;
create policy advisory_index_knowledge on advisory.knowledge_search to advisory_indexer using(true) with check(true);
create policy advisory_index_jobs on advisory.index_jobs to advisory_indexer using(true) with check(true);
create policy advisory_index_items on advisory.index_job_items to advisory_indexer using(true) with check(true);
create policy advisory_index_gate on advisory.index_gate to advisory_indexer using(true) with check(true);
-- Retention is separate from customer requests and never depends on a return
-- visit. One invocation deletes at most 20 rows from each table. No scheduler.
create index advisory_retention_sessions on advisory.consultations(expires_at);
create index advisory_retention_leases on advisory.leases(expires_at);
create index advisory_retention_windows on advisory.usage_windows(window_start);
create index advisory_retention_spend on advisory.spend_reservations(created_at);
grant select,delete on advisory.consultations,advisory.leases,advisory.usage_windows,advisory.spend_reservations to advisory_retention;
grant select on advisory.evaluation_runs to advisory_retention;
-- PostgreSQL requires UPDATE on at least one column for FOR UPDATE SKIP LOCKED.
-- Limit it to expiry fields; RLS rejects moving expired records into the future.
grant update(expires_at) on advisory.consultations,advisory.leases to advisory_retention;
grant update(window_start) on advisory.usage_windows to advisory_retention;
grant update(created_at) on advisory.spend_reservations to advisory_retention;
create policy advisory_retention_sessions on advisory.consultations to advisory_retention using(expires_at<clock_timestamp());
create policy advisory_retention_leases on advisory.leases to advisory_retention using(expires_at<clock_timestamp());
create policy advisory_retention_windows on advisory.usage_windows to advisory_retention using(window_start<clock_timestamp()-interval '2 days');
create policy advisory_retention_spend on advisory.spend_reservations to advisory_retention using(created_at<clock_timestamp()-interval '90 days');
create policy advisory_retention_runs on advisory.evaluation_runs for select to advisory_retention using(expires_at<clock_timestamp());
create function advisory.purge_expired() returns jsonb language plpgsql security invoker
set search_path='' set statement_timeout='3s' as $$
declare sessions integer; leases integer; windows integer; receipts integer;
begin
 delete from advisory.consultations where id in (select id from advisory.consultations where expires_at<clock_timestamp() order by expires_at limit 20 for update skip locked);
 get diagnostics sessions=row_count;
 delete from advisory.leases where (owner_id,resource) in (select owner_id,resource from advisory.leases where expires_at<clock_timestamp() order by expires_at limit 20 for update skip locked);
 get diagnostics leases=row_count;
 delete from advisory.usage_windows where (owner_id,window_start,kind) in (select owner_id,window_start,kind from advisory.usage_windows where window_start<clock_timestamp()-interval '2 days' order by window_start limit 20 for update skip locked);
 get diagnostics windows=row_count;
 -- Unsettled crash receipts are already charged at their reserved ceiling.
 -- Removing identifying receipts never reduces the retained aggregate spend.
 delete from advisory.spend_reservations where id in (select id from advisory.spend_reservations where created_at<clock_timestamp()-interval '90 days' and run_id in (select id from advisory.evaluation_runs where expires_at<clock_timestamp()) order by created_at limit 20 for update skip locked);
 get diagnostics receipts=row_count;
 return jsonb_build_object('sessions',sessions,'leases',leases,'windows',windows,'receipts',receipts);
end $$;
revoke all on function advisory.purge_expired() from public,anon,authenticated,service_role;
grant execute on function advisory.purge_expired() to advisory_retention;
