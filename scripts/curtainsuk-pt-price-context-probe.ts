import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

function around(body:string,needle:string,window=5000){
  const i=body.toLowerCase().indexOf(needle.toLowerCase());
  return i<0?null:body.slice(Math.max(0,i-window),i+window);
}
async function main(){
  const session=new PtWebtexSession();
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const jsResp:Response=await (session as any).request("/webtex/Content/StockEnquiry/PageResources/Default.js");
  const js=await jsResp.text();
  console.log(JSON.stringify({
    outcome:"SUCCEEDED",
    actionGrid:around(js,"function actionGrid",7000),
    viewProduct:around(js,"ViewProductDetails",7000),
    priceList:around(js,"callbackSetPriceList",5000),
    modal:around(js,"ifrModal",5000)
  }));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_PRICE_CONTEXT_PROBE_FAILED"}));process.exitCode=1;});
