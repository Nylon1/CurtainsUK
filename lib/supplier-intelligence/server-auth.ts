import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupplierAdminRole } from "./authz";

export async function supplierAdminIdentity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasSupplierAdminRole(user.app_metadata)) return null;
  return { id: user.id };
}
