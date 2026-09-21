/**
 * Production calculation selection is separate from purchase approval: staff
 * can verify the exact active production ruleset while public payment is off.
 */
export type CustomerPricingEnvironment = {
  VERCEL_ENV?: string;
  CURTAINSUK_DEPLOYMENT_STAGE?: string;
};

export function productionCustomerPricingEnabled(environment: CustomerPricingEnvironment = process.env as CustomerPricingEnvironment): boolean {
  return environment.VERCEL_ENV === "production" && environment.CURTAINSUK_DEPLOYMENT_STAGE === "PRODUCTION";
}
