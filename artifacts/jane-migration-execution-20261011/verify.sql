-- Read-only verification of the exact approved additive migration.
begin read only;
set local statement_timeout='3s';
set local lock_timeout='500ms';
select jsonb_build_object(
 'observedAt',clock_timestamp(),
 'operator',current_user,
 'postgresVersion',version(),
 'databaseBytes',pg_database_size(current_database()),
 'connections',(select count(*) from pg_stat_activity),
 'lockWaiters',(select count(*) from pg_stat_activity where wait_event_type='Lock'),
 'relations',(select jsonb_agg(x) from (select c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text as acl,pg_get_userbyid(c.relowner) as owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='advisory' order by c.relname)x),
 'columns',(select jsonb_agg(x) from (select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='advisory' order by table_name,ordinal_position)x),
 'constraints',(select jsonb_agg(x) from (select c.relname,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='advisory' order by c.relname,k.conname)x),
 'indexes',(select jsonb_agg(x) from (select tablename,indexname,indexdef from pg_indexes where schemaname='advisory' order by indexname)x),
 'functions',(select jsonb_agg(x) from (select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,p.proconfig,p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='advisory' order by p.proname)x),
 'policies',(select jsonb_agg(x) from (select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='advisory' order by tablename,policyname)x),
 'roles',(select jsonb_agg(x) from (select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls from pg_roles where rolname like 'advisory_%' order by rolname)x),
 'memberships',(select jsonb_agg(x) from (select r.rolname as role,m.rolname as member,g.rolname as grantor,a.admin_option,a.inherit_option,a.set_option from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member join pg_roles g on g.oid=a.grantor where r.rolname like 'advisory_%' order by r.rolname,m.rolname)x),
 'schemas',(select jsonb_agg(x) from (select nspname,nspacl::text as acl from pg_namespace where nspname in ('advisory','auth') order by nspname)x),
 'emptyBytes',(select sum(pg_total_relation_size(c.oid)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='advisory' and c.relkind in ('r','S')),
 'rowCounts',jsonb_build_object('consultations',(select count(*) from advisory.consultations),'leases',(select count(*) from advisory.leases),'usage_windows',(select count(*) from advisory.usage_windows),'evaluation_runs',(select count(*) from advisory.evaluation_runs),'spend_reservations',(select count(*) from advisory.spend_reservations),'knowledge_search',(select count(*) from advisory.knowledge_search),'index_jobs',(select count(*) from advisory.index_jobs),'index_job_items',(select count(*) from advisory.index_job_items),'index_gate',(select count(*) from advisory.index_gate)),
 'accessMatrix',(select jsonb_agg(x) from (select r.rolname,has_schema_privilege(r.rolname,'advisory','USAGE') as advisory_usage,has_schema_privilege(r.rolname,'auth','USAGE') as auth_usage,has_table_privilege(r.rolname,'advisory.consultations','SELECT') as consultations_select,has_table_privilege(r.rolname,'advisory.knowledge_search','INSERT') as knowledge_insert,has_sequence_privilege(r.rolname,'advisory.index_job_items_write_sequence_seq','USAGE') as sequence_usage from pg_roles r where r.rolname in ('anon','authenticated','service_role','advisory_runtime','advisory_indexer','advisory_retention') order by r.rolname)x),
 'browserObjectPrivileges',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a left join pg_roles r on r.oid=a.grantee where n.nspname='advisory' and (a.grantee=0 or r.rolname in ('anon','authenticated','service_role'))),
 'browserFunctionPrivileges',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(p.proacl) a left join pg_roles r on r.oid=a.grantee where n.nspname='advisory' and (a.grantee=0 or r.rolname in ('anon','authenticated','service_role'))),
 'existingObjectGrants',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a join pg_roles r on r.oid=a.grantee where n.nspname<>'advisory' and r.rolname like 'advisory_%'),
 'existingColumnGrants',(select count(*) from pg_attribute at join pg_class c on c.oid=at.attrelid join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(at.attacl) a join pg_roles r on r.oid=a.grantee where n.nspname<>'advisory' and r.rolname like 'advisory_%')
) as inventory;
rollback;
