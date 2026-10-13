import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createSessionCipher} from '../session-cipher.mjs';
import {PGlite} from '@electric-sql/pglite';
test('proposed additive schema: real PostgreSQL RLS, consent, owner isolation, CAS, tampering and deletion',async()=>{
  const db=new PGlite();
  try{
    await db.exec("create role authenticated;create role anon;create role service_role bypassrls;");
    for(const part of ['schema','runtime','search','index-worker','operations'])await db.exec(await readFile(new URL('../'+part+'.review.sql',import.meta.url),'utf8'));
    const cipher=createSessionCipher({activeKeyId:'test',keys:{test:Buffer.alloc(32,1)}});
    const alice=randomUUID(),bob=randomUUID(),id=randomUUID(),expires=Date.now()+86400000;
    const state=cipher.seal({id,owner:alice,revision:0,saved:true,expiresAt:expires,startRequest:randomUUID(),messages:[]});
    await db.exec('set role advisory_runtime');await db.query("select set_config('advisory.owner',$1,false)",[alice]);
    await db.query("insert into advisory.consultations(id,owner_id,revision,state,expires_at,consent_version) values($1,$2,0,$3,to_timestamp($4::double precision / 1000),'advisory-preview-v1')",[id,alice,state,expires]);
    assert.equal((await db.query('select id from advisory.consultations')).rows.length,1);
    const updated=cipher.seal({...cipher.open(state),revision:1});const cas=await db.query('update advisory.consultations set revision=1,state=$1 where id=$2 and revision=0 returning id',[updated,id]);assert.equal(cas.rows.length,1);
    assert.equal((await db.query('update advisory.consultations set revision=1,state=$1 where id=$2 and revision=0 returning id',[updated,id])).rows.length,0);
    await assert.rejects(db.query('update advisory.consultations set owner_id=$1,state=$2 where id=$3',[bob,{...updated,owner:bob},id]),/row-level security/);
    await assert.rejects(db.query('update advisory.consultations set state=$1 where id=$2',[{...updated,saved:false},id]),/check constraint/);
    await assert.rejects(db.query('update advisory.consultations set state=$1 where id=$2',[{...updated,saved:null},id]),/check constraint/);
    await assert.rejects(db.query('update advisory.consultations set state=$1 where id=$2',[{...updated,expiresAt:null},id]),/check constraint/);
    await assert.rejects(db.query('update advisory.consultations set state=$1 where id=$2',[{...updated,owner:bob},id]),/check constraint/);
    await db.query("select set_config('advisory.owner',$1,false)",[bob]);
    assert.equal((await db.query('select id from advisory.consultations where id=$1',[id])).rows.length,0);
    assert.equal((await db.query('delete from advisory.consultations where id=$1 returning id',[id])).rows.length,0);
    await assert.rejects(db.query("insert into advisory.consultations(id,owner_id,revision,state,expires_at,consent_version) values($1,$2,0,$3,to_timestamp($4::double precision / 1000),'advisory-preview-v1')",[randomUUID(),alice,state,expires]));
    await db.exec('reset role; set role anon');await assert.rejects(db.query('select * from advisory.consultations'),/permission denied/);
    await db.exec('reset role; set role advisory_runtime');await db.query("select set_config('advisory.owner',$1,false)",[alice]);
    assert.equal((await db.query('delete from advisory.consultations where id=$1 returning id',[id])).rows.length,1);
  }finally{await db.close();}
});
