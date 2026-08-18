"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ProfessionalWorkspaceLoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const requestedNext = searchParams.get("next") || "";
    const safeNext = requestedNext.startsWith("/professionals/workspace/")
      ? requestedNext
      : "/professionals/workspace/live";

    router.push(safeNext);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-apex-navy-950 px-4 text-white">
      <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#1B405B] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Professional workspace</p>
        <h1 className="mt-4 text-3xl font-semibold">Sign in to your project workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[#C8D1D8]">Access is for authorised Apex Curtains professional-project users. Public self-registration is not enabled.</p>

        <form onSubmit={signIn} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-[#C8D1D8]">Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-[#C8D1D8]">Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none" />
          </label>
          {errorMessage ? <p className="text-sm text-red-200">{errorMessage}</p> : null}
          <button disabled={loading} className="w-full rounded-full bg-[#d6b56b] px-5 py-3 text-sm font-semibold text-apex-navy-950 disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <Link href="/professionals" className="mt-6 inline-block text-sm text-[#C8D1D8] hover:text-white">Back to professional services</Link>
      </div>
    </main>
  );
}
