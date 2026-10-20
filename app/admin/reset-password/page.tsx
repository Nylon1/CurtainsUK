"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "request" | "checking" | "change" | "sent" | "invalid";

export default function AdminResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    let recoverySeen = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) {
        recoverySeen = true;
        setMode("change");
      }
    });

    async function checkLink() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const code = url.searchParams.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const recoveryLink = Boolean(code || (accessToken && refreshToken));
      if (!recoveryLink) {
        if (active && !recoverySeen) setMode("request");
        return;
      }

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          // The browser client may already have exchanged the code during initialization.
          if (error && !recoverySeen) throw error;
        } else {
          const { error } = await supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken! });
          if (error) throw error;
        }
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw error || new Error("RECOVERY_SESSION_MISSING");
        window.history.replaceState(null, "", url.pathname);
        if (active) setMode("change");
      } catch {
        if (active) setMode("invalid");
      }
    }

    void checkLink();
    return () => { active = false; subscription.unsubscribe(); };
  }, [supabase]);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    const redirectTo = `${window.location.origin}/admin/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setBusy(false);
    if (error) {
      setErrorMessage("The reset email could not be requested. Please try again shortly.");
      return;
    }
    setMode("sent");
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    if (password.length < 12) {
      setErrorMessage("Use at least 12 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErrorMessage("Your password could not be changed. Please request a new reset link.");
      return;
    }
    router.replace("/admin/error-centre");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-apex-navy-900 px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">CurtainsUK Error Centre</p>
        <h1 className="mt-3 text-3xl font-semibold">{mode === "change" ? "Set a new password" : "Reset your password"}</h1>

        {mode === "checking" ? <p className="mt-5 text-sm text-white/70" role="status">Checking your secure link…</p> : null}
        {mode === "invalid" ? <p className="mt-5 text-sm text-white/70" role="alert">This reset link has expired or cannot be used. Request a fresh link below.</p> : null}
        {mode === "sent" ? <p className="mt-5 text-sm leading-6 text-white/70" role="status">If this address has an account, a password reset link is on its way. Check your inbox and spam folder.</p> : null}

        {(mode === "request" || mode === "invalid") ? (
          <form onSubmit={requestReset} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-white/75">Account email</span>
              <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-white outline-none focus-visible:border-[#f5d38a]" />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-semibold text-black disabled:opacity-60">{busy ? "Requesting…" : "Email me a reset link"}</button>
          </form>
        ) : null}

        {mode === "change" ? (
          <form onSubmit={savePassword} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-white/75">New password</span>
              <input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-white outline-none focus-visible:border-[#f5d38a]" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-white/75">Confirm new password</span>
              <input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-white outline-none focus-visible:border-[#f5d38a]" />
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-semibold text-black disabled:opacity-60">{busy ? "Saving…" : "Save password and open Error Centre"}</button>
          </form>
        ) : null}

        {errorMessage ? <p className="mt-4 text-sm text-red-200" role="alert">{errorMessage}</p> : null}
        <Link href="/admin/login?next=%2Fadmin%2Ferror-centre" className="mt-7 inline-block text-sm text-white/70 underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Back to sign in</Link>
      </div>
    </main>
  );
}
