// Operator bridge classification only. Never retry a write or infer success.
// A confirmed cancelled read returns to full admission after exact reconciliation.
function connectorFailureCode({query,result}) {
 if(!result?.isError||typeof query!=='string'||!/^begin read only;set local statement_timeout='3s';(?:select|with)\b[^;]*;commit;$/i.test(query))return 'CONNECTOR_ERROR';
 const content=result.content;
 if(!Array.isArray(content)||content.length!==1||content[0]?.type!=='text')return 'CONNECTOR_ERROR';
 try {
  const error=JSON.parse(content[0].text)?.error;
  if(error?.name==='HttpException'&&typeof error.message==='string'&&/^Failed to run sql query: ERROR:\s+57014: canceling statement due to statement timeout\s*$/.test(error.message))return 'TRANSIENT_SQL_READ_TIMEOUT';
 }catch{}
 return 'CONNECTOR_ERROR';
}



function decode64(s){const abc="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";let bits=0,v=0,out="";for(const c of s.replace(/=+$/,"")){v=(v<<6)|abc.indexOf(c);bits+=6;if(bits>=8){bits-=8;out+="%"+((v>>bits)&255).toString(16).padStart(2,"0");}}return decodeURIComponent(out);}
let state=load("janeIdentityBridge"),lastNotify=Date.now();
while(state.session_id){
 state.buffer+=(state.output??"").replace(/\x1b\[[0-9;?]*[A-Za-z]/g,"").replace(/\x1b\][^\x07]*\x07/g,"");state.output="";
 const match=state.buffer.match(/@JANE@([\s\S]*?)@END@/);
 if(match){
  state.buffer=state.buffer.slice(match.index+match[0].length);
  const packet=JSON.parse(decode64(match[1].replace(/\s+/g,"")));
  if(packet.type==="sql"){
   if(!/^C:\/Users\/hamza\/\.codex\/tmp\/jane-eligible-identity-repair-20261012-0839\/request-\d+-\d+\.json$/.test(packet.path))throw Error("UNEXPECTED_OPERATOR_PATH");
   const began=Date.now();
   const file=await tools.exec_command({cmd:"Get-Content -LiteralPath '"+packet.path+"' -Raw",max_output_tokens:60000});
   if(file.exit_code!==0)throw Error("OPERATOR_REQUEST_READ_FAILED");
   const request=JSON.parse(file.output.trim());
   const query=request.query;
   const write=query.startsWith("begin;\nset local statement_timeout='3s';");
   if(write&&(state.mode!=="population"||!query.includes("set local role advisory_indexer;")||!query.includes("revoke advisory_indexer from postgres granted by postgres;")||!query.includes("commit;\n\nbegin read only;")))throw Error("UNEXPECTED_WRITE");
   if(!write&&!query.startsWith("begin read only;"))throw Error("UNEXPECTED_OPERATOR_SQL");
   let reply;
   try{
    state.queries++;if(write)state.writes++;
    const started=Date.now();
    const result=await tools.mcp__codex_apps__supabase_execute_sql({link_id:"link_6ab960d9f9ac8191b16ced4d6d2fb91d",project_id:"hqysjumypgeapgmqkcrx",query});
    const connectorMs=Date.now()-started;
    if(result.isError){store("janeRetailConnectorFailure",{observedAt:new Date().toISOString(),write,path:packet.path,result});throw Error(connectorFailureCode({query,result}));}
    const raw=JSON.parse(result.content.filter(x=>x.type==="text").map(x=>x.text).join("\n")).result;
    const rows=JSON.parse(raw.match(/\n(\[[\s\S]*?\])\n<\/untrusted-data-/)[1]);
    if(rows.length!==1||!rows[0].value)throw Error("CONNECTOR_RESULT_SHAPE");
    const path=packet.path.replace("/request-","/response-");
    await tools.apply_patch("*** Begin Patch\n*** Add File: "+path+"\n+"+JSON.stringify(rows[0].value)+"\n*** End Patch");
    reply={id:packet.id,resultPath:path};
    if(write)notify({type:"write-transport",connectorMs,bridgeMs:Date.now()-began,processed:rows[0].value.job?.processed});
   }catch(e){reply={id:packet.id,error:e.message};notify({type:"operator-call-failed",write,code:e.message});}
   const result=await tools.write_stdin({session_id:state.session_id,chars:JSON.stringify(reply)+"\r",yield_time_ms:1,max_output_tokens:3000});
   state={...state,...result};store("janeIdentityBridge",state);
  }else{
   text(packet);
   if(packet.type==="progress"){
    notify({type:"verified-milestone",processed:packet.processed,expectedCount:packet.expectedCount});
    const comment="Verified Jane indexing milestone: **"+packet.processed+" / "+packet.expectedCount+"** eligible identities in existing job "+packet.jobId+". Exact post-COMMIT readback and fsynced journal receipt passed. Resource checks, six-record transactions, five-second pacing and all approved stop gates remain active. This is actual hosted progress, not a scheduled promise. No production deployment, migration, paid AI call or public activation.";
    text(await tools.mcp__codex_apps__github_add_comment_to_issue({repo_full_name:"Nylon1/CurtainsUK",pr_number:169,comment}));
   }
   if(packet.type==="done"||packet.type==="stopped"){state.terminal=packet;store("janeIdentityBridge",state);break;}
  }
 }else{
  if(Date.now()-lastNotify>45000){notify({type:"operator-alive",mode:state.mode,queries:state.queries,writes:state.writes});lastNotify=Date.now();}
  await new Promise(r=>setTimeout(r,300));
  const result=await tools.write_stdin({session_id:state.session_id,chars:"\r",yield_time_ms:1,max_output_tokens:3000});
  state={...state,...result};store("janeIdentityBridge",state);
  if(result.exit_code!==undefined&&!result.output){text({type:"operator-exit",exitCode:result.exit_code});break;}
 }
}
