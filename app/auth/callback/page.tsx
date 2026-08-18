"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNext(value: string | null) {
  if (!value) return "/professionals/workspace/live";
  return value.startsWith("/professionals/workspace/") ? value : "/professionals/workspace/live";
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState("Securely signing you in…");

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      const next = safeNext(searchParams.get("next"));
      const code = searchParams.get("code");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          } else {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session) throw error || new Error("AUTH_SESSION_NOT_AVAILABLE");
          }
        }

        if (!active) return;
        router.replace(next);
        router.refresh();
      } catch {
        if (!active) return;
        setMessage("This access link could not be completed. Please request a fresh invitation.");
        window.setTimeout(() => {
          router.replace("/professionals/workspace/login?error=invite");
        }, 1600);
      }
    }

    completeAuth();
    return () => {
      active = false;
    };
  }, [router, searchParams, supabase]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-apex-navy-950 px-4 text-white">
      <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#1B405B] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b56b]">Apex Professional Workspace</p>
        <h1 className="mt-4 text-3xl font-semibold">{message}</h1>
        <p className="mt-4 text-sm leading-7 text-[#C8D1D8]">Please keep this page open while your secure project access is confirmed.</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-apex-navy-950" />}>
      <CallbackHandler />
    </Suspense>
  );
}
