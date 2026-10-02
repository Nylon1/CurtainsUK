import { load } from "cheerio";
import { PtWebtexSession } from "../lib/supplier-sync/adapters/pt-webtex-session";

const STOCK="/webtex/Content/StockEnquiry/Default.aspx";
const SKUS=["4269/147","4259/247","4262/770","4292/030","7150/168","7895/038"];

async function main(){
  const user=process.env.PT_WEBTEX_USERNAME,password=process.env.PT_WEBTEX_PASSWORD;
  if(!user||!password) throw new Error("PT_PRICE_PROBE_CREDENTIALS_REQUIRED");
  const session=new PtWebtexSession(); await session.login(user,password);
  const internal=session as unknown as {
    invoke(path:string,parameters:Record<string,string|number>):Promise<string>;
    sortOrder:string;
  };
  const results=[];
  for(const sku of SKUS){
    const xmlText=await internal.invoke(`${STOCK}/callbackSearchProdCode`,{
      l_stPassSortOrder:internal.sortOrder,
      l_stPassTag:`PRODUCT CODE: ${sku}`,
      l_lnPassRowCount:0,
      l_stPassProdCode:sku,
      l_stPassProdGroupCode:"**NONE**",
    });
    const xml=load(xmlText,{xmlMode:true});
    const status=xml("RETURNPACKET > STATUS").text().trim();
    const rows:Record<string,string>[]=[];
    xml("results > Detail > record").each((_,record)=>{
      if(xml(record).attr("groupRow")?.toUpperCase()==="TRUE") return;
      const fields:Record<string,string>={};
      xml(record).children("fd").each((__,field)=>{
        const id=xml(field).attr("id")?.toUpperCase();
        if(id) fields[id]=decodeURIComponent(xml(field).attr("value")??"");
      });
      rows.push(fields);
    });
    results.push({sku,status,total:xml("RETURNPACKET > TOTALROWS").text(),rows});
  }
  console.log(JSON.stringify({event:"PT_RAW_PRODUCT_SEARCH_PROBE",results}));
}
void main();
