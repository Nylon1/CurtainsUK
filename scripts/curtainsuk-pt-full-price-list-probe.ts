import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main(){
  const captures:string[]=[];
  const wrapped=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const response=await fetch(input,init);
    const url=String(input);
    if(url.endsWith("/callbackSearchCollection")||url.endsWith("/callbackSearchDesignCode"))captures.push(await response.clone().text());
    return response;
  }) as typeof fetch;
  const session=new PtWebtexSession(wrapped);
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const searched=await session.search("COLLECTION","Rustic Persian");
  if(captures.length!==1)throw new Error("PT_PRICE_COLUMNS_CAPTURE_FAILED");
  const env=JSON.parse(captures[0]) as {d?:string};
  if(typeof env.d!=="string")throw new Error("PT_PRICE_COLUMNS_ENVELOPE_INVALID");
  const xml=load(env.d,{xmlMode:true});
  const rows:any[]=[];
  xml("results > Detail > record").each((_,record)=>{
    if(xml(record).attr("groupRow")?.toUpperCase()==="TRUE")return;
    const fields:Record<string,string>={};
    xml(record).children("fd").each((__,field)=>{
      const id=(xml(field).attr("id")??"").trim();
      const raw=xml(field).attr("value")??"";
      let value=raw;try{value=decodeURIComponent(raw);}catch{}
      if(id)fields[id]=value.replace(/\s+/g," ").trim();
    });
    rows.push({C2:fields.C2,C3:fields.C3,C4:fields.C4,C6:fields.C6,C7:fields.C7});
  });
  console.log(JSON.stringify({outcome:"SUCCEEDED",total:searched.total,returned:rows.length,rows}));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_PRICE_COLUMNS_PROBE_FAILED"}));process.exitCode=1;});
