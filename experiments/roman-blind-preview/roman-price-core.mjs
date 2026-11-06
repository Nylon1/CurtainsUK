// Local Roman estimate adapter. Uses flat blind quantities, not curtain fullness.
// These are the BSXL 1:4 trade tiers observed in the signed-in Evans catalogue, 6 Nov 2026.
// Wider rails require verification rather than extrapolation.
export const headrails=Object.freeze([{widthMm:1000,costMinor:2024,sku:'790471'},{widthMm:1400,costMinor:2401,sku:'790472'},{widthMm:1800,costMinor:2625,sku:'790473'}]);
export function validOrderSize(value){return typeof value==='number'&&Number.isFinite(value)&&value>=30&&value<=500&&Math.abs(value*10-Math.round(value*10))<1e-7;}
export function romanEstimate(input,fabric,rules){
 const pending=message=>({status:'review',message,totalMinor:null});
 if(!validOrderSize(input.width)||!validOrderSize(input.drop)||!['STANDARD','BLACKOUT'].includes(input.lining)||!['stacked','cascade'].includes(input.fold))return pending('Enter valid finished measurements and choose your lining.');
 const rail=headrails.find(r=>r.widthMm>=Math.round(input.width*10));
 if(!rail||input.drop>350)return pending('This size needs a headrail and workroom price check. You can still save your design.');
 if(!Number.isFinite(fabric.usableWidthMm)||fabric.usableWidthMm<=0||!Number.isInteger(fabric.supplierCostPerMetre?.amountMinor)||fabric.supplierCostPerMetre.amountMinor<=0)return pending('This fabric needs a verified price or width before we can calculate.');
 if(fabric.patternMatchType==='HALF_DROP_MATCH')return pending('This pattern needs a workroom matching check before we price your blind.');
 const widths=Math.ceil(input.width*10/fabric.usableWidthMm);
 let cutMm=input.drop*10+rules.constructionAllowances.topAllowanceMm.value+rules.constructionAllowances.bottomHemAllowanceMm.value;
 if(fabric.patternAllowance)cutMm+=fabric.patternAllowance.allowanceMm;
 else if(fabric.patternMatchType==='STRAIGHT_MATCH'&&fabric.verticalRepeatMm>0)cutMm=Math.ceil(cutMm/fabric.verticalRepeatMm)*fabric.verticalRepeatMm;
 else if(fabric.patternMatchType!=='RANDOM_MATCH')return pending('The pattern repeat needs checking before we can calculate.');
 const increment=rules.fabricOrderingIncrementMetres;
 const metres=Math.ceil((widths*cutMm/1000-1e-9)/increment)*increment;
 const lining=rules.liningRules[input.lining],liningWidths=Math.ceil(input.width*10/lining.usableWidthMm);
 const liningMetres=Math.ceil((liningWidths*(input.drop*10+lining.topAllowanceMm+lining.bottomAllowanceMm)/1000-1e-9)/increment)*increment;
 const direct=metres*fabric.supplierCostPerMetre.amountMinor+liningMetres*lining.materialRateNetPerMetre.amountMinor+widths*rules.baseMakeupLabourNetPerWidth.amountMinor+rail.costMinor;
 const net=direct/(1-rules.marginPolicy.targetGrossMarginBasisPoints.value/10000);
 const totalMinor=Math.round(net*(1+rules.vat.rateBasisPoints/10000)/rules.rounding.incrementMinor)*rules.rounding.incrementMinor;
 return {status:'estimate',totalMinor,currency:'GBP',includesVat:true,ruleVersion:rules.version,headrail:'Evans Evaglide BSXL 1:4',message:'Includes fabric, making, lining and headrail. Construction, rods, hardware and delivery need final confirmation.',width:input.width,drop:input.drop,lining:input.lining,fold:input.fold,_fabricMetres:metres};
}
