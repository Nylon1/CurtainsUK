import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Palette,
  Scissors,
  Layers,
  Hammer,
  Ruler,
  Sparkles,
  Shirt,
  ShieldCheck,
  FileText,
  Phone,
  Wand2,
} from "lucide-react";

const designIncludes = [
  {
    title: "Curtain style guidance",
    text: "We help you choose a curtain style that suits the window shape, room, height, fabric and final look you want.",
    icon: Palette,
  },
  {
    title: "Made-to-measure planning",
    text: "Every curtain is planned around the actual measurements, stack space, track position and finished drop.",
    icon: Ruler,
  },
  {
    title: "Fabric + lining advice",
    text: "We advise on fabric weight, lining, blackout, interlining and practical performance before the curtains are made.",
    icon: Layers,
  },
  {
    title: "Careful curtain making",
    text: "Your curtains are made with attention to proportion, heading style, hems, joins, fullness and the finished presentation.",
    icon: Scissors,
  },
];

const designChecks = [
  "Window shape and curtain drop",
  "Room style and desired finish",
  "Fabric weight and suitability",
  "Curtain fullness and gather",
  "Heading style and visual appearance",
  "Lining, blackout or interlining needs",
  "Track or pole compatibility",
  "Curtain stack-back space",
  "Left/right opening requirements",
  "Floor clearance and hem allowance",
  "Pattern direction or pattern matching",
  "Practical daily use and maintenance",
];

const headingOptions = [
  {
    title: "Wave Curtains",
    text: "A clean, modern look with smooth, consistent folds. Excellent for wide windows, contemporary spaces and premium finishes.",
  },
  {
    title: "Double Pinch Pleat",
    text: "A structured, elegant heading with a luxurious tailored feel. Ideal for formal rooms and high-end interiors.",
  },
  {
    title: "Pencil Pleat",
    text: "A flexible traditional heading that works well in many homes and can suit both standard and shaped curtain projects.",
  },
  {
    title: "Single Pleat",
    text: "A neat, simple tailored heading that gives a refined finish without feeling too heavy or formal.",
  },
];

const makingProcess = [
  {
    step: "01",
    title: "Design direction",
    text: "We agree the overall curtain look, including the room style, fabric direction, desired finish, heading type and practical requirements.",
  },
  {
    step: "02",
    title: "Fabric and lining selection",
    text: "We help choose suitable fabric, lining and finishing options based on appearance, light control, privacy, insulation and how the curtain needs to hang.",
  },
  {
    step: "03",
    title: "Curtain specification",
    text: "We plan the finished size, heading, fullness, drop, hems, joins, stack space and any details needed for the window shape.",
  },
  {
    step: "04",
    title: "Making and finishing",
    text: "The curtains are made to the agreed specification, with care taken over the heading, seams, hems, lining and finished presentation.",
  },
  {
    step: "05",
    title: "Preparation for installation",
    text: "Before fitting, the curtain design is checked against the installation plan so everything is ready for a clean, premium final result.",
  },
];

const fabricConsiderations = [
  "How the fabric hangs",
  "How much light the room receives",
  "Whether privacy is needed",
  "Whether blackout is important",
  "How heavy the curtain will be",
  "Whether the track can support the weight",
  "How the fabric looks in daylight",
  "How the fabric looks under evening lighting",
  "Whether the curtain needs interlining",
  "Whether the room needs warmth or softness",
  "Whether the curtain is decorative or functional",
  "Whether a shaped template is needed",
];

export const metadata = {
  title: "Design + Make Curtains | Apex Curtains",
  description:
    "Premium made-to-measure curtain design and making service for apex, angled, gable end and specialist curtain projects.",
};

export default function DesignMakeCurtainsPage() {
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
                Premium Curtain Design + Making
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
                Design + Make Curtains
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                A complete made-to-measure curtain design and making service for
                elegant homes, shaped windows and premium interiors. We help
                plan the curtain style, fabric, lining, heading, fullness and
                finished detail so the final result feels considered, balanced
                and beautifully made.
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
                  <Palette className="h-8 w-8" />
                </div>

                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Designed before they are made
                </h2>

                <p className="mt-4 text-sm leading-7 text-white/65">
                  Premium curtains should not be guessed. The design stage
                  decides how the curtain will hang, how full it will look, how
                  the fabric behaves, how the lining performs and how the whole
                  window will feel when finished.
                </p>

                <div className="mt-7 space-y-4">
                  {[
                    "Curtains planned around the actual window",
                    "Fabric and lining chosen for the room",
                    "Heading selected for the desired finish",
                    "Made with careful attention to detail",
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
              What We Design
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              A curtain design service built around the window and the room.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              The right curtain is a balance of style and technical planning.
              We consider appearance, function, fabric behaviour, lining,
              heading style and installation before the making stage begins.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {designIncludes.map((item) => {
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

      {/* Design checks */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Design Checks
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The details we consider before making.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              A luxury curtain project needs proper decisions before fabric is
              cut. These checks help the curtain look right, hang correctly and
              suit the practical needs of the space.
            </p>

            <div className="mt-8 rounded-[28px] border border-[#E5C07B]/20 bg-[#E5C07B]/10 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#f1d48b]" />
                <p className="text-sm leading-7 text-white/75">
                  For angled, apex or gable end curtains, the design must also
                  respect the slope, top shape, track position and how the
                  curtain will open and stack once installed.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {designChecks.map((item) => (
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

      {/* Heading options */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
                Curtain Headings
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                The heading changes the whole look of the curtain.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/65">
                The heading affects fullness, structure, movement and the final
                appearance. We help select the right option based on the room,
                track, fabric and desired finish.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {headingOptions.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-white/10 bg-black/30 p-6"
                >
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
        </div>
      </section>

      {/* Fabric and lining */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="grid gap-3 sm:grid-cols-2">
            {fabricConsiderations.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f1d48b]" />
                <span className="text-sm leading-6 text-white/75">{item}</span>
              </div>
            ))}
          </div>

          <div className="rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Fabric + Lining
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Fabric choice is not just about colour.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              Fabric affects the weight, drape, light control, warmth, privacy
              and overall feel of the room. Lining can change how the curtain
              performs, how it hangs and how it looks from outside the home.
            </p>

            <div className="mt-8 rounded-[28px] border border-[#E5C07B]/20 bg-[#E5C07B]/10 p-5">
              <div className="flex gap-3">
                <Layers className="mt-1 h-5 w-5 shrink-0 text-[#f1d48b]" />
                <p className="text-sm leading-7 text-white/75">
                  For premium projects, we may recommend blackout lining,
                  interlining, bonded lining or specialist lining depending on
                  the room, fabric and level of finish required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Making process */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
              Making Process
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              How your curtains are designed and made.
            </h2>

            <p className="mt-5 text-base leading-8 text-white/65">
              We keep the process clear, structured and easy to understand so
              you know what decisions are being made and why they matter.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {makingProcess.map((item) => (
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
                Important: the making stage depends on the design stage.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/70">
                The final curtain is only as good as the decisions made before
                cutting and sewing. Fullness, lining, heading, fabric weight,
                track position and finished length all need to work together.
                That is why we treat design and making as one connected
                service.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {["Correct fabric", "Correct heading", "Correct finish"].map(
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

      {/* Premium result */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
                <Wand2 className="h-8 w-8" />
              </div>

              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
                The Final Result
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Curtains that feel made for the room, not just the window.
              </h2>
            </div>

            <div>
              <p className="text-base leading-8 text-white/65">
                Our aim is to create curtains that feel natural in the space.
                They should suit the architecture, soften the room, frame the
                window properly and deliver the practical benefits you need,
                whether that is privacy, warmth, blackout, elegance or a more
                complete interior finish.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  "Balanced proportions",
                  "Premium handmade feel",
                  "Suitable fabric and lining",
                  "Designed for real daily use",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4"
                  >
                    <Shirt className="mt-0.5 h-5 w-5 shrink-0 text-[#f1d48b]" />
                    <span className="text-sm leading-6 text-white/75">
                      {item}
                    </span>
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
            Ready to design your curtains?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/70">
            Start with your window type, room and preferred look, we’ll help
            guide the curtain design, fabric, lining and making details.
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
              href="/services/premium-installation"
              className="inline-flex items-center justify-center rounded-full border border-black/15 bg-white/30 px-7 py-4 text-sm font-semibold text-black transition hover:bg-white/45"
            >
              Next: Premium Installation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}