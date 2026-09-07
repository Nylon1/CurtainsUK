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
