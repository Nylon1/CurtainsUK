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
      l_stPassTag:sku,l_stPassProdCode:sku,
    });
    const $=load(xmlText,{xmlMode:true});
    const packet=$("RETURNPACKET");
    const elements:any[]=[];
    packet.find("*").each((_,node:any)=>{
      const name=(node.tagName||"").toUpperCase();
      const attrs=Object.fromEntries(Object.entries(node.attribs||{}).map(([k,v])=>[k,String(v)]));
      const text=$(node).children().length===0?$(node).text().trim():"";
      if(Object.keys(attrs).length || text) elements.push({name,attrs,text});
    });
    results.push({sku,status:packet.children("STATUS").text().trim(),elements});
  }
  console.log(JSON.stringify({event:"PT_PRODUCT_DETAIL_ATTRIBUTE_PROBE",results}));
}
void main();
