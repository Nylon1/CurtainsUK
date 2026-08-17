import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Palette,
  Hammer,
  Sparkles,
} from "lucide-react";

const services = [
  {
    title: "Measure + Consultation",
    href: "/services/measure-consultation",
    description:
      "We visit your home, understand your window shape, check the practical details, and guide you towards the right curtain solution.",
    icon: ClipboardCheck,
    points: [
      "Professional measuring visit",
      "Advice for apex, angled and shaped windows",
      "Fabric, lining and track guidance",
    ],
  },
  {
    title: "Design + Make Curtains",
    href: "/services/design-make-curtains",
    description:
      "Your curtains are carefully designed and made to suit your window, room, fabric choice and finished look.",
    icon: Palette,
    points: [
      "Made-to-measure curtain design",
      "Premium fabrics, linings and finishes",
      "Hand-finished details where required",
    ],
  },
  {
    title: "Premium Installation",
    href: "/services/premium-installation",
    description:
      "Our installation service is built for difficult windows, high ceilings and premium homes where detail matters.",
    icon: Hammer,
    points: [
      "Specialist curtain track fitting",
      "High and awkward window installation",
      "Neat, careful and professional finish",
    ],
  },
];

export const metadata = {
  title: "Curtain Services | Apex Curtains",
  description:
    "Premium made-to-measure curtain services including measuring, consultation, curtain design, making and specialist installation for apex and shaped windows.",
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-apex-navy-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 lg:px-8 lg:pb-28 lg:pt-44">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#E5C07B]/20 blur-[130px]" />
          <div className="absolute right-0 top-40 h-[360px] w-[360px] rounded-full bg-white/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-[#E5C07B]/10 blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-[#E5C07B]/25 bg-[#E5C07B]/10 px-4 py-2 text-sm font-medium text-[#f1d48b]">
              <Sparkles className="mr-2 h-4 w-4" />
              Premium Curtain Services
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
              From first measure to final fitting.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-8 text-white/70 sm:text-lg">
              Apex Curtains provides a complete made-to-measure service for
              elegant, difficult and statement windows, including consultation,
              design, curtain making and specialist installation.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/start-designing"
                className="inline-flex items-center justify-center rounded-full bg-[#E5C07B] px-7 py-4 text-sm font-semibold text-black transition hover:brightness-110"
              >
                Start your Curtain Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <Link
                href="/arlo-curtain-advisor"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ask Arlo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Service Cards */}
      <section className="relative px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <Link
                  key={service.title}
                  href={service.href}
                  className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#E5C07B]/35 hover:bg-white/[0.07]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E5C07B]/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

                  <div className="relative">
                    <div className="mb-7 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5C07B]/25 bg-[#E5C07B]/10 text-[#f1d48b]">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      {service.title}
                    </h2>

                    <p className="mt-4 text-sm leading-7 text-white/65">
                      {service.description}
                    </p>

                    <div className="mt-7 space-y-3">
                      {service.points.map((point) => (
                        <div
                          key={point}
                          className="flex items-start gap-3 text-sm text-white/75"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f1d48b]" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 inline-flex items-center text-sm font-semibold text-[#f1d48b]">
                      View service
                      <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Premium Process */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[40px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10 lg:p-14">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#f1d48b]">
                Our Process
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                A calm, guided service for complex curtain projects.
              </h2>

              <p className="mt-5 text-base leading-8 text-white/65">
                Shaped windows need more than a quick quote. We look at the
                window, the room, the height, the track position, the fabric
                choice and the finished appearance before recommending the right
                approach.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Consult",
                  text: "We understand your window, room and practical needs.",
                },
                {
                  step: "02",
                  title: "Create",
                  text: "Your curtains are designed and made to measure.",
                },
                {
                  step: "03",
                  title: "Install",
                  text: "We fit everything carefully for a premium finish.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-[28px] border border-white/10 bg-black/30 p-6"
                >
                  <div className="mb-5 text-sm font-semibold text-[#f1d48b]">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-[#E5C07B]/20 bg-[#E5C07B] p-8 text-center text-black shadow-[0_20px_80px_rgba(229,192,123,0.2)] sm:p-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to plan your curtains?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/70">
            Start with a guided consultation and we’ll help you choose the right
            curtain style, fabric, lining and installation approach.
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