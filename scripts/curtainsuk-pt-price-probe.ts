import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main(){
  const user=process.env.PT_WEBTEX_USERNAME,password=process.env.PT_WEBTEX_PASSWORD;
  if(!user||!password) throw new Error("PT_PRICE_PROBE_CREDENTIALS_REQUIRED");
  const session=new PtWebtexSession(); await session.login(user,password);
  const internal=session as unknown as {request(path:string,init?:RequestInit,redirectCount?:number):Promise<Response>};
  const path="/webtex/Content/ViewProductDetails/Default.aspx?PRODUCT_CODE=4269%2F147";
  const html=await (await internal.request(path)).text();
  const src=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const matches:string[]=[];
  for(const raw of src){
    try{
      const url=new URL(raw,"https://www.prestigiousonline.co.uk"+path);
      if(url.origin!=="https://www.prestigiousonline.co.uk") continue;
      const body=await (await internal.request(url.pathname+url.search)).text();
      for(const line of body.split(/\r?\n/)){
        if(/callbackGetProductDetails|productdesc|cutprice|freestock|greywidth|reportCriteria|ProductDetails/i.test(line)) matches.push(`${url.pathname}: ${line.trim()}`);
      }
    }catch{}
  }
  console.log(JSON.stringify({event:"PT_PRODUCT_DETAIL_CALLBACK_SOURCE",scriptSrc:src,matches:matches.slice(0,500)}));
}
void main();
