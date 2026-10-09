import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {fail} from './contracts.mjs';
const header=state=>({id:state.id,owner:state.owner,revision:state.revision,saved:state.saved,expiresAt:state.expiresAt,startRequest:state.startRequest});
// Application encryption, in addition to hosted disk encryption. Keys must be
// provisioned outside this database and browser; old key IDs support rotation.
export function createSessionCipher({activeKeyId,keys}){
  if(!/^[a-zA-Z0-9-]{1,40}$/.test(activeKeyId??'')||!keys||Object.keys(keys).length>4||Object.values(keys).some(k=>!Buffer.isBuffer(k)||k.length!==32)||!keys[activeKeyId])fail('STORAGE_KEY_REQUIRED',503);
  return {
    seal(state){
      const h=header(state),plain=Buffer.from(JSON.stringify(state));if(plain.length>280000)fail('CONTEXT_LIMIT',413);
      const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keys[activeKeyId],iv);
      cipher.setAAD(Buffer.from(JSON.stringify({...h,keyId:activeKeyId,version:1})));
      const data=Buffer.concat([cipher.update(plain),cipher.final()]);
      return {...h,encrypted:{version:1,keyId:activeKeyId,iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),data:data.toString('base64url')}};
    },
    open(record){
      if(record===null)return null;
      try{
        const h=header(record),e=record.encrypted;
        if(!e||e.version!==1||!keys[e.keyId]||typeof e.data!=='string'||e.data.length>374000||!/^[A-Za-z0-9_-]+$/.test(e.data))throw Error();
        const iv=Buffer.from(e.iv,'base64url'),tag=Buffer.from(e.tag,'base64url');if(iv.length!==12||tag.length!==16)throw Error();
        const decipher=createDecipheriv('aes-256-gcm',keys[e.keyId],iv);decipher.setAuthTag(tag);
        decipher.setAAD(Buffer.from(JSON.stringify({...h,keyId:e.keyId,version:1})));
        const state=JSON.parse(Buffer.concat([decipher.update(Buffer.from(e.data,'base64url')),decipher.final()]).toString('utf8'));
        if(JSON.stringify(header(state))!==JSON.stringify(h))throw Error();return state;
      }catch{fail('INVALID_STORED_RECORD',503);}
    }
  };
}
