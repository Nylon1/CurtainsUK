export function hasSupplierAdminRole(appMetadata: Record<string, unknown> | null | undefined) {
  const roles = Array.isArray(appMetadata?.roles) ? appMetadata.roles.filter((role): role is string => typeof role === "string") : [];
  return roles.includes("SUPPLIER_ADMIN");
}
