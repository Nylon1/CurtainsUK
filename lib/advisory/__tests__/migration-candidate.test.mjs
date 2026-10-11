import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
const dir='artifacts/jane-pro-readiness-20261011';
const bundle=JSON.parse(await readFile(dir+'/migration-bundle.json','utf8'));
const sql=(await readFile(bundle.migrationPath,'utf8')).replace(/\r\n/g,'\n');

test('exact atomic migration preserves source data, fails closed and inventories every object and grant',async()=>{
 const db=new PGlite();
 try{
  assert.equal(createHash('sha256').update(sql).digest('hex'),bundle.sha256);
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz,secret_fixture text);create schema curtainsuk_private;create table curtainsuk_private.fabric_colourways(fabric_id text primary key,protected_value text);insert into curtainsuk_private.fabric_colourways values('fixture-1','unchanged');");
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
  const schemas=await query("select nspname,nspacl::text as acl from pg_namespace where nspname in ('advisory','auth') order by nspname");
  const authGrants=await query("select table_schema,table_name,column_name,grantee,privilege_type from information_schema.column_privileges where grantee='advisory_auth_verifier' order by column_name");
  const bytes=Number((await query("select sum(pg_total_relation_size(c.oid)) as bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='advisory' and c.relkind in ('r','S')"))[0].bytes);
  const report={classification:'LOCAL_PGLITE_NOT_HOSTED_VERIFICATION',checkedAt:new Date().toISOString(),migration:bundle,postgresVersion:(await query('select version()'))[0].version,elapsedMs,emptyBytes:bytes,relations,columns,constraints,indexes,functions,policies,roles,schemas,existingObjectGrants:authGrants};
  assert.ok(roles.every(r=>!r.rolsuper&&!r.rolcanlogin&&!r.rolinherit&&!r.rolbypassrls&&!r.rolcreaterole&&!r.rolcreatedb));assert.equal(roles.length,4);
  assert.deepEqual(authGrants.map(g=>g.column_name),['id','not_after','user_id']);assert.ok(authGrants.every(g=>g.privilege_type==='SELECT'));
  assert.ok(relations.filter(r=>r.relkind==='r').every(r=>r.relrowsecurity));assert.ok(functions.every(f=>!f.prosecdef));
  for(const role of ['anon','authenticated','service_role']){
   const allowed=(await db.query("select has_schema_privilege($1,'advisory','USAGE') as allowed",[role])).rows[0].allowed;assert.equal(allowed,false);
   assert.equal((await db.query("select has_sequence_privilege($1,'advisory.index_job_items_write_sequence_seq','USAGE') as allowed",[role])).rows[0].allowed,false);
  }
  assert.deepEqual(await query('select * from curtainsuk_private.fabric_colourways'),[{fabric_id:'fixture-1',protected_value:'unchanged'}]);
  assert.equal((await query('select count(*)::int n from auth.sessions'))[0].n,0);
  assert.equal((await query('select count(*)::int n from advisory.consultations'))[0].n,0);
  assert.equal((await query('select count(*)::int n from advisory.index_jobs'))[0].n,0);
  await assert.rejects(db.exec(sql),/ADVISORY_OBJECT_CONFLICT_REVIEW_REQUIRED/);await db.exec('rollback');
  assert.equal((await query('select count(*)::int n from advisory.index_gate'))[0].n,1);
  // Auth verifier can only read its three columns, not application data.
  await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role advisory_auth_verifier');await tx.query('select secret_fixture from auth.sessions');}),/permission denied/);
  await writeFile(dir+'/migration-objects.json',JSON.stringify(report,null,2)+'\n');
 }finally{await db.close();}
});
