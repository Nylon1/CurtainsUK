import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

const STOCK="/webtex/Content/StockEnquiry/Default.aspx";

async function main(){
  const user=process.env.PT_WEBTEX_USERNAME,password=process.env.PT_WEBTEX_PASSWORD;
  if(!user||!password) throw new Error("PT_PRICE_PROBE_CREDENTIALS_REQUIRED");
  const session=new PtWebtexSession(); await session.login(user,password);
  const internal=session as unknown as { request(path:string,init?:RequestInit,redirectCount?:number):Promise<Response> };
  const html=await (await internal.request(STOCK)).text();
  const scriptSrc=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const interesting=html.split(/\r?\n/).filter(line=>/ifrModal|ViewProduct|ProductDetail|product.?detail|modal|prodcode|productcode/i.test(line)).slice(0,200);
  const linked:string[]=[];
  for(const src of scriptSrc){
    if(!/StockEnquiry|PageResources|\.js(?:\?|$)/i.test(src)) continue;
    try{
      const url=new URL(src,"https://www.prestigiousonline.co.uk"+STOCK);
      if(url.origin!=="https://www.prestigiousonline.co.uk") continue;
      const body=await (await internal.request(url.pathname+url.search)).text();
      for(const line of body.split(/\r?\n/)){
        if(/ifrModal|ViewProduct|ProductDetail|product.?detail|modal|prodcode|productcode/i.test(line)) linked.push(`${url.pathname}: ${line.trim()}`);
      }
    }catch{}
  }
  console.log(JSON.stringify({event:"PT_PRODUCT_DETAIL_ROUTE_PROBE",scriptSrc,htmlMatches:interesting,scriptMatches:linked.slice(0,300)}));
}
void main();
