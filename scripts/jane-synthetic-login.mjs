// Windows operator helper. Passwords arrive through non-echoed terminal stdin,
// not argv or files. Only DPAPI-encrypted sessions are persisted outside Git.
import {createClient} from '@supabase/supabase-js';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {homedir} from 'node:os';
const ref='hqysjumypgeapgmqkcrx';
let stage='configuration',accountNumber=0;
try{
 if(process.platform!=='win32'||!process.stdin.isTTY||!process.env.ADVISORY_AUTH_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw Error();
 process.stdin.setRawMode(true);process.stdin.resume();
 console.log('Enter the two confirmed synthetic Auth credentials as JSON. Input will not be echoed.');
 const input=await new Promise((resolve,reject)=>{let value='';const listen=b=>{if(b.includes(3)){reject(Error());return;}value+=b.toString();if(value.length>4096){reject(Error());return;}if(/[\r\n]/.test(value)){process.stdin.off('data',listen);resolve(value.trim());}};process.stdin.on('data',listen);});
 process.stdin.setRawMode(false);process.stdin.pause();
 stage='input';const credentials=JSON.parse(input);if(!Array.isArray(credentials)||credentials.length!==2)throw Error();
 const accounts=[];
 for(const credential of credentials){
  accountNumber++;stage='auth';
  if(typeof credential.email!=='string'||typeof credential.password!=='string')throw Error();
  const client=createClient('https://'+ref+'.supabase.co',process.env.ADVISORY_AUTH_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await client.auth.signInWithPassword(credential);credential.password='';
  if(error||!data.session||!data.user||data.user.is_anonymous){const failure=Error();failure.authCode=['invalid_credentials','email_not_confirmed','user_banned','over_request_rate_limit','over_email_send_rate_limit'].includes(error?.code)?error.code:'AUTH_REQUEST_UNAVAILABLE';throw failure;}
  accounts.push({owner:data.user.id,accessToken:data.session.access_token,refreshToken:data.session.refresh_token,expiresAt:data.session.expires_at});
 }
 stage='encrypted-storage';const encrypted=await new Promise((resolve,reject)=>{
  const ps=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$null = [Reflection.Assembly]::LoadWithPartialName('System.Security'); $privateInput = [Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); $protectedBytes = [Security.Cryptography.ProtectedData]::Protect($privateInput,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($protectedBytes))"],{stdio:['pipe','pipe','ignore'],windowsHide:true});let result='';ps.stdout.on('data',b=>{result+=b;});ps.on('error',reject);ps.on('close',code=>code===0&&result.length>100?resolve(result):reject(Error()));ps.stdin.end(JSON.stringify({projectRef:ref,accounts}));
 });
 const directory=join(homedir(),'.curtainsuk-jane-private-preview');await mkdir(directory,{recursive:true});
 const filename=join(directory,'synthetic-sessions-'+Date.now()+'.dpapi');await writeFile(filename,encrypted,{flag:'wx',mode:0o600});
 console.log(JSON.stringify({result:'SYNTHETIC_LOGIN_VERIFIED',projectRef:ref,owners:accounts.map(a=>a.owner),encryptedSessionPath:filename,expiresAt:accounts.map(a=>a.expiresAt)}));
}catch(error){if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();console.error(JSON.stringify({result:'SYNTHETIC_LOGIN_INCOMPLETE',stage,accountNumber,code:error.authCode??'CONFIGURATION_OR_STORAGE_ERROR'}));process.exitCode=1;}
