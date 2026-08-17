import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Sparkles,
} from "lucide-react";

const faqs = [
  {
    question: "Can I send a photo instead of measuring everything myself?",
    answer:
      "Yes. In many cases, a clear photo is the best starting point. We can guide you on the most suitable next step from there.",
  },
  {
    question: "Do you help with apex, triangular and other unusual windows?",
    answer:
      "Yes. That is exactly where we add the most value. We specialise in shaped, angled and architectural glazing.",
  },
  {
    question: "Do I need to know which fabric or heading style I want?",
    answer:
      "No. We can guide you through fabrics, linings, heading styles and track options based on your room and priorities.",
  },
  {
    question: "What is the best way to get started?",
    answer:
      "The best route is to start your curtain journey and upload your window details. That gives us the clearest picture of your space.",
  },
];

export const metadata = {
  title: "Contact Apex Curtains",
  description:
    "Get expert advice for apex, triangular and architectural windows. Upload your window details, ask questions or start your curtain journey.",
};



export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[20%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-14 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Contact Apex Curtains
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Get expert advice for
            <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
              {" "}your window
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            Whether you have an apex window, triangular glazing or a large
            architectural space, we can help you understand the most suitable
            curtain solution and the best next step.
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <ContactCard
            icon={<ArrowRight className="h-5 w-5" />}
            eyebrow="Recommended"
            title="Start your curtain journey"
            text="The best option if you want tailored advice. Share your window type, priorities and photo so we can guide you properly."
            href="/start-designing"
            cta="Start now"
            highlighted
          />

          <ContactCard
            icon={<Camera className="h-5 w-5" />}
            eyebrow="Fast route"
            title="Upload your window details"
            text="If your window is unusual, a photo is often the quickest and clearest way to begin the conversation."
            href="/start-designing"
            cta="Upload details"
          />

          <ContactCard
            icon={<MessageSquare className="h-5 w-5" />}
            eyebrow="Need clarity?"
            title="Ask a few questions first"
            text="Not sure where to begin? Browse our guidance, see real projects and get a clearer idea before moving forward."
            href="/advice"
            cta="View advice"
          />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-10">
            <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
              Best ways to contact us
            </div>

            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Choose the route that suits you
            </h2>

           <div className="mt-8 grid gap-5 sm:grid-cols-2">
  <InfoPanel
    icon={<Phone className="h-5 w-5" />}
    title="Call for personalised advice"
    text="Ideal if you want to discuss your window and get a clearer sense of what may be possible."
    value="Call us"
    href="tel:08007720367"
  />

  <InfoPanel
    icon={<Mail className="h-5 w-5" />}
    title="Email your enquiry"
    text="Useful if you want to send photos, notes or a quick overview of your room and window."
    value="Send details"
    href="mailto:hello@apexcurtains.com?subject=Curtain%20Enquiry"
  />

  <InfoPanel
    icon={<Camera className="h-5 w-5" />}
    title="Send a window photo"
    text="Often the most useful first step for apex, angled and architectural windows."
    value="Upload photo"
    href="/get-curtain-quote"
  />

  <InfoPanel
    icon={<MapPin className="h-5 w-5" />}
    title="UK-wide enquiries"
    text="We work with shaped and unusual windows across the UK, including premium coastal and architectural homes."
    value="Across the UK"
    href="/areas"
  />
</div>

            <div className="mt-8 rounded-[26px] border border-[#f5d38a]/15 bg-[#f5d38a]/8 p-6">
              <div className="text-sm font-medium text-white">
                The clearest route is usually the best route.
              </div>
              <p className="mt-3 text-sm leading-8 text-white/70">
                If your window is difficult to explain, do not worry about
                getting everything perfect. A photo and a few details are often
                enough to start the conversation properly.
              </p>
            </div>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-10">
            <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
              Why clients contact us
            </div>

            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              For difficult windows and considered advice
            </h2>

            <div className="mt-8 space-y-5">
              <BenefitRow text="Apex, triangular and gable end specialists" />
              <BenefitRow text="Practical guidance on fabrics, headings and linings" />
              <BenefitRow text="Support for shaped and architectural glazing" />
              <BenefitRow text="Visual guidance through real projects and examples" />
              <BenefitRow text="A calmer, more informed route into your curtain design" />
            </div>

            <div className="mt-10 rounded-[26px] border border-white/10 bg-black/20 p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Suggested next step
              </div>
              <p className="mt-3 text-sm leading-8 text-white/70">
                If you are serious about moving forward, start your curtain
                journey and upload your window details. That gives us the best
                foundation for tailored advice.
              </p>

              <div className="mt-6">
                <Link
                  href="/start-designing"
                  className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
                >
                  Start your curtain journey
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <LinkPanel
            eyebrow="See real work"
            title="Explore our gallery"
            text="See how apex, angled and architectural windows have been resolved in real homes."
            href="/gallery"
            cta="View gallery"
          />

          <LinkPanel
            eyebrow="Need inspiration?"
            title="Read expert advice"
            text="Browse practical guides on measuring, track systems, fabrics and curtain planning."
            href="/advice"
            cta="Browse advice"
          />
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-10">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Frequently asked questions
          </div>

          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Common questions before getting in touch
          </h2>

          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-[24px] border border-white/10 bg-black/20 p-6"
              >
                <h3 className="text-lg font-semibold text-white">
                  {faq.question}
                </h3>
                <p className="mt-3 text-sm leading-8 text-white/70">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-white/10 pt-8 text-center">
            <p className="mx-auto max-w-2xl text-base leading-8 text-white/62">
              No pressure, no guesswork — just clearer advice on the most
              suitable curtain solution for your space.
            </p>

            <div className="mt-6">
              <Link
                href="/start-designing"
                className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-7 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
              >
                Start your enquiry
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactCard({
  icon,
  eyebrow,
  title,
  text,
  href,
  cta,
  highlighted = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-[30px] border p-7 shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 ${
        highlighted
          ? "border-[#f5d38a]/30 bg-[linear-gradient(180deg,rgba(245,211,138,0.12),rgba(255,255,255,0.04))]"
          : "border-white/10 bg-white/[0.04] hover:border-[#f5d38a]/20"
      }`}
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-[#f5d38a]">
        {icon}
      </div>

      <div className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#f5d38a]">
        {eyebrow}
      </div>

      <h3 className="mt-3 text-2xl font-semibold leading-tight text-white transition group-hover:text-[#f5d38a]">
        {title}
      </h3>

      <p className="mt-4 text-sm leading-8 text-white/70">{text}</p>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#f5d38a]">
        {cta}
        <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function InfoPanel({
  icon,
  title,
  text,
  value,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[24px] border border-white/10 bg-black/20 p-5 transition duration-300 hover:-translate-y-1 hover:border-[#f5d38a]/20 hover:bg-white/[0.03]"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-[#f5d38a]">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-white transition group-hover:text-[#f5d38a]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-white/70">{text}</p>

      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#f5d38a]">
        {value}
        <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function BenefitRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#f5d38a]" />
      <p className="text-sm leading-7 text-white/75">{text}</p>
    </div>
  );
}

function LinkPanel({
  eyebrow,
  title,
  text,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[30px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#f5d38a]/20"
    >
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#f5d38a]">
        {eyebrow}
      </div>

      <h3 className="mt-3 text-2xl font-semibold leading-tight text-white transition group-hover:text-[#f5d38a]">
        {title}
      </h3>

      <p className="mt-4 text-sm leading-8 text-white/70">{text}</p>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#f5d38a]">
        {cta}
        <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}