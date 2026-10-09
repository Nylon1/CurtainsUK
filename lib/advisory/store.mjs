import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fail, UUID } from './contracts.mjs';
export class MemoryStore {
  constructor(){this.records=new Map();this.locks=new Set();}
  async get(id){return structuredClone(this.records.get(id)??null);}
  async commit(record,expectedRevision){
    const old=this.records.get(record.id);
    if((old?.revision??null)!==expectedRevision)fail('REVISION_CONFLICT',409);
    this.records.set(record.id,structuredClone(record));
  }
  async remove(id){this.records.delete(id);}
  async locked(id,fn){if(this.locks.has(id))fail('CONSULTATION_BUSY',409);this.locks.add(id);try{return await fn();}finally{this.locks.delete(id);}}
}
export class EncryptedPreviewStore extends MemoryStore {
  constructor(directory,key){super();if(!Buffer.isBuffer(key)||key.length!==32)fail('STORAGE_KEY_REQUIRED',500);this.directory=path.resolve(directory);this.key=key;}
  filename(id){if(!new RegExp(UUID).test(id))fail('INVALID_INPUT');return path.join(this.directory,id+'.enc');}
  async initialise(){
    await mkdir(this.directory,{recursive:true});
    const names=(await readdir(this.directory)).filter(n=>n.endsWith('.enc'));
    if(names.length>100)fail('PREVIEW_STORAGE_LIMIT',503);
    for(const n of names){const id=n.slice(0,-4);this.filename(id);const bytes=await readFile(path.join(this.directory,n));if(bytes.length>400000)fail('INVALID_STORED_RECORD',503);
      const decrypt=createDecipheriv('aes-256-gcm',this.key,bytes.subarray(0,12));decrypt.setAuthTag(bytes.subarray(12,28));decrypt.setAAD(Buffer.from(id));
      const record=JSON.parse(Buffer.concat([decrypt.update(bytes.subarray(28)),decrypt.final()]).toString('utf8'));
      if(record.id!==id||!record.saved)fail('INVALID_STORED_RECORD',503);
      if(record.expiresAt<=Date.now())await unlink(this.filename(id));else this.records.set(id,record);
    }
    return this;
  }
  async commit(record,expectedRevision){
    if((this.records.get(record.id)?.revision??null)!==expectedRevision)fail('REVISION_CONFLICT',409);
    if(record.saved){
      const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);cipher.setAAD(Buffer.from(record.id));
      const plaintext=JSON.stringify(record);if(Buffer.byteLength(plaintext)>399972)fail('CONTEXT_LIMIT',413);
      const encoded=Buffer.concat([cipher.update(plaintext),cipher.final()]);
      const temp=this.filename(record.id)+'.tmp';await writeFile(temp,Buffer.concat([iv,cipher.getAuthTag(),encoded]),{mode:0o600});await rename(temp,this.filename(record.id));
    }
    await super.commit(record,expectedRevision);
  }
  async remove(id){try{await unlink(this.filename(id));}catch(e){if(e.code!=='ENOENT')throw e;}await super.remove(id);}
}
// Cloud persistence adapter for a separately approved authenticated Supabase
// client. The caller must derive ownerId from a verified access token, never UI.
export class SupabaseSessionStore {
  constructor(client,ownerId){this.client=client.schema('advisory');this.ownerId=ownerId;}
  async get(id){const {data,error}=await this.client.from('consultations').select('state').eq('id',id).eq('owner_id',this.ownerId).maybeSingle();if(error)fail('STORAGE_UNAVAILABLE',503);return data?.state??null;}
  async commit(record,expectedRevision){
    if(record.owner!==this.ownerId||!record.saved)fail('CONSENT_REQUIRED',403);
    const payload={id:record.id,owner_id:this.ownerId,revision:record.revision,state:record,expires_at:new Date(record.expiresAt).toISOString(),consent_version:'advisory-preview-v1'};
    const query=expectedRevision===null?this.client.from('consultations').insert(payload):this.client.from('consultations').update(payload).eq('id',record.id).eq('owner_id',this.ownerId).eq('revision',expectedRevision);
    const {data,error}=await query.select('id');if(error)fail('STORAGE_UNAVAILABLE',503);if(data?.length!==1)fail('REVISION_CONFLICT',409);
  }
  async remove(id){const {error}=await this.client.from('consultations').delete().eq('id',id).eq('owner_id',this.ownerId);if(error)fail('STORAGE_UNAVAILABLE',503);}
}
