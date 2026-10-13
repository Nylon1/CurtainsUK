import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
async function dpapi(value,decrypt){
 if(process.platform!=='win32')throw Error('WINDOWS_DPAPI_REQUIRED');
 const operation=decrypt?"$bytes=[Convert]::FromBase64String($inputValue); [Console]::Out.Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))":"$bytes=[Text.Encoding]::UTF8.GetBytes($inputValue); [Console]::Out.Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))";
 return new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$null=[Reflection.Assembly]::LoadWithPartialName('System.Security'); $inputValue=[Console]::In.ReadToEnd(); "+operation],{stdio:['pipe','pipe','ignore'],windowsHide:true});let output='';child.stdout.on('data',b=>{output+=b;});child.on('error',()=>reject(Error('PRIVATE_STORAGE_UNAVAILABLE')));child.on('close',code=>code===0&&output?resolve(output):reject(Error('PRIVATE_STORAGE_UNAVAILABLE')));child.stdin.end(value);});
}
export async function readPrivateFile(path){return JSON.parse(await dpapi(await readFile(path,'utf8'),true));}
export async function writePrivateFile(path,value){await writeFile(path,await dpapi(JSON.stringify(value),false),{flag:'wx',mode:0o600});}
