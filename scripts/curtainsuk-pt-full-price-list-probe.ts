import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main(){
  const session=new PtWebtexSession();
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const stockPath="/webtex/Content/StockEnquiry/Default.aspx";
  const response:Response=await (session as any).request(stockPath);
  const html=await response.text();
  const $=load(html);
  const links=$("a[href]").map((_,el)=>({text:$(el).text().replace(/\s+/g," ").trim(),href:$(el).attr("href")??""})).get()
    .filter(x=>/price|download|product/i.test(x.text+" "+x.href));
  const scripts=$("script[src]").map((_,el)=>$(el).attr("src")??"").get();
  const findings:any[]=[];
  for(const src of scripts){
    const url=new URL(src,`https://www.prestigiousonline.co.uk${stockPath}`);
    if(url.origin!=="https://www.prestigiousonline.co.uk")continue;
    const r:Response=await (session as any).request(url.pathname+url.search);
    const body=await r.text();
    const needles=["DOWNLOADPRICE","PriceList","price list","Download Price","LIST_PRICELISTS"];
    for(const needle of needles){
      let from=0,count=0;
      while(count<5){
        const i=body.toLowerCase().indexOf(needle.toLowerCase(),from);if(i<0)break;
        findings.push({src:url.pathname,needle,snippet:body.slice(Math.max(0,i-1000),i+3000)});from=i+needle.length;count++;
      }
    }
  }
  const bodyText=$("body").text().replace(/\s+/g," ").trim();
  console.log(JSON.stringify({outcome:"SUCCEEDED",links,bodyPriceSnippets:[...bodyText.matchAll(/.{0,100}(?:price|download).{0,180}/ig)].slice(0,20).map(m=>m[0]),findings}));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_PRICE_LIST_DISCOVERY_FAILED"}));process.exitCode=1;});
