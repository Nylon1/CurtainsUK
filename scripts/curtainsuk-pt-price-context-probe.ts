import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

function snippets(body:string, needles:string[]){
  return needles.flatMap(needle=>{
    const out:any[]=[]; let from=0;
    while(true){
      const i=body.toLowerCase().indexOf(needle.toLowerCase(),from);
      if(i<0)break;
      out.push({needle,snippet:body.slice(Math.max(0,i-1000),i+3000)});
      from=i+needle.length;
      if(out.length>=6)break;
    }
    return out;
  });
}
async function main(){
  const session=new PtWebtexSession();
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const stockPath="/webtex/Content/StockEnquiry/Default.aspx";
  const stockResp:Response=await (session as any).request(stockPath);
  const stockHtml=await stockResp.text();
  const jsResp:Response=await (session as any).request("/webtex/Content/StockEnquiry/PageResources/Default.js");
  const js=await jsResp.text();
  const needles=["ViewProductDetails","ifrModal","price","SetPriceList","GetPriceLists","product code","actionGrid","openModal"];
  const safeVars=[...stockHtml.matchAll(/(?:price|pricelist|price_list|selectedprice)[^<\n]{0,300}/gi)].map(m=>m[0]).slice(0,30);
  console.log(JSON.stringify({outcome:"SUCCEEDED",htmlVars:safeVars,jsSnippets:snippets(js,needles)}));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_PRICE_CONTEXT_PROBE_FAILED"}));process.exitCode=1;});
