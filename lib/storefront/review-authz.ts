import { hasSupplierAdminRole } from "@/lib/supplier-intelligence/authz";
/** Review permission is deliberately independent of supplier-commercial administration. */
export function hasStagingReviewRole(input: {
  appMetadata: Record<string, unknown> | null | undefined;
  authUrl: string | undefined;
  environment: string | undefined;
  anonymous?: boolean;
}) {
  const roles = input.appMetadata?.roles;
  return input.anonymous !== true
    && input.environment === "preview"
    && input.authUrl === "https://hqysjumypgeapgmqkcrx.supabase.co"
    && input.appMetadata?.curtainsuk_environment === "STAGING"
    && Array.isArray(roles)
    && roles.includes("CURTAINSUK_STAGING_REVIEWER");
}

/** Distinguish a verified denial from a temporary authentication-service failure. */
export function reviewAuthorization(input: {
  user: {id:string;is_anonymous?:boolean;app_metadata:Record<string,unknown>} | null;
  error: {status?:number} | null;
  authUrl: string | undefined;
  environment: string | undefined;
}): {status:200;identity:{id:string}} | {status:401|403|503;error:string} {
  if (input.error) {
    return !input.error.status || input.error.status >= 500
      ? {status:503,error:'STAFF_AUTH_UNAVAILABLE'}
      : {status:401,error:'AUTHENTICATION_REQUIRED'};
  }
  if (!input.user) return {status:401,error:'AUTHENTICATION_REQUIRED'};
  if (input.user.is_anonymous) return {status:403,error:'STAFF_ROLE_REQUIRED'};
  if (!hasSupplierAdminRole(input.user.app_metadata) && !hasStagingReviewRole({
    appMetadata:input.user.app_metadata,authUrl:input.authUrl,environment:input.environment,anonymous:input.user.is_anonymous,
  })) return {status:403,error:'STAFF_ROLE_REQUIRED'};
  return {status:200,identity:{id:input.user.id}};
}
