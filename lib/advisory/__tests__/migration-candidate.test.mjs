import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const dir=process.env.ADVISORY_EVIDENCE_DIR??'artifacts/jane-auth-fix-20261011';
const bundle=JSON.parse(await readFile(dir+'/migration-bundle.json','utf8'));
const sql=(await readFile(bundle.migrationPath,'utf8')).replace(/\r\n/g,'\n');

test('exact atomic migration preserves source data, fails closed and inventories every object and grant',async()=>{
 const db=new PGlite();
 try{
  assert.equal(createHash('sha256').update(sql).digest('hex'),bundle.sha256);
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create role supabase_admin;create role migration_operator nosuperuser createrole;create schema auth authorization supabase_admin;create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz,secret_fixture text);alter table auth.sessions owner to supabase_admin;revoke all on schema auth from public;grant usage on schema auth to migration_operator;create schema curtainsuk_private;create table curtainsuk_private.fabric_colourways(fabric_id text primary key,protected_value text);insert into curtainsuk_private.fabric_colourways values('fixture-1','unchanged');");
  await db.exec((await db.query("select format('grant create on database %I to migration_operator',current_database()) as sql")).rows[0].sql);
  const authSnapshot=async()=>(await db.query("select n.nspacl::text as schema_acl,c.relacl::text as table_acl,pg_get_userbyid(n.nspowner) as schema_owner,pg_get_userbyid(c.relowner) as table_owner from pg_namespace n join pg_class c on c.relnamespace=n.oid where n.nspname='auth' and c.relname='sessions'")).rows;
  const protectedBefore=await authSnapshot();
  // Match hosted postgres: CREATEROLE, not superuser, no Auth grant option.
  await db.exec('set role migration_operator');
  assert.deepEqual((await db.query("select rolsuper,has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') as can_grant from pg_roles where rolname=current_user")).rows,[{rolsuper:false,can_grant:false}]);
  await assert.rejects(db.exec('begin;create role advisory_auth_verifier nologin;grant usage on schema auth to advisory_auth_verifier;grant select(id,user_id,not_after) on auth.sessions to advisory_auth_verifier;commit;'),/permission denied/);
  await db.exec('rollback');
  assert.equal((await db.query("select count(*)::int n from pg_roles where rolname='advisory_auth_verifier'")).rows[0].n,0);
  assert.doesNotMatch(sql.replace(/^--.*$/gm,''),/\bauth\s*\./i);
  const absent=async()=>assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='advisory'")).rows[0].n,0);
  // Failure after every DDL/grant must roll back roles, grants, tables and seeds.
  await assert.rejects(db.exec(sql.replace(/commit;\s*$/,"select 1/0;commit;")),/division by zero/);await db.exec('rollback');await absent();
  assert.equal((await db.query("select count(*)::int n from pg_roles where rolname like 'advisory_%'")).rows[0].n,0);
  const start=performance.now();await db.exec(sql);const elapsedMs=performance.now()-start;
  const query=async q=>(await db.query(q)).rows;
  const relations=await query("select c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text as acl,pg_get_userbyid(c.relowner) as owner from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='advisory' order by c.relname");
  const columns=await query("select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='advisory' order by table_name,ordinal_position");
  const constraints=await query("select c.relname,k.conname,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='advisory' order by c.relname,k.conname");
  const indexes=await query("select tablename,indexname,indexdef from pg_indexes where schemaname='advisory' order by indexname");
  const functions=await query("select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,p.proconfig,p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='advisory' order by p.proname");
  const policies=await query("select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='advisory' order by tablename,policyname");
  const roles=await query("select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls from pg_roles where rolname like 'advisory_%' order by rolname");
  const memberships=await query("select r.rolname as role,m.rolname as member,g.rolname as grantor,a.admin_option,a.inherit_option,a.set_option from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member join pg_roles g on g.oid=a.grantor where r.rolname like 'advisory_%' order by r.rolname,m.rolname");
  const schemas=await query("select nspname,nspacl::text as acl from pg_namespace where nspname in ('advisory','auth') order by nspname");
  const authGrants=await query("select table_schema,table_name,column_name,grantee,privilege_type from information_schema.column_privileges where table_schema<>'advisory' and grantee like 'advisory_%' order by column_name");
  const bytes=Number((await query("select sum(pg_total_relation_size(c.oid)) as bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='advisory' and c.relkind in ('r','S')"))[0].bytes);
  const report={classification:'LOCAL_PGLITE_NOT_HOSTED_VERIFICATION',checkedAt:new Date().toISOString(),migration:bundle,postgresVersion:(await query('select version()'))[0].version,migrationOperator:{superuser:false,authGrantOption:false,originalFailureReproduced:true},elapsedMs,emptyBytes:bytes,relations,columns,constraints,indexes,functions,policies,roles,memberships,schemas,existingObjectGrants:authGrants};
  assert.ok(memberships.every(m=>m.member==='migration_operator'&&m.admin_option&&!m.inherit_option&&!m.set_option));
  assert.ok(roles.every(r=>!r.rolsuper&&!r.rolcanlogin&&!r.rolinherit&&!r.rolbypassrls&&!r.rolcreaterole&&!r.rolcreatedb));assert.equal(roles.length,3);
  assert.deepEqual(authGrants,[]);assert.deepEqual(await authSnapshot(),protectedBefore);
  assert.ok(relations.filter(r=>r.relkind==='r').every(r=>r.relrowsecurity));assert.ok(functions.every(f=>!f.prosecdef));
  for(const role of ['anon','authenticated','service_role']){
   const allowed=(await db.query("select has_schema_privilege($1,'advisory','USAGE') as allowed",[role])).rows[0].allowed;assert.equal(allowed,false);
   assert.equal((await db.query("select has_sequence_privilege($1,'advisory.index_job_items_write_sequence_seq','USAGE') as allowed",[role])).rows[0].allowed,false);
  }
  await assert.rejects(db.query('select * from auth.sessions'),/permission denied/);
  assert.equal((await query('select count(*)::int n from advisory.consultations'))[0].n,0);
  assert.equal((await query('select count(*)::int n from advisory.index_jobs'))[0].n,0);
  await assert.rejects(db.exec(sql),/ADVISORY_OBJECT_CONFLICT_REVIEW_REQUIRED/);await db.exec('rollback');
  assert.equal((await query('select count(*)::int n from advisory.index_gate'))[0].n,1);
  await db.exec('reset role');
  assert.deepEqual(await query('select * from curtainsuk_private.fabric_colourways'),[{fabric_id:'fixture-1',protected_value:'unchanged'}]);
  assert.equal((await query('select count(*)::int n from auth.sessions'))[0].n,0);
  for(const role of roles)await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role.rolname);await tx.query('select * from auth.sessions');}),/permission denied/);
  await writeFile(dir+'/migration-objects.json',JSON.stringify(report,null,2)+'\n');
 }finally{await db.close();}
});
