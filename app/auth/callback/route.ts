import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value) return "/professionals/workspace/live";
  return value.startsWith("/professionals/workspace/") ? value : "/professionals/workspace/live";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/professionals/workspace/login?error=invite", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/professionals/workspace/login?error=invite", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
