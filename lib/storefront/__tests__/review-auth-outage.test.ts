import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewAuthorization, authServiceUnavailable } from '../review-authz';
const context={authUrl:'https://hqysjumypgeapgmqkcrx.supabase.co',environment:'preview'};
const reviewer={id:'reviewer',is_anonymous:false,app_metadata:{roles:['CURTAINSUK_STAGING_REVIEWER'],curtainsuk_environment:'STAGING'}};

test('upstream 504 is a service outage at both authorization boundaries, never an invalid session',()=>{
 assert.equal(authServiceUnavailable({status:504}),true);
 assert.equal(authServiceUnavailable({status:401}),false);
 assert.equal(authServiceUnavailable(null),false);
 assert.deepEqual(reviewAuthorization({...context,user:null,error:{status:504}}),{status:503,error:'STAFF_AUTH_UNAVAILABLE'});
});
test('temporary auth failure is unavailable, never a role denial or authorization',()=>{
 assert.deepEqual(reviewAuthorization({...context,user:reviewer,error:{status:503}}),{status:503,error:'STAFF_AUTH_UNAVAILABLE'});
 assert.deepEqual(reviewAuthorization({...context,user:null,error:{status:0}}),{status:503,error:'STAFF_AUTH_UNAVAILABLE'});
});
test('one successful verified lookup authorizes the staging reviewer only',()=>{
 assert.deepEqual(reviewAuthorization({...context,user:reviewer,error:null}),{status:200,identity:{id:'reviewer'}});
 assert.equal(reviewAuthorization({...context,user:{...reviewer,app_metadata:{}},error:null}).status,403);
 assert.equal(reviewAuthorization({...context,user:{...reviewer,is_anonymous:true},error:null}).status,403);
 assert.equal(reviewAuthorization({...context,user:null,error:{status:401}}).status,401);
 assert.equal(reviewAuthorization({...context,environment:'production',user:reviewer,error:null}).status,403);
});
