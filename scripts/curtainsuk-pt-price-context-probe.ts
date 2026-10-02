import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

function allAround(body:string,needle:string,window=5000){
  const out:string[]=[]; let from=0;
  while(true){
    const i=body.toLowerCase().indexOf(needle.toLowerCase(),from);
    if(i<0)break;
    out.push(body.slice(Math.max(0,i-window),i+window));
    from=i+needle.length;
    if(out.length>=8)break;
  }
  return out;
}
async function main(){
  const session=new PtWebtexSession();
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const sources=[
    "/webtex/js/general.js?20231108",
    "/webtex/Content/StockEnquiry/PageResources/Default.js?20210304"
  ];
  const results:any[]=[];
  for(const path of sources){
    const resp:Response=await (session as any).request(path);
    const body=await resp.text();
    results.push({path,length:body.length,
      actionGrid:allAround(body,"actionGrid",6000),
      viewProduct:allAround(body,"ViewProductDetails",6000),
      priceList:allAround(body,"priceList",4000),
      modal:allAround(body,"ifrModal",4000)});
  }
  console.log(JSON.stringify({outcome:"SUCCEEDED",results}));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_PRICE_CONTEXT_PROBE_FAILED"}));process.exitCode=1;});
