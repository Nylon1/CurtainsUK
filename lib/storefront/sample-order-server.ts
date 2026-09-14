import 'server-only';
import { fabricMasterRecordsByIds } from '../fabric-master/repository';
import { dailyStockProjection } from './daily-stock-server';
import { verifyHciCommerceContext } from './hci-commerce-context';
import { SAMPLE_VARIANT_ID, sampleOrderProperties, verifySampleProperties } from './sample-order';

export async function prepareSampleOrder(input: {fabricId?: unknown; hciCommerceToken?: unknown; properties?: Record<string,string>}) {
  if (typeof input.fabricId !== 'string' || !/^[a-zA-Z0-9-]{1,150}$/.test(input.fabricId)) throw Error('SAMPLE_IDENTITY_INVALID');
  const fabric = (await fabricMasterRecordsByIds([input.fabricId]))[0];
  if (!fabric) throw Error('SAMPLE_NOT_AVAILABLE');
  const secret = process.env.CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET ?? '';
  const context = input.hciCommerceToken ? verifyHciCommerceContext(input.hciCommerceToken,fabric.fabric_id,secret) : undefined;
  const properties = sampleOrderProperties(fabric,secret,context);
  if (input.properties) {
    verifySampleProperties(input.properties,secret);
    for (const key of ['Fabric Master ID','Supplier SKU','Brand','Design','Colourway']) if(input.properties[key]!==properties[key]) throw Error('SAMPLE_IDENTITY_INVALID');
  }
  const stock = await dailyStockProjection({supplierId:fabric.supplier_id,supplierSku:fabric.supplier_sku});
  if (stock.availability !== 'FABRIC_AVAILABLE' || stock.stale) throw Error('SAMPLE_CURRENT_AVAILABILITY_REQUIRED');
  // Use the actual existing Shopify price. Never derive sample price from curtain trade cost.
  const response = await fetch('https://www.curtainsuk.com/products/fabric-sample.js',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw Error('SAMPLE_PRODUCT_UNAVAILABLE');
  const product = await response.json();
  const variant = product.variants?.find((v: {id:number}) => v.id === SAMPLE_VARIANT_ID);
  if (!variant?.available || !Number.isSafeInteger(variant.price) || variant.price <= 0) throw Error('SAMPLE_PRODUCT_UNAVAILABLE');
  return {variantId:SAMPLE_VARIANT_ID,quantity:1,properties,priceMinor:variant.price,currency:'GBP',purchaseEnabled:process.env.CURTAINSUK_PRODUCTION_PURCHASES_APPROVED === 'true'};
}
