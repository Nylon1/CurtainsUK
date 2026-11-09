import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {executeWithDraftReceipt} from '../draft-receipt';
import type {ShopifyDraftOrderExecutionResult} from '../shopify-draft-order-server';

const draftId='gid://shopify/DraftOrder/123';
const success:ShopifyDraftOrderExecutionResult={status:'PRODUCTION_DRAFT_CREATED',paymentEnabled:true,
  shopifyWritePerformed:true,checkoutUrl:'https://example.invalid/invoice',draftOrderId:draftId,draftOrderName:'#D-test'};

test('an immediate retry uses the durable draft ID while tag search is still empty',async()=>{
  let saved:string|null=null,creates=0;
  const ids:Array<string|null>=[];
  const run=()=>executeWithDraftReceipt({load:async()=>saved,save:async id=>{saved=id;},
    execute:async id=>{ids.push(id);if(id)return {...success,status:'EXISTING_PRODUCTION_DRAFT_REUSED',shopifyWritePerformed:false};
      if(creates)throw Error('SHOPIFY_DRAFT_ORDER_PENDING');creates++;return success;}});
  const first=await run();assert.equal(saved,draftId);
  const retry=await run();assert.equal(retry.checkoutUrl,first.checkoutUrl);
  assert.deepEqual(ids,[null,draftId]);assert.equal(creates,1);
});

test('uncertain creates, failed receipt writes and conflicting IDs never return a new success',async()=>{
  let saves=0;
  await assert.rejects(executeWithDraftReceipt({load:async()=>null,save:async()=>{saves++;},
    execute:async()=>{throw Error('SHOPIFY_DRAFT_ORDER_PENDING');}}),/PENDING/);
  assert.equal(saves,0);
  await assert.rejects(executeWithDraftReceipt({load:async()=>null,save:async()=>{throw Error('DATABASE_UNAVAILABLE');},
    execute:async()=>success}),/DATABASE_UNAVAILABLE/);
  await assert.rejects(executeWithDraftReceipt({load:async()=>draftId,save:async()=>{saves++;},
    execute:async()=>({...success,draftOrderId:'gid://shopify/DraftOrder/456'})}),/CONFLICT/);
  assert.equal(saves,0);
});

test('receipts are bound to owner, checkout kind, original contract and one immutable draft',async()=>{
  const db=new PGlite();
  try {
    await db.exec('create schema curtainsuk_private; create role anon; create role authenticated; create role service_role bypassrls; create table curtainsuk_private.staging_configuration_snapshots(snapshot_id uuid primary key);');
    for(const name of ['20261014163749_cushion_studio_distinct_persistence.sql','20261017162157_smart_track_distinct_checkout.sql','20261109084719_checkout_draft_receipts.sql'])
      await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
    const owner='a'.repeat(64),key=randomUUID(),tag='CUK_TRACK_fixture';
    await db.query('insert into curtainsuk_private.smart_track_checkout_groups(idempotency_key,owner_session_hash,payload) values($1,$2,$3)',[key,owner,JSON.stringify({contract:{idempotencyTag:tag}})]);
    await db.query('insert into curtainsuk_private.cushion_checkout_groups(idempotency_key,owner_session_hash,snapshots,contract) values($1,$2,$3,$4)',[key,owner,'[]',JSON.stringify({idempotencyTag:'CUK_CUSHION_fixture'})]);
    await db.exec('grant usage on schema curtainsuk_private to service_role; set role service_role;');
    const record=(kind:string,who=owner,token=tag,id=draftId)=>db.query('select curtainsuk_private.record_my_home_draft_receipt($1,$2,$3,$4,$5)',[kind,who,key,token,id]);
    await assert.rejects(record('SMART_TRACK','b'.repeat(64)),/IDENTITY_MISMATCH/);
    await assert.rejects(record('SMART_TRACK',owner,'different-contract'),/IDENTITY_MISMATCH/);
    await record('SMART_TRACK');await record('SMART_TRACK');
    await assert.rejects(record('SMART_TRACK',owner,tag,'gid://shopify/DraftOrder/456'),/CONFLICT/);
    await record('CUSHION',owner,'CUK_CUSHION_fixture','gid://shopify/DraftOrder/789');
    assert.equal((await db.query('select * from curtainsuk_private.my_home_draft_receipts')).rows.length,2);
    await db.exec('reset role;');
    for(const role of ['anon','authenticated']) {
      const permission=await db.query<{read:boolean;execute:boolean}>("select has_table_privilege($1,'curtainsuk_private.my_home_draft_receipts','SELECT') as read, has_function_privilege($1,'curtainsuk_private.record_my_home_draft_receipt(text,text,text,text,text)','EXECUTE') as execute",[role]);
      assert.deepEqual(permission.rows[0],{read:false,execute:false});
    }
    assert.deepEqual((await db.query<{relrowsecurity:boolean;relforcerowsecurity:boolean}>("select relrowsecurity,relforcerowsecurity from pg_class where oid='curtainsuk_private.my_home_draft_receipts'::regclass")).rows[0],{relrowsecurity:true,relforcerowsecurity:true});
    await assert.rejects(db.exec('delete from curtainsuk_private.my_home_draft_receipts'),/IMMUTABLE/);
    await assert.rejects(db.exec("update curtainsuk_private.my_home_draft_receipts set shopify_draft_order_gid='gid://shopify/DraftOrder/99'"),/IMMUTABLE/);
  } finally {await db.close();}
});
