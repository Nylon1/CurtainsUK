"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminHomePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/admin/login");
        return;
      }

      setEmail(session.user.email ?? null);
    } catch (error) {
      console.error(error);
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-apex-navy-900 p-8 text-white">
        Loading admin...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-apex-navy-900 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 md:p-10">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Admin
          </div>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold">Content Admin</h1>
              <p className="mt-3 max-w-2xl text-white/65">
                Manage gallery projects and advice posts from one place.
              </p>
              {email && (
                <p className="mt-2 text-sm text-white/45">
                  Signed in as {email}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Link
              href="/admin/projects"
              className="group rounded-[28px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-6 transition hover:bg-[#f5d38a]/15"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-[#f5d38a]">
                Gallery
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Gallery Projects
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Add, edit, delete and organise completed curtain projects.
              </p>
              <div className="mt-6 text-sm font-medium text-[#f5d38a]">
                Open Gallery Admin →
              </div>
            </Link>

            <Link
              href="/admin/posts"
              className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-[#f5d38a]">
                Advice
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Advice Posts
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Manage blog posts, SEO content and published advice articles.
              </p>
              <div className="mt-6 text-sm font-medium text-[#f5d38a]">
                Open Posts Admin →
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}