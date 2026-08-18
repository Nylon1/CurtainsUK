"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfessionalSetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.replace("/professionals/workspace/login?error=invite");
        return;
      }
      setEmail(data.user.email || "");
      setLoading(false);
    });
    return () => { active = false; };
  }, [router, supabase.auth]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 10) {
      setErrorMessage("Use at least 10 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("The two passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    router.replace("/professionals/workspace/live");
    router.refresh();
  }

  if (loading) {
    return <main className="min-h-screen bg-apex-navy-950" />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-apex-navy-950 px-4 py-24 text-white">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#1B405B] p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Professional workspace access</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Set your secure password</h1>
        <p className="mt-4 text-sm leading-7 text-[#C8D1D8]">
          Your Apex professional account has been authorised for a project. Set a password to complete account setup.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-[#C8D1D8]">
          Account: <span className="font-semibold text-white">{email}</span>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">New password</span>
            <input type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Confirm password</span>
            <input type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
          </label>

          {errorMessage ? <p className="text-sm text-red-200">{errorMessage}</p> : null}

          <button disabled={saving} className="w-full rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950 disabled:opacity-60">
            {saving ? "Saving…" : "Set password & open workspace"}
          </button>
        </form>

        <Link href="/professionals" className="mt-6 inline-block text-sm text-[#C8D1D8] hover:text-white">Back to professional services</Link>
      </div>
    </main>
  );
}
