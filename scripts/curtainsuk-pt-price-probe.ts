import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

const DETAIL="/webtex/Content/ViewProductDetails/Default.aspx";
const SKUS=["4269/147","4259/247","4262/770","4292/030","7150/168","7895/038"];

async function main(){
  const user=process.env.PT_WEBTEX_USERNAME,password=process.env.PT_WEBTEX_PASSWORD;
  if(!user||!password) throw new Error("PT_PRICE_PROBE_CREDENTIALS_REQUIRED");
  const session=new PtWebtexSession(); await session.login(user,password);
  const internal=session as unknown as {invoke(path:string,parameters:Record<string,string|number>):Promise<string>};
  const results=[];
  for(const sku of SKUS){
    const xmlText=await internal.invoke(`${DETAIL}/callbackGetProductDetails`,{
      l_stPassTag:sku,
      l_stPassProdCode:sku,
    });
    const $=load(xmlText,{xmlMode:true});
    const packet=$("RETURNPACKET");
    const nodes:Record<string,string>={};
    packet.find("*").each((_,node)=>{
      const name=(node as any).tagName?.toUpperCase?.()||"";
      if(!name||node.children?.some?.((c:any)=>c.type==="tag")) return;
      const value=$(node).text().trim();
      if(value) nodes[name]=value;
    });
    results.push({sku,status:packet.children("STATUS").text().trim(),nodes});
  }
  console.log(JSON.stringify({event:"PT_PRODUCT_DETAIL_CALLBACK_PROBE",results}));
}
void main();
