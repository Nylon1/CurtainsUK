import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupplierAdminRole } from "@/lib/supplier-intelligence/authz";
import { hasStagingReviewRole } from "./review-authz";

export async function reviewStaffIdentity() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous) return null;
  if (!hasSupplierAdminRole(user.app_metadata) && !hasStagingReviewRole({
    appMetadata: user.app_metadata,
    authUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    environment: process.env.VERCEL_ENV,
    anonymous: user.is_anonymous,
  })) return null;
  return { id: user.id };
}
