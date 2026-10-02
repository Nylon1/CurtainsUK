import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main(){
  const session=new PtWebtexSession();
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const path="/webtex/js/menu.js";
  const response:Response=await (session as any).request(path);
  const js=await response.text();
  const needles=["DOWNLOADPRICE","DownloadPrice","downloadprice","PriceList","price_list","priceList"];
  const hits:any[]=[];
  for(const needle of needles){
    let from=0;
    while(true){
      const i=js.indexOf(needle,from);if(i<0)break;
      hits.push({needle,index:i,snippet:js.slice(Math.max(0,i-1800),i+5000)});
      from=i+needle.length;
      if(hits.length>50)break;
    }
  }
  console.log(JSON.stringify({outcome:"SUCCEEDED",hits}));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_PRICE_ROUTE_DISCOVERY_FAILED"}));process.exitCode=1;});
