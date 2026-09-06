"use client";

import Link from "next/link";
import { Menu, Phone, Ruler, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Shop Curtains", href: "/configure" },
  { label: "Shop by Window", href: "/shop-by-window" },
  { label: "Shop by Fabric", href: "/fabrics" },
  { label: "Apex & Gable", href: "/shop-by-window/apex-window" },
  { label: "Measure", href: "/measure" },
  { label: "Samples", href: "/samples" },
  { label: "Inspiration", href: "/gallery" },
  { label: "Help", href: "/faq" },
] as const;

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50 border-b border-[#173c32]/10 bg-[#fbf8f2]/95 text-[#173c32] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="CurtainsUK home">
          <span className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">CurtainsUK</span>
          <span className="hidden rounded-full bg-[#d9aa67]/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a5425] sm:inline">Staging</span>
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${isActive(item.href) ? "bg-[#173c32] text-white" : "text-[#315248] hover:bg-[#173c32]/7 hover:text-[#173c32]"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="tel:08007720367" className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#315248] hover:bg-[#173c32]/7 lg:flex">
            <Phone className="h-4 w-4" /> 0800 772 0367
          </Link>
          <Link href="/configure" className="hidden items-center gap-2 rounded-full bg-[#d9aa67] px-4 py-2.5 text-sm font-semibold text-[#1f2f2a] transition hover:bg-[#c89958] sm:flex">
            <Ruler className="h-4 w-4" /> Start My Curtains
          </Link>
          <button type="button" onClick={() => setMobileOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#173c32]/15 xl:hidden" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-[#173c32]/10 bg-[#fbf8f2] px-4 py-4 xl:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-[1440px] gap-1 sm:grid-cols-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`rounded-2xl px-4 py-3 text-sm font-medium ${isActive(item.href) ? "bg-[#173c32] text-white" : "text-[#315248] hover:bg-[#173c32]/7"}`}>
                {item.label}
              </Link>
            ))}
            <Link href="/configure" onClick={() => setMobileOpen(false)} className="mt-2 rounded-2xl bg-[#d9aa67] px-4 py-3 text-center text-sm font-semibold text-[#1f2f2a] sm:col-span-2">Start My Curtains</Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
