"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      router.push("/admin/");
    } catch (error: any) {
      alert(error?.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      alert("Account created. You can now sign in.");
    } catch (error: any) {
      alert(error?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-apex-navy-900 px-4 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-8">
        <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
          Admin Login
        </div>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>

        <form onSubmit={handleSignIn} className="mt-8 space-y-4">
          <label className="block">
            <div className="mb-2 text-sm text-white/65">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              required
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm text-white/65">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              required
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black"
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white"
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}