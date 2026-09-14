/** Live approval and verified test payment safety are independent, never interchangeable. */
export function allowedCheckoutStore(shop:string,mode:string,productionTestConfirmed=false,productionApproved=false){
 if(mode==='CREATE_PRODUCTION_DRAFT') return shop==='carpetup.myshopify.com' && productionApproved;
 if(!['CALCULATE_ONLY','CREATE_TEST_DRAFT'].includes(mode)) return false;
 return shop==='curtainsuk-dev.myshopify.com'||(shop==='carpetup.myshopify.com'&&(mode==='CALCULATE_ONLY'||productionTestConfirmed));
}
