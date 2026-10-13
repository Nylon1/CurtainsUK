// Operator-only preparation. Never prints credentials or SQL.
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {writeFile} from 'node:fs/promises';
import {writePrivateFile} from './jane-private-file.mjs';
import {createTrialPassword} from '../lib/advisory/trial-access.mjs';
import {JANE_RUNTIME_LOGIN,JANE_RETENTION_LOGIN,permanentAccessSql,disableProductionAccessSql,removeProductionAccessSql} from '../lib/advisory/production-access.mjs';

const projectRef='hqysjumypgeapgmqkcrx';
const output=process.argv[2];
if(!output)throw Error('RECEIPT_PATH_REQUIRED');
try{
 const runtime=createTrialPassword(),retention=createTrialPassword();
 const sql=permanentAccessSql({runtimeVerifier:runtime.verifier,retentionVerifier:retention.verifier});
 const privatePath=join(homedir(),'.curtainsuk-jane-private-preview','production-access-'+Date.now()+'.dpapi');
 await writePrivateFile(privatePath,{projectRef,preparedAt:new Date().toISOString(),runtime:{login:JANE_RUNTIME_LOGIN,password:runtime.password},retention:{login:JANE_RETENTION_LOGIN,password:retention.password},provisioningSql:sql,disableSql:disableProductionAccessSql(),removeSql:removeProductionAccessSql()});
 const receipt={projectRef,preparedAt:new Date().toISOString(),privatePath,roles:[JANE_RUNTIME_LOGIN,JANE_RETENTION_LOGIN],provisioningSha256:createHash('sha256').update(sql).digest('hex'),status:'PREPARED_NOT_APPLIED'};
 await writeFile(output,JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});
 console.log(JSON.stringify(receipt));
}catch{console.error('PRODUCTION_ACCESS_PREPARATION_FAILED');process.exitCode=1;}
