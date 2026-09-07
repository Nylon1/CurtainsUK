import { createClient } from "@supabase/supabase-js";

function buildClient(url: string, secret: string) {
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: "curtainsuk_private" },
  });
}

let client: ReturnType<typeof buildClient> | undefined;

export function supplierDatabaseConfigured() {
  return Boolean((process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) && (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY));
}

/** Server-only elevated client. Never import from Client Components or public payload modules. */
export function createSupplierServiceClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("SUPPLIER_DATABASE_NOT_CONFIGURED");
  client = buildClient(url, secret);
  return client;
}
