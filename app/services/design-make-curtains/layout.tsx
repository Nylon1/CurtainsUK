import type { ReactNode } from "react";
import Link from "next/link";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <section className="border-t border-white/10 bg-apex-navy-950 px-4 py-14 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Design details</p>
          <h2 className="mt-3 text-3xl font-semibold text-[#F4F0E8]">Explore the choices that shape a made-to-measure curtain</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#C8D1D8]">Fabric, lining, heading and finishing accessories work together. Explore each part in more detail before deciding the final curtain specification.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["/curtain-fabrics", "Curtain fabrics", "Weight, drape, pattern and room suitability."],
              ["/curtain-linings", "Curtain linings", "Blackout, thermal lining and interlining."],
              ["/curtain-headings", "Curtain headings", "Wave, pinch pleat, pencil pleat and single pleat."],
              ["/curtain-accessories", "Curtain accessories", "Tiebacks, tieback hooks and finishing details."],
            ].map(([href, title, text]) => (
              <Link key={href} href={href} className="rounded-[24px] border border-white/10 bg-[#1B405B] p-5 transition hover:border-[#d6b56b]/35">
                <span className="block text-lg font-semibold text-[#F4F0E8]">{title}</span>
                <span className="mt-2 block text-sm leading-6 text-[#C8D1D8]">{text}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
