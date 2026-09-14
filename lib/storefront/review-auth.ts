import "server-only";
import { createClient } from "@/lib/supabase/server";
import { reviewAuthorization } from "./review-authz";

export async function reviewStaffAccess() {
  const supabase = await createClient();
  const {data:{user},error} = await supabase.auth.getUser();
  return reviewAuthorization({user,error,authUrl:process.env.NEXT_PUBLIC_SUPABASE_URL,environment:process.env.VERCEL_ENV});
}

export async function reviewStaffIdentity() {
  const access = await reviewStaffAccess();
  return access.status === 200 ? access.identity : null;
}
