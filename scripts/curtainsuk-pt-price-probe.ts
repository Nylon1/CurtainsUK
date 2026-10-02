import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

const SKUS=["4269/147","4259/247","4262/770","4292/030","7150/168","7895/038"];

async function main(){
  const user=process.env.PT_WEBTEX_USERNAME,password=process.env.PT_WEBTEX_PASSWORD;
  if(!user||!password) throw new Error("PT_PRICE_PROBE_CREDENTIALS_REQUIRED");
  const session=new PtWebtexSession(); await session.login(user,password);
  const internal=session as unknown as {request(path:string,init?:RequestInit,redirectCount?:number):Promise<Response>};
  const results=[];
  for(const sku of SKUS){
    const path=`/webtex/Content/ViewProductDetails/Default.aspx?PRODUCT_CODE=${encodeURIComponent(sku)}`;
    const html=await (await internal.request(path)).text();
    const $=load(html);
    const ids=["#productdesc","#greywidth","#price","#freestock","#reportCriteria"];
    const fields=Object.fromEntries(ids.map(id=>[id,$(id).text().trim()||$(id).attr("value")||""]));
    const hidden=$("#webtexPageLoadData").attr("value")||"";
    const decoded=hidden?decodeURIComponent(hidden):"";
    const callbacks=html.split(/\r?\n/).filter(line=>/callback|price|productdesc|freestock|reportCriteria/i.test(line)).slice(0,100);
    results.push({sku,title:$("title").text().trim(),fields,hiddenMatches:decoded.match(/.{0,80}(?:PRICE|Product Code|STANDARD|CUT).{0,120}/gi)?.slice(0,20)||[],callbacks});
  }
  console.log(JSON.stringify({event:"PT_PRODUCT_DETAIL_PAGE_PROBE",results}));
}
void main();
