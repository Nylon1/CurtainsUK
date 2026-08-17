import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Hammer,
  ShieldCheck,
  Ruler,
  Wrench,
  Home,
  Triangle,
  Phone,
  Sparkles,
  ClipboardCheck,
  Palette,
  FileText,
  Layers,
  AlertTriangle,
} from "lucide-react";

const installationIncludes = [
  {
    title: "Track positioning",
    text: "We carefully plan and fit the curtain track or fixing position so the curtains sit correctly and operate smoothly.",
    icon: Ruler,
  },
  {
    title: "Specialist fitting",
    text: "We install curtains for standard, high, angled, apex and awkward windows where detail and accuracy matter.",
    icon: Hammer,
  },
  {
    title: "On-site adjustments",
    text: "We check the curtain hang, stack, movement, drop and finished appearance during the installation stage.",
    icon: Wrench,
  },
  {
    title: "Premium finish",
    text: "We aim for a neat, clean and carefully finished installation that respects your home and the design of the room.",
    icon: ShieldCheck,
  },
];

const installationChecks = [
  "Track or pole position",
  "Wall or ceiling fixing surface",
  "Curtain drop and floor clearance",
  "Left and right curtain alignment",
  "Smooth opening and closing",
  "Stack-back position",
  "Curtain heading presentation",
  "Hook, glider or runner setup",
  "Bracket spacing and support",
  "Access requirements",
  "Obstructions near the window",
  "Final dressing and appearance",
];

const suitableFor = [
  "Apex windows",
  "Gable end windows",
  "Angled windows",
  "Tall feature windows",
  "Large curtain tracks",
  "Double-height rooms",
  "Stairwell windows",
  "Patio doors",
  "Bay windows",
  "Premium homes",
  "New build properties",
  "Renovation projects",
];

const installProcess = [
  {
    step: "01",
    title: "Review the project details",
    text: "Before fitting, we review the window, curtain design, track position, measurements and any access requirements agreed during the earlier stages.",
  },
  {
    step: "02",
    title: "Prepare the fitting area",
    text: "We check the working area, fixing surface, access, furniture position and any practical limitations before installation begins.",
  },
  {
    step: "03",
    title: "Fit the track or fixing system",
    text: "The track, pole or specialist fixing system is installed in the planned position, with care taken over alignment, support and finished appearance.",
  },
  {
    step: "04",
    title: "Hang and check the curtains",
    text: "The curtains are hung, checked for movement, adjusted where needed and reviewed for drop, heading shape, stack and overall presentation.",
  },
  {
    step: "05",
    title: "Dress and finish",
    text: "We complete the installation by dressing the curtains, checking the finish and making sure the final result looks balanced and premium.",
  },
];

const commonChallenges = [
  {
    title: "High windows",
    text: "Tall or double-height windows may need extra planning, safe access equipment and careful track positioning.",
  },
  {
    title: "Angled shapes",
    text: "Apex and angled windows require accurate positioning so the curtain follows the intended shape and does not look uneven.",
  },
  {
    title: "Heavy curtains",
    text: "Large, lined or interlined curtains need suitable support, correct brackets and a secure fixing method.",
  },
  {
    title: "Limited stack space",
    text: "Some windows need careful planning so the curtains can open neatly without blocking too much glass.",
  },
];

const previousStages = [
  {
    title: "Measure + Consultation",
    href: "/services/measure-consultation",
    text: "The first stage where we check the window, room, fixing options, measurements and practical requirements.",
    icon: ClipboardCheck,
    label: "Stage 01",
  },
  {
    title: "Design + Make Curtains",
    href: "/services/design-make-curtains",
    text: "The second stage where the curtain style, fabric, lining, heading, fullness and finished details are planned and made.",
    icon: Palette,
    label: "Stage 02",
  },
];

export const metadata = {
  title: "Premium Installation | Apex Curtains",
  description:
    "Premium curtain installation service for apex, angled, gable end, tall and made-to-measure curtain projects.",
};

export default function PremiumInstallationPage() {
  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 lg:px-8 lg:pb-28 lg:pt-44">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[#E5C07B]/20 blur-[140px]" />
          <div className="absolute right-[-120px] top-48 h-[420px] w-[420px] rounded-full bg-white/10 blur-[130px]" />
          <div className="absolute bottom-[-120px] left-[-120px] h-[440px] w-[440px] rounded-full bg-[#E5C07B]/10 blur-[150px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Link
                href="/services"
                className="mb-7 inline-flex items-center text-sm font-semibold text-[#f1d48b] transition hover:text-white"
              >
                ← Back to Services
              </Link>

              <div className="mb-6 inline-flex items-center rounded-full border border-[#E5C07B]/25 bg-[#E5C07B]/10 px-4 py-2 text-sm font-medium text-[#f1d48b]">
                <Sparkles className="mr-2 h-4 w-4" />
                Premium Curtain Installation
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
                Premium Installation
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                A careful, specialist curtain installation service for premium
                made-to-measure curtains, shaped windows, high spaces and
                complex fitting situations. We focus on the track position,
                fixing method, curtain movement, final drop and finished
                presentation.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/start-designing"
                  className="inline-flex items-center justify-center rounded-full bg-[#E5C07B] px-7 py-4 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Start your Curtain Journey
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href="tel:08007720367"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Speak to us
                </Link>
              </div>
            </div>

            <div className="relative rounded-[40px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
              <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-[#E5C07B]/10 via-transparent to-transparent" />

              <div className="relative">
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
                  <Hammer className="h-8 w-8" />
                </div>

                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  The final stage that brings the project together
                </h2>

                <p className="mt-4 text-sm leading-7 text-white/65">
                  A beautiful curtain can be spoiled by poor fitting. Premium
                  installation makes sure the curtain sits in the right place,
                  opens properly, hangs correctly and finishes the room as
                  intended.
                </p>

                <div className="mt-7 space-y-4">
                  {[
                    "Careful track and fixing alignment",
                    "Suitable support for the curtain weight",
                    "Checked movement and curtain drop",
                    "Clean, professional finished appearance",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f1d48b]" />
                      <span className="text-sm text-white/75">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Previous stages */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Previous Stages
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Installation works best when the earlier stages are done properly.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              Premium installation is the final part of the process. The result
              depends on accurate measuring, good design decisions and curtains
              made to the correct specification.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {previousStages.map((stage) => {
              const Icon = stage.icon;

              return (
                <Link
                  key={stage.title}
                  href={stage.href}
                  className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#E5C07B]/35 hover:bg-white/[0.07]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E5C07B]/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

                  <div className="relative">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
                        <Icon className="h-6 w-6" />
                      </div>

                      <span className="rounded-full border border-[#E5C07B]/20 bg-[#E5C07B]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f1d48b]">
                        {stage.label}
                      </span>
                    </div>

                    <h3 className="text-2xl font-semibold tracking-tight text-white">
                      {stage.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-white/65">
                      {stage.text}
                    </p>

                    <div className="mt-7 inline-flex items-center text-sm font-semibold text-[#f1d48b]">
                      View this stage
                      <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Includes */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              What We Install
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A careful fitting service for curtains that need to look right.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              Installation is not just about putting up a track. We check the
              fixing surface, position, support, curtain movement, drop,
              heading and final appearance.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {installationIncludes.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl"
                >
                  <div className="mb-6 inline-flex h-13 w-13 items-center justify-center rounded-2xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/60">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Installation checks */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Installation Checks
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The final checks that protect the finished result.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              We check the practical details that affect how the curtains look
              and work every day. This helps the installation feel clean,
              secure, balanced and premium.
            </p>

            <div className="mt-8 rounded-[28px] border border-[#E5C07B]/20 bg-[#E5C07B]/10 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#f1d48b]" />
                <p className="text-sm leading-7 text-white/75">
                  For high or awkward installations, access requirements may
                  need to be planned in advance. This can include towers,
                  ladders, extra time on site or additional fitting support.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {installationChecks.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f1d48b]" />
                <span className="text-sm leading-6 text-white/75">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suitable for */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
                Suitable For
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Especially useful for difficult or statement windows.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/65">
                Some curtain projects need more care than a standard fitting.
                This service is designed for homes and windows where the
                installation has to be accurate, secure and visually refined.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {suitableFor.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm font-medium text-white/75"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Common challenges */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Why Specialist Installation Matters
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Difficult windows need more than standard fitting.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              Premium curtains often involve extra weight, awkward access,
              unusual shapes or limited fixing options. These details need to
              be handled properly on site.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {commonChallenges.map((item) => (
              <div
                key={item.title}
                className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/60">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation process */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Installation Process
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              How the installation stage works.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              We keep the fitting stage calm, structured and precise. The goal
              is to protect the design decisions made earlier and deliver the
              best possible finished result.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {installProcess.map((item) => (
              <div
                key={item.step}
                className="grid gap-5 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition hover:border-[#E5C07B]/30 sm:grid-cols-[90px_1fr] sm:p-7"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-sm font-bold text-[#f1d48b]">
                  {item.step}
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-white/65">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important note */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-[#E5C07B]/20 bg-[#E5C07B]/10 p-7 sm:p-10 lg:p-14">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-[#E5C07B]/25 bg-black/30 text-[#f1d48b]">
              <FileText className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Important: installation depends on the full curtain system.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/70">
                The final result depends on the measurements, curtain design,
                fabric weight, heading style, track position and fixing method
                all working together. A premium installation protects those
                decisions and turns the curtain plan into a finished room.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {["Correct position", "Secure fixing", "Premium finish"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-semibold text-white"
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full journey links */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
                <Layers className="h-8 w-8" />
              </div>

              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
                Complete Service
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Follow the full curtain journey.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/65">
                This installation page is the final stage. You can also go back
                to the earlier stages to see how we measure, consult, design and
                make the curtains before fitting.
              </p>
            </div>

            <div className="grid gap-4">
              <Link
                href="/services/measure-consultation"
                className="group flex items-center justify-between gap-5 rounded-[28px] border border-white/10 bg-black/30 p-6 transition hover:border-[#E5C07B]/30 hover:bg-black/40"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d48b]">
                    Stage 01
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    Measure + Consultation
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Start with the window, measurements, room and practical
                    planning.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#f1d48b] transition group-hover:translate-x-1" />
              </Link>

              <Link
                href="/services/design-make-curtains"
                className="group flex items-center justify-between gap-5 rounded-[28px] border border-white/10 bg-black/30 p-6 transition hover:border-[#E5C07B]/30 hover:bg-black/40"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d48b]">
                    Stage 02
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    Design + Make Curtains
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Move into fabric, lining, heading, fullness and curtain
                    making.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#f1d48b] transition group-hover:translate-x-1" />
              </Link>

              <Link
                href="/services"
                className="group flex items-center justify-between gap-5 rounded-[28px] border border-[#E5C07B]/20 bg-[#E5C07B]/10 p-6 transition hover:border-[#E5C07B]/40 hover:bg-[#E5C07B]/15"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d48b]">
                    Overview
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    View All Services
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    See the complete Apex Curtains service structure.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#f1d48b] transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-[#E5C07B]/20 bg-[#E5C07B] p-8 text-center text-black shadow-[0_20px_80px_rgba(229,192,123,0.2)] sm:p-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready for a premium curtain finish?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/70">
            Start with a clear consultation and we’ll help guide the measuring,
            design, making and installation process from beginning to end.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/start-designing"
              className="inline-flex items-center justify-center rounded-full bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-black/85"
            >
              Start your Curtain Journey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <Link
              href="tel:08007720367"
              className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white/30 px-7 py-4 text-sm font-semibold text-black transition hover:bg-white/45"
            >
              Speak to us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}