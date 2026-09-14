import test from 'node:test';
import assert from 'node:assert/strict';
import { observedSupabaseFetch,transportFailure } from '../../supabase/observed-fetch';

test('transport diagnostic excludes secret messages and preserves the original failure without replay',async()=>{
 const error=new TypeError('secret token',{cause:Object.assign(new Error('private host'),{code:'ECONNRESET'})});
 assert.deepEqual(transportFailure(error),['TypeError','ECONNRESET']);
 let calls=0;
 const wrapped=observedSupabaseFetch('database',async()=>{calls++;throw error;});
 await assert.rejects(wrapped('https://example.invalid',{method:'POST',body:'private payload'}),e=>e===error);
 assert.equal(calls,1);
});
test('HTTP rejection is returned intact, never authorized or retried',async()=>{
 const denied=new Response('denied',{status:401});let calls=0;
 const wrapped=observedSupabaseFetch('server-auth',async()=>{calls++;return denied;});
 assert.equal(await wrapped('https://example.invalid'),denied);assert.equal(calls,1);
});
