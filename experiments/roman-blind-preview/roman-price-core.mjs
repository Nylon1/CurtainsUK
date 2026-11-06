// Local Roman estimate adapter. Uses flat blind quantities, not curtain fullness.
// These are the BSXL 1:4 trade tiers observed in the signed-in Evans catalogue, 6 Nov 2026.
// Wider rails require verification rather than extrapolation.
export const headrails=Object.freeze([{widthMm:1000,costMinor:2024,sku:'790471'},{widthMm:1400,costMinor:2401,sku:'790472'},{widthMm:1800,costMinor:2625,sku:'790473'}]);
export const romanAllowances=Object.freeze({sideSeamsTotalMm:100,topAndHemTotalMm:250});
export const evansSetSizeMaxWidthMm=3000;
export const standardRomanMaxDropCm=250;
export function validOrderSize(value){return typeof value==='number'&&Number.isFinite(value)&&value>=30&&value<=500&&Math.abs(value*10-Math.round(value*10))<1e-7;}
export function romanEstimate(input,fabric,rules){
 const pending=message=>({status:'review',message,totalMinor:null});
 if(!validOrderSize(input.width)||!validOrderSize(input.drop)||!['STANDARD','BLACKOUT'].includes(input.lining)||!['stacked','cascade'].includes(input.fold))return pending('Enter valid finished measurements and choose your lining.');
 const finishedWidthMm=Math.round(input.width*10),cutWidthMm=finishedWidthMm+romanAllowances.sideSeamsTotalMm;
 if(finishedWidthMm>evansSetSizeMaxWidthMm)return pending('This width is above the largest listed Evans 1:4 set-size headrail, 300 cm. Please ask for a custom quote.');
 if(input.drop>standardRomanMaxDropCm)return pending('Standard Roman blinds have a maximum drop of 250 cm. Please ask for a custom quote for this drop.');
 const rail=headrails.find(r=>r.widthMm>=finishedWidthMm);
 if(!rail)return pending(`This width uses the Evans ${finishedWidthMm<=2500?'250':'300'} cm kit. Its trade price is being confirmed. You can still save your design.`);
 if(!Number.isFinite(fabric.usableWidthMm)||fabric.usableWidthMm<=0||!Number.isInteger(fabric.supplierCostPerMetre?.amountMinor)||fabric.supplierCostPerMetre.amountMinor<=0)return pending('This fabric needs a verified price or width before we can calculate.');
 if(fabric.patternMatchType==='HALF_DROP_MATCH')return pending('This pattern needs a workroom matching check before we price your blind.');
 const widths=Math.ceil(cutWidthMm/fabric.usableWidthMm);
 let cutMm=input.drop*10+romanAllowances.topAndHemTotalMm;
 if(fabric.patternAllowance)cutMm+=fabric.patternAllowance.allowanceMm;
 else if(fabric.patternMatchType==='STRAIGHT_MATCH'&&fabric.verticalRepeatMm>0)cutMm=Math.ceil(cutMm/fabric.verticalRepeatMm)*fabric.verticalRepeatMm;
 else if(fabric.patternMatchType!=='RANDOM_MATCH')return pending('The pattern repeat needs checking before we can calculate.');
 const increment=rules.fabricOrderingIncrementMetres;
 const metres=Math.ceil((widths*cutMm/1000-1e-9)/increment)*increment;
 const lining=rules.liningRules[input.lining],liningWidths=Math.ceil(cutWidthMm/lining.usableWidthMm);
 const liningMetres=Math.ceil((liningWidths*(input.drop*10+romanAllowances.topAndHemTotalMm)/1000-1e-9)/increment)*increment;
 const direct=metres*fabric.supplierCostPerMetre.amountMinor+liningMetres*lining.materialRateNetPerMetre.amountMinor+widths*rules.baseMakeupLabourNetPerWidth.amountMinor+rail.costMinor;
 const net=direct/(1-rules.marginPolicy.targetGrossMarginBasisPoints.value/10000);
 const totalMinor=Math.round(net*(1+rules.vat.rateBasisPoints/10000)/rules.rounding.incrementMinor)*rules.rounding.incrementMinor;
 return {status:'estimate',totalMinor,currency:'GBP',includesVat:true,ruleVersion:rules.version,headrail:'Evans Evaglide BSXL 1:4',message:'Includes fabric, making, lining and the full Evans kit. Delivery is additional.',width:input.width,drop:input.drop,lining:input.lining,fold:input.fold,_fabricMetres:metres};
}
