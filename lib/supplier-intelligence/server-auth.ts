import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupplierAdminRole, hasSupplierPriceApprovalPermission } from "./authz";

export async function supplierAdminIdentity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasSupplierAdminRole(user.app_metadata)) return null;
  return { id: user.id };
}

export async function supplierPriceApprovalIdentity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasSupplierPriceApprovalPermission(user.app_metadata)) return null;
  return { id: user.id, priceOnly: !hasSupplierAdminRole(user.app_metadata) };
}
