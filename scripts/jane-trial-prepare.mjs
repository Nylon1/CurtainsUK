// Creates private operator material, not database objects or deployments.
import {randomBytes,generateKeyPairSync,createHash} from 'node:crypto';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {readFile,writeFile} from 'node:fs/promises';
import {readPrivateFile,writePrivateFile} from './jane-private-file.mjs';
import {createTrialPassword,trialAccessSql,trialAccessRollback} from '../lib/advisory/trial-access.mjs';
import {createServerAuth} from '../lib/advisory/auth-session.mjs';
import {verifyCloudPrincipal} from '../lib/advisory/cloud-store.mjs';
import {databaseConfig} from '../lib/advisory/pg-transaction.mjs';
const ref='hqysjumypgeapgmqkcrx';
try{
 const sessions=await readPrivateFile(process.env.ADVISORY_SYNTHETIC_SESSIONS_PATH);
 if(sessions.projectRef!==ref||sessions.accounts.length!==2)throw Error();
 const auth=createServerAuth({projectRef:ref,publishableKey:process.env.ADVISORY_AUTH_PUBLISHABLE_KEY});
 for(const account of sessions.accounts){const principal=await verifyCloudPrincipal({token:account.accessToken,auth,issuer:'https://'+ref+'.supabase.co/auth/v1'});if(principal.owner!==account.owner)throw Error();}
 const role='advisory_trial_'+randomBytes(8).toString('hex'),secret=createTrialPassword(),keys=generateKeyPairSync('ed25519'),expiresAt=new Date(Date.now()+4*3600000-60000).toISOString();
 const ca=await readFile(process.env.ADVISORY_DB_CA_FILE,'utf8');
 const env={ADVISORY_TEST_PROJECT_REF:ref,ADVISORY_TEST_SCHEMA:'advisory',CURTAINSUK_ADVISORY_PREVIEW:'true',ADVISORY_PREVIEW_KEY:randomBytes(32).toString('base64url'),ADVISORY_AUTH_PUBLISHABLE_KEY:process.env.ADVISORY_AUTH_PUBLISHABLE_KEY,ADVISORY_DB_HOST:'aws-0-eu-central-1.pooler.supabase.com',ADVISORY_DB_PORT:'6543',ADVISORY_DB_LOGIN:role,ADVISORY_DB_PASSWORD:secret.password,ADVISORY_DB_CA_PEM:ca,ADVISORY_ACTIVE_DATA_KEY_ID:'trial1',ADVISORY_DATA_KEYS_JSON:JSON.stringify({trial1:randomBytes(32).toString('base64')}),ADVISORY_CSRF_KEY:randomBytes(32).toString('base64'),ADVISORY_TRIAL_PUBLIC_KEY:keys.publicKey.export({type:'spki',format:'pem'})};
 databaseConfig(env);
 const sql=trialAccessSql({role,verifier:secret.verifier,expiresAt});
 const filename=join(homedir(),'.curtainsuk-jane-private-preview','hosted-trial-'+Date.now()+'.dpapi');
 await writePrivateFile(filename,{projectRef:ref,env,accounts:sessions.accounts,signingKey:keys.privateKey.export({type:'pkcs8',format:'pem'}),provisioningSql:sql,rollbackSql:trialAccessRollback(role),expiresAt});
 const receipt={classification:'HOSTED_AUTH_VERIFIED_DATABASE_ACCESS_NOT_PROVISIONED',checkedAt:new Date().toISOString(),projectRef:ref,owners:sessions.accounts.map(a=>a.owner),authChecks:['password-login','getUser','cryptographic-getClaims','issuer-and-session-ownership'],role,expiresAt,provisioningSha256:createHash('sha256').update(sql).digest('hex'),privateConfigurationPath:filename};
 await writeFile(process.argv[2],JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}catch{console.error('TRIAL_PREPARATION_FAILED: no database write or deployment attempted.');process.exitCode=1;}
