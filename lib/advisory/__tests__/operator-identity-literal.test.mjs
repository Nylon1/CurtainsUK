import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {operatorIdentityLiteral} from '../operator-identity-literal.mjs';
test('identity literals reject SQL syntax, controls and unbounded input',()=>{
 for(const v of ['',null,12,"x' OR true --",'x\\y','x;y','x\ny','x\u0000y','x y','é','x'.repeat(129)])assert.throws(()=>operatorIdentityLiteral(v),/INVALID_OPERATOR_IDENTITY/);
 for(const v of ['pt-1204-212','SDG.A:07','ac425f78-f6ec-4623-97bb-df8763d79d5a'])assert.equal(operatorIdentityLiteral(v),"'"+v+"'");
});
test('all approved fabric identities preserve their exact bytes as constants',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../../../artifacts/jane-eligible-scope-20261011/eligible-manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.ids.length,11517);for(const id of manifest.ids)assert.equal(operatorIdentityLiteral(id),"'"+id+"'");
});
test('local Postgres preserves selection, order and unknown values while using its identity index',async()=>{
 const db=new PGlite();try{
 await db.exec("create table fabrics(id text primary key,eligible boolean not null,width_mm integer,description text);insert into fabrics select 'pt-'||n,n%5<>0,case when n%2=0 then 1400 else null end,null from generate_series(1,2000) n;analyze fabrics;");
 const ids=['pt-7','pt-5','pt-1','pt-10','pt-1500','pt-3000'];
 const constant='array['+ids.map(operatorIdentityLiteral).join(',')+']::text[]';
 const previous='array['+ids.map(id=>"convert_from(decode('"+Buffer.from(id).toString('hex')+"','hex'),'UTF8')").join(',')+']::text[]';
 const query=array=>`select id,width_mm,description from fabrics where id=any(${array}) and eligible order by array_position(${array},id)`;
 const before=(await db.query(query(previous))).rows,after=(await db.query(query(constant))).rows;assert.deepEqual(after,before);assert.deepEqual(after,[{id:'pt-7',width_mm:null,description:null},{id:'pt-1',width_mm:null,description:null}]);
 const plan=(await db.query('explain (format json) '+query(constant))).rows;assert.ok(JSON.stringify(plan).includes('fabrics_pkey'));
 }finally{await db.close();}
});
