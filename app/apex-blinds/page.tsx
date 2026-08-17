import Link from "next/link";

export const metadata = {
  title: "Apex Blinds or Curtains? | Apex Curtains",
  description:
    "Current guidance from Apex Curtains on blinds versus curtains for apex and triangular windows, including why curtains are our preferred solution for difficult architectural glazing.",
  alternates: {
    canonical: "https://www.apexcurtains.com/apex-blinds",
  },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
          Apex window guidance
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
          Apex blinds or curtains?
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
          For difficult apex, triangular and gable-end glazing, curtains are now our preferred solution. We no longer promote electric apex blinds as a standard Apex Curtains service because shaped blind systems can introduce additional complexity around operation, servicing and long-term reliability.
        </p>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <article className="rounded-[30px] border border-white/10 bg-[#1B405B] p-7">
            <h2 className="text-2xl font-semibold text-[#F4F0E8]">Why we usually recommend curtains</h2>
            <p className="mt-4 leading-8 text-[#C8D1D8]">
              Curtains can be designed around the geometry of the window while also giving more flexibility over fabric, heading, lining, privacy, softness and stack-back. The final specification still depends on the window shape, fixing conditions and how the room needs to work.
            </p>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
            <h2 className="text-2xl font-semibold">What if you specifically want blinds?</h2>
            <p className="mt-4 leading-8 text-[#C8D1D8]">
              We can still help you assess the window and explain the trade-offs, but the core Apex Curtains service is focused on made-to-measure curtains and specialist track systems rather than electric shaped blinds.
            </p>
          </article>
        </section>

        <section className="mt-10 rounded-[32px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7 sm:p-9">
          <h2 className="text-3xl font-semibold">Start with the window, not the product</h2>
          <p className="mt-4 max-w-3xl leading-8 text-[#C8D1D8]">
            A photo and rough dimensions are enough to begin. We can then guide you through the window type, track route, heading, fabric and lining before a final specification is agreed.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/start-designing"
              className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950"
            >
              Start your curtain journey
            </Link>
            <Link
              href="/curtain-design-guide"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold"
            >
              Open the Curtain Design Guide
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
