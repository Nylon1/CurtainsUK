import {createHash,createHmac,pbkdf2Sync,randomBytes} from 'node:crypto';
import {fail} from './contracts.mjs';

// SCRAM verifier may be sent to the database; plaintext password stays in the
// operator's private configuration and Vercel's branch-scoped sensitive env.
export function createTrialPassword(){
 const password=randomBytes(36).toString('base64url'),salt=randomBytes(16),iterations=4096;
 const salted=pbkdf2Sync(password,salt,iterations,32,'sha256');
 const stored=createHash('sha256').update(createHmac('sha256',salted).update('Client Key').digest()).digest('base64');
 const server=createHmac('sha256',salted).update('Server Key').digest('base64');
 return {password,verifier:'SCRAM-SHA-256$'+iterations+':'+salt.toString('base64')+'$'+stored+':'+server};
}
export function trialAccessSql({role,verifier,expiresAt,now=Date.now()}){
 if(!/^advisory_trial_[a-z0-9]{8,24}$/.test(role??'')||!/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=:[A-Za-z0-9+/]{43}=$/.test(verifier??'')||!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=now||Date.parse(expiresAt)>now+14400000)fail('INVALID_TRIAL_PROVISIONING');
 const expiry=new Date(expiresAt).toISOString();
 return `begin;
set local lock_timeout='500ms';
set local statement_timeout='5s';
create role ${role} login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 4 password '${verifier}' valid until '${expiry}';
grant advisory_runtime to ${role} with inherit false, set true, admin false;
alter role ${role} set statement_timeout='3s';
alter role ${role} set lock_timeout='500ms';
alter role ${role} set idle_in_transaction_session_timeout='5s';
commit;
`;
}
export function trialAccessRollback(role){
 if(!/^advisory_trial_[a-z0-9]{8,24}$/.test(role??''))fail('INVALID_TRIAL_PROVISIONING');
 // Close application pools first. DROP fails on dependencies, never CASCADE.
 return `begin;\nset local lock_timeout='500ms';\nalter role ${role} nologin;\nrevoke advisory_runtime from ${role};\ndrop role ${role};\ncommit;\n`;
}
