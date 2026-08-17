import Link from "next/link";
import { ArrowRight, Building2, DraftingCompass, Hammer, Palette } from "lucide-react";

const roles = [
  { label: "Interior designers", href: "/professionals/interior-designers", icon: Palette, text: "Window-treatment schedules, heading/fullness, fabric/lining and stack-back coordination." },
  { label: "Architects", href: "/professionals/architects", icon: DraftingCompass, text: "Aperture geometry, track route, recess detail, fixing zones and access strategy." },
  { label: "Developers & housebuilders", href: "/professionals/developers-housebuilders", icon: Building2, text: "Show homes, repeatable plot specifications, programme sequencing and handover." },
  { label: "Contractors & fit-out", href: "/professionals/contractors-fit-out", icon: Hammer, text: "Substrate verification, installation interfaces, access and specialist-track sequencing." },
];

export default function ProfessionalsPreview() {
  return (
    <section className="relative border-y border-white/10 bg-black/10 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">For the design & construction team</p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Specify the curtain system with the architecture.</h2>
            <p className="mt-5 max-w-xl leading-8 text-[#C8D1D8]">
              For complex glazing, the window treatment affects track routing, fixing substrate, recess detail, curtain stack, fabric load, finished drop and installation access. Apex Curtains provides a dedicated professional pathway for project teams who need those interfaces resolved before manufacture.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/professionals" className="inline-flex items-center gap-2 rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Professional & specifier support <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/professionals/project-review" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Discuss a project</Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map(({ label, href, icon: Icon, text }) => (
              <Link key={href} href={href} className="rounded-[26px] border border-white/10 bg-[#1B405B] p-6 transition hover:-translate-y-1 hover:border-[#d6b56b]/35">
                <Icon className="h-5 w-5 text-[#d6b56b]" />
                <h3 className="mt-4 text-xl font-semibold text-[#F4F0E8]">{label}</h3>
                <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
