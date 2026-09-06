import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { StorefrontWindowType } from "@/lib/storefront/window-catalog";

export default function WindowCard({ windowType, priority = false }: { windowType: StorefrontWindowType; priority?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-[26px] border border-[#173c32]/10 bg-white shadow-[0_14px_45px_rgba(23,60,50,0.08)]">
      <Link href={`/shop-by-window/${windowType.slug}`} className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173c32]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#d9e0da]">
          <Image src={windowType.image} alt={`${windowType.name} curtain example`} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" priority={priority} />
          <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${windowType.journey === "SPECIALIST" ? "bg-[#7f4938] text-white" : windowType.journey === "REVIEW" ? "bg-[#d9aa67] text-[#273c35]" : "bg-white text-[#173c32]"}`}>
            {windowType.journey === "SPECIALIST" ? "Technical review" : windowType.journey === "REVIEW" ? "Price + review" : "Instant price"}
          </span>
        </div>
        <div className="p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.17em] text-[#9a6b32]">{windowType.eyebrow}</div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-[#173c32]">{windowType.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#577067]">{windowType.description}</p>
            </div>
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#173c32]/12 text-[#173c32] transition group-hover:bg-[#173c32] group-hover:text-white"><ArrowUpRight className="h-4 w-4" /></span>
          </div>
        </div>
      </Link>
    </article>
  );
}
