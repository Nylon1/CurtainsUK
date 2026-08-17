import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { cityPages } from "@/lib/cities";

export const metadata = {
  title: "Areas We Cover | Apex Curtains",
  description:
    "Explore UK areas we cover for bespoke curtains for apex, angled, triangular and unusual windows.",
};

export default function AreasPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[20%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
            <nav
  aria-label="Breadcrumb"
  className="mb-8 flex flex-wrap items-center gap-2 text-sm"
>
  <Link href="/" className="text-white/45 transition hover:text-white">
    Home
  </Link>
  <span className="text-white/25">/</span>
  <Link href="/areas" className="text-white/45 transition hover:text-white">
    Areas
  </Link>
  <span className="text-white/25">/</span>
  <span className="text-[#f5d38a]">Areas</span>
</nav>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
            <MapPin className="h-4 w-4" />
            Areas We Cover
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Bespoke curtains for
            <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
              {" "}apex and unusual windows across the UK
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            We help homeowners across the UK dress apex, angled, triangular and gable end windows
            with specialist curtain solutions designed around the shape of the space.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cityPages.map((city) => (
            <Link
              key={city.slug}
              href={`/areas/${city.slug}`}
              className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] transition hover:border-[#f5d38a]/25 hover:bg-white/[0.06]"
            >
              <div className="text-sm uppercase tracking-[0.16em] text-[#f5d38a]/80">
                {city.region}
              </div>

              <h2 className="mt-3 text-2xl font-semibold text-white">
                {city.name}
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/65">
                {city.seoBlurb}
              </p>

              <div className="mt-6 inline-flex items-center gap-2 text-sm text-white/80 transition group-hover:text-[#f5d38a]">
                View city page
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}