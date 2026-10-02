import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";
async function main(){
  const session=new PtWebtexSession();
  await session.login(process.env.PT_WEBTEX_USERNAME??"",process.env.PT_WEBTEX_PASSWORD??"");
  const response:Response=await (session as any).request("/webtex/Content/StockEnquiry/Default.aspx");
  const html=load(await response.text());
  const raw=html("#webtexPageLoadData").attr("value")??"";
  if(!raw)throw new Error("PT_MENU_PAGE_DATA_MISSING");
  const xml=load(decodeURIComponent(raw),{xmlMode:true});
  const items:any[]=[];
  xml("PULLDOWNMENU *").each((_,el)=>{
    const tag=(el as any).tagName??"";
    const attrs=(el as any).attribs??{};
    if(/price|download/i.test(tag+" "+JSON.stringify(attrs)))items.push({tag,attrs});
  });
  console.log(JSON.stringify({outcome:"SUCCEEDED",items}));
}
main().catch(e=>{console.error(JSON.stringify({outcome:"FAILED",code:e instanceof Error?e.message:"PT_MENU_ROUTE_FAILED"}));process.exitCode=1;});
