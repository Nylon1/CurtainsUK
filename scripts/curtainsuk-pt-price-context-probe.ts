import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

async function main(){
  const session=new PtWebtexSession();
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const path="/webtex/Content/DownloadPrice/Default.aspx";
  const resp:Response=await (session as any).request(path);
  const html=await resp.text();
  const $=load(html);
  const links=$("a[href]").map((_,el)=>({
    text:$(el).text().replace(/\s+/g," ").trim().slice(0,200),
    href:$(el).attr("href")??""
  })).get().filter(x=>/price|pdf|xls|xlsx|csv|download/i.test(x.text+" "+x.href));
  const scripts=$("script[src]").map((_,el)=>$(el).attr("src")).get().filter(Boolean);
  const pageDataRaw=$("#webtexPageLoadData").attr("value")??"";
  const pageData=pageDataRaw?decodeURIComponent(pageDataRaw):"";
  const page=$.root().text().replace(/\s+/g," ").trim();
  console.log(JSON.stringify({
    outcome:"SUCCEEDED",
    status:resp.status,
    links:links.slice(0,100),
    scripts,
    pageDataExcerpt:pageData.slice(0,12000),
    pageTextMatches:[...page.matchAll(/.{0,100}(?:price|pdf|download|brochure).{0,200}/ig)].slice(0,30).map(m=>m[0])
  }));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_PRICE_DOWNLOAD_PROBE_FAILED"}));process.exitCode=1;});
