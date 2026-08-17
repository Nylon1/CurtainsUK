import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Ruler, Settings2 } from "lucide-react";

type Section = {
  title: string;
  body: string;
};

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  roleLabel: string;
  sections: Section[];
  deliverables: string[];
  coordination: string[];
};

export default function ProfessionalRolePage({
  eyebrow,
  title,
  intro,
  roleLabel,
  sections,
  deliverables,
  coordination,
}: Props) {
  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      <section className="border-b border-white/10 px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">{eyebrow}</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">{title}</h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#C8D1D8]">{intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/professionals/project-review" className="inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">
                Discuss a project <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/gallery" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white">
                Review project evidence
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7">
              <h2 className="text-2xl font-semibold text-[#F4F0E8]">{section.title}</h2>
              <p className="mt-4 leading-8 text-[#C8D1D8]">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7 sm:p-9">
            <div className="flex items-center gap-3 text-[#d6b56b]"><FileText className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.2em]">Specification inputs</span></div>
            <h2 className="mt-5 text-3xl font-semibold">What we can work from</h2>
            <div className="mt-6 space-y-3">
              {deliverables.map((item) => (
                <div key={item} className="flex gap-3 text-[#C8D1D8]"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#d6b56b]" /><span>{item}</span></div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7 sm:p-9">
            <div className="flex items-center gap-3 text-[#d6b56b]"><Settings2 className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.2em]">Coordination points</span></div>
            <h2 className="mt-5 text-3xl font-semibold">Issues to resolve before manufacture</h2>
            <div className="mt-6 space-y-3">
              {coordination.map((item) => (
                <div key={item} className="flex gap-3 text-[#C8D1D8]"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#d6b56b]" /><span>{item}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[34px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-8 sm:p-10">
          <div className="flex items-center gap-3 text-[#d6b56b]"><Ruler className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.2em]">{roleLabel} project support</span></div>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold sm:text-4xl">Bring us in before the curtain specification becomes a site problem.</h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#C8D1D8]">
            Early coordination can clarify track route, fixing substrate, recess or ceiling interface, curtain stack-back, heading, face fabric, lining, finished drop, access strategy and installation sequencing before manufacture is released.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/curtain-tracks" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Track specification</Link>
            <Link href="/curtain-design-guide" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Curtain design guide</Link>
            <Link href="/services/premium-installation" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold">Installation methodology</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
