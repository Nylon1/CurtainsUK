import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {fail} from './contracts.mjs';
export const token=()=>randomBytes(32).toString('base64url');
export const digest=value=>createHash('sha256').update(value).digest('hex');
export function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
export class BoundedLimiter {
  constructor({now=()=>Date.now(),limit=12,windowMs=60000,capacity=1000}={}){this.now=now;this.limit=limit;this.windowMs=windowMs;this.capacity=capacity;this.entries=new Map();}
  take(key){const now=this.now();for(const [k,v] of this.entries){if(v.expires<=now)this.entries.delete(k);}let entry=this.entries.get(key);if(!entry){if(this.entries.size>=this.capacity)fail('SERVICE_BUSY',503);entry={expires:now+this.windowMs,count:0};this.entries.set(key,entry);}if(++entry.count>this.limit)fail('RATE_LIMITED',429);}
}
export function previewEnabled(env){return env.VERCEL_ENV==='preview'&&env.CURTAINSUK_ADVISORY_PREVIEW==='true'&&typeof env.ADVISORY_PREVIEW_KEY==='string'&&env.ADVISORY_PREVIEW_KEY.length>=32;}
export const errorMessages={INVALID_INPUT:'Please check the information and try again.',CONSENT_REQUIRED:'Please confirm what you want to share or save.',SESSION_NOT_FOUND:'This consultation could not be recovered. Check your recovery code or start a new one.',REVISION_CONFLICT:'This consultation changed in another request. Resume it before retrying.',CONSULTATION_BUSY:'A reply is still being prepared. Please try again shortly.',RATE_LIMITED:'Please pause briefly before trying again. Your draft is still here.',KNOWLEDGE_UNAVAILABLE:'The fabric information is temporarily unavailable. Your draft is still here; please try again.',MODEL_UNAVAILABLE:'Jane could not prepare a reply. Your draft is still here; please try again.',STORAGE_UNAVAILABLE:'The consultation could not be saved. Please keep this window open and try again.',CONTEXT_LIMIT:'This development consultation has reached its review limit. You can still save or summarise it.'};
