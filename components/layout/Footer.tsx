import Link from "next/link";

const columns = [
  { title: "Shop", links: [["By window", "/shop-by-window"], ["By fabric", "/fabrics"], ["Samples", "/samples"], ["Start configuring", "/configure"]] },
  { title: "Plan", links: [["How to measure", "/measure"], ["Curtain headings", "/curtain-headings"], ["Linings", "/curtain-linings"], ["Tracks", "/curtain-tracks"]] },
  { title: "Help", links: [["Frequently asked questions", "/faq"], ["Inspiration", "/gallery"], ["Contact", "/contact"], ["Terms", "/terms"]] },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#173c32] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:px-8">
        <div>
          <div className="text-2xl font-semibold tracking-[-0.04em]">CurtainsUK</div>
          <p className="mt-4 max-w-lg text-sm leading-7 text-white/70">Made-to-measure curtains for standard, bay, apex, triangular, gable, tall, wide and unusual windows.</p>
          <div className="mt-6 inline-flex rounded-full border border-[#d9aa67]/35 bg-[#d9aa67]/10 px-3 py-1.5 text-xs font-medium text-[#f0cf9b]">Development storefront · not production checkout</div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e2bc82]">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-white/70 transition hover:text-white">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/45">© {new Date().getFullYear()} CurtainsUK. Staging experience only.</div>
    </footer>
  );
}
