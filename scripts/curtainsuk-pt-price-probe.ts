import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main(){
  const user=process.env.PT_WEBTEX_USERNAME,password=process.env.PT_WEBTEX_PASSWORD;
  if(!user||!password) throw new Error("PT_PRICE_PROBE_CREDENTIALS_REQUIRED");
  const session=new PtWebtexSession(); await session.login(user,password);
  const internal=session as unknown as {request(path:string,init?:RequestInit,redirectCount?:number):Promise<Response>};
  const path="/webtex/Content/DownloadPrice/Default.aspx";
  const response=await internal.request(path);
  if(!response.ok) throw new Error(`PT_PRICELIST_PAGE_HTTP_${response.status}`);
  const html=await response.text();
  const $=load(html);
  const links=$("a").map((_,a)=>({text:$(a).text().trim(),href:$(a).attr("href")||""}))
    .get().filter(x=>/price|xls|xlsx|csv|pdf|download|brochure/i.test(x.text+" "+x.href)).slice(0,200);
  const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]);
  const inline=html.split(/\r?\n/).filter(line=>/price|xls|xlsx|csv|pdf|download|callback/i.test(line)).slice(0,300);
  console.log(JSON.stringify({event:"PT_PRICELIST_PAGE_PROBE",status:response.status,links,scripts,inline}));
}
void main();
