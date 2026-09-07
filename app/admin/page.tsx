"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminHomePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/admin/login");
          return;
        }

        if (!cancelled) setEmail(session.user.email ?? null);
      } catch (error) {
        console.error(error);
        router.push("/admin/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void checkSession();
    return () => { cancelled = true; };
  }, [router, supabase]);

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
              href="/admin/reviews"
              className="group rounded-[28px] border border-[#f5d38a]/30 bg-[#f5d38a]/10 p-6 transition hover:bg-[#f5d38a]/15"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-[#f5d38a]">Curtain operations</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Technical Review Queue</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">Review customer measurements, evidence and pricing revisions before a project is marked ready for checkout.</p>
              <div className="mt-6 text-sm font-medium text-[#f5d38a]">Open review queue →</div>
            </Link>
            <Link
              href="/admin/supplier-imports"
              className="group rounded-[28px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-6 transition hover:bg-[#f5d38a]/15"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-[#f5d38a]">Supplier imports</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Bulk Import</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">Map and preview supplier files before appending them to private shadow history.</p>
              <div className="mt-6 text-sm font-medium text-[#f5d38a]">Open bulk import →</div>
            </Link>
            <Link
              href="/admin/supplier-intelligence"
              className="group rounded-[28px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-6 transition hover:bg-[#f5d38a]/15"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-[#f5d38a]">Supplier intelligence</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Supplier Sync Health</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">Review validation, freshness, price and stock changes before approving a supplier snapshot.</p>
              <div className="mt-6 text-sm font-medium text-[#f5d38a]">Open supplier health →</div>
            </Link>
            <Link
              href="/admin/prestigious-stock"
              className="group rounded-[28px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-6 transition hover:bg-[#f5d38a]/15"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-[#f5d38a]">Supplier verification</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Prestigious Stock Check</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">Record current cut pricing, dye-lot stock and next-due information from Webtex.</p>
              <div className="mt-6 text-sm font-medium text-[#f5d38a]">Open stock check →</div>
            </Link>
            <Link
              href="/admin/catalogue-readiness"
              className="group rounded-[28px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-6 transition hover:bg-[#f5d38a]/15"
            >
              <div className="text-sm uppercase tracking-[0.18em] text-[#f5d38a]">Launch control</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Catalogue Readiness</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">Check imagery, pricing, lifecycle and merge-safety evidence before any wider supplier import.</p>
              <div className="mt-6 text-sm font-medium text-[#f5d38a]">Open readiness gates →</div>
            </Link>
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
