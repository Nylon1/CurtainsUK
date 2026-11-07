import { hasSupplierAdminRole } from '@/lib/supplier-intelligence/authz';

export function hasSampleToSaleRole(appMetadata: Record<string, unknown> | null | undefined): boolean {
  const roles = Array.isArray(appMetadata?.roles) ? appMetadata.roles : [];
  return hasSupplierAdminRole(appMetadata) || roles.includes('CURTAINSUK_SAMPLE_TO_SALE_MANAGER');
}
