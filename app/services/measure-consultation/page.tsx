import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Palette,
  Hammer,
  Layers,
  Ruler,
  Home,
  Triangle,
  ShieldCheck,
  FileText,
  Phone,
  Sparkles,
} from "lucide-react";

const consultationIncludes = [
  {
    title: "Accurate measuring",
    text: "We take the key width, height, slope, fixing and drop measurements needed for made-to-measure curtain planning.",
    icon: Ruler,
  },
  {
    title: "Window assessment",
    text: "We look at the shape of the window, ceiling height, wall space, track position and any awkward angles.",
    icon: Triangle,
  },
  {
    title: "Room guidance",
    text: "We consider how the curtains will sit in the room, how they will stack, how they will open and how they will look from inside and outside.",
    icon: Home,
  },
  {
    title: "Practical advice",
    text: "We advise on suitable headings, track types, lining options, fabric weight and whether extra support or access equipment may be needed.",
    icon: ClipboardCheck,
  },
];

const measuredDetails = [
  "Overall window width",
  "Highest and lowest points",
  "Left and right side drops",
  "Apex or angled measurements",
  "Possible curtain stack-back space",
  "Track or pole fixing position",
  "Wall, ceiling or recess fixing options",
  "Floor clearance and finished curtain length",
  "Obstructions such as radiators, handles or beams",
  "Access requirements for high or awkward windows",
];

const suitableFor = [
  "Apex windows",
  "Gable end windows",
  "Angled windows",
  "Large feature windows",
  "Tall stairwell windows",
  "Double-height spaces",
  "Bay windows",
  "Patio and bifold doors",
  "Luxury living rooms",
  "New build homes",
  "Renovation projects",
  "Commercial feature windows",
];

const process = [
  {
    step: "01",
    title: "We understand your project",
    text: "We discuss your window type, room, preferred look, privacy needs, light control and the finish you want to achieve.",
  },
  {
    step: "02",
    title: "We inspect the window",
    text: "We check the width, height, slopes, ceiling line, fixing surfaces, access, obstructions and the best curtain position.",
  },
  {
    step: "03",
    title: "We take precise measurements",
    text: "We record the key dimensions needed to plan the curtain, track and finished drop properly before manufacture.",
  },
  {
    step: "04",
    title: "We advise on the best solution",
    text: "We explain suitable curtain headings, track styles, fabric direction, lining options and installation considerations.",
  },
  {
    step: "05",
    title: "We prepare the next step",
    text: "After the visit, we can prepare a clear recommendation or quotation based on the agreed style and project requirements.",
  },
];

export const metadata = {
  title: "Measure + Consultation | Apex Curtains",
  description:
    "Professional measuring and consultation service for apex, angled, gable end and made-to-measure curtain projects.",
};

export default function MeasureConsultationPage() {
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
                Professional Measuring Visit
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
                Measure + Consultation
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                A premium measuring and consultation service for shaped,
                angled, apex and made-to-measure curtain projects. We don't
                just measure the window, we assess the full space, the fixing
                options, the curtain design and the installation requirements.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/start-designing"
                  className="inline-flex items-center justify-center rounded-full bg-[#E5C07B] px-7 py-4 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  Book a Consultation
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
                  <ClipboardCheck className="h-8 w-8" />
                </div>

                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Why the measuring stage matters
                </h2>

                <p className="mt-4 text-sm leading-7 text-white/65">
                  With apex and shaped windows, small mistakes can affect the
                  finished curtain length, slope, stacking, track position and
                  overall appearance. A proper consultation helps avoid costly
                  errors before the curtains are made.
                </p>

                <div className="mt-7 space-y-4">
                  {[
                    "Better design decisions before manufacture",
                    "Clearer advice on fabric, lining and heading style",
                    "More accurate planning for difficult windows",
                    "A smoother installation stage later",
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

      {/* Includes */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              What We Check
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A detailed visit designed to remove guesswork.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              Every window is different. We check the shape, height, fixing
              points, room layout and practical limitations so your curtain
              project can be planned with confidence.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {consultationIncludes.map((item) => {
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

      {/* Detailed measurements */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Measured Details
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The details we look for during the visit.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              The goal is to gather enough information to plan the right curtain
              style, avoid design issues and make sure the finished product
              suits the window properly.
            </p>

            <div className="mt-8 rounded-[28px] border border-[#E5C07B]/20 bg-[#E5C07B]/10 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#f1d48b]" />
                <p className="text-sm leading-7 text-white/75">
                  For complex apex or gable end windows, a template or further
                  technical check may be recommended before manufacture,
                  especially where the final curtain shape must follow an angle
                  precisely.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {measuredDetails.map((item) => (
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
                Ideal for standard and complex curtain projects.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/65">
                Our consultation service is especially useful where the window
                is large, high, angled, unusual or where the final appearance
                needs careful planning.
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

      {/* Process */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Consultation Process
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              What happens during the visit.
            </h2>
          </div>

          <div className="mt-10 grid gap-4">
            {process.map((item) => (
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
                Important: measuring is not just about size.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/70">
                A curtain can be the correct size and still not be the right
                solution if the heading, track position, fabric weight, stack
                space or fixing method has not been planned properly. That is
                why our consultation looks at the complete curtain system, not
                just the measurements.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  "Correct position",
                  "Correct finish",
                  "Correct installation plan",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-semibold text-white"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Continue journey links */}
<section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
  <div className="mx-auto max-w-7xl rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-14">
    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <div>
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
          <Layers className="h-8 w-8" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
          Continue the Journey
        </p>

        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          After measuring, the next stage is design and making.
        </h2>

        <p className="mt-5 text-base leading-8 text-white/65">
          Once the window has been measured and assessed, we can move into the
          curtain design stage — choosing the right fabric, lining, heading,
          fullness and final finish.
        </p>
      </div>

      <div className="grid gap-4">
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
              Move into fabric, lining, heading, fullness and made-to-measure
              curtain planning.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-[#f1d48b] transition group-hover:translate-x-1" />
        </Link>

        <Link
          href="/services/premium-installation"
          className="group flex items-center justify-between gap-5 rounded-[28px] border border-white/10 bg-black/30 p-6 transition hover:border-[#E5C07B]/30 hover:bg-black/40"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f1d48b]">
              Stage 03
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Premium Installation
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              See how the curtains are fitted, checked, dressed and finished
              on site.
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
              Return to the full Apex Curtains service overview.
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
            Book your measuring consultation.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/70">
            We’ll help you understand the best curtain approach for your window,
            your room and the finish you want.
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