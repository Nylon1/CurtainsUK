/** Production calculation is non-payable. Creation additionally needs explicit verified test-mode approval. */
export function allowedCheckoutStore(shop:string,mode:string,productionTestConfirmed=false){
 return shop==='curtainsuk-dev.myshopify.com'||(shop==='carpetup.myshopify.com'&&(mode==='CALCULATE_ONLY'||productionTestConfirmed));
}
