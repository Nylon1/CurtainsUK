import Link from "next/link";

export const metadata = {
  title:
    "Curtain Consultation Questions | Expert Advice for Apex & Shaped Windows",
  description:
    "Get clear answers during your curtain consultation. Learn what to ask about headings, linings, tracks, operation and finish for apex and shaped windows.",
};

export default function Page() {
  return (
   <main className="mx-auto max-w-5xl px-4 pb-16 pt-32 text-white sm:pt-36">
      <section>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Clear answers during your
          <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
            {" "}curtain consultation
          </span>
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70">
          A proper curtain consultation is not just about measuring and choosing
          fabric. It is also the moment to ask questions, understand your
          options and get clear advice on what will actually work for your
          window and room.
        </p>

        <div className="mt-8 rounded-2xl border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-6">
          <p className="text-white/85">
            Difficult windows often come with uncertainty. A good consultation
            removes confusion and helps you move forward with confidence.
          </p>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">
          What people usually want to know
        </h2>

        <p className="mt-4 text-white/70 leading-8">
          Most homeowners want practical answers, not jargon. During the visit,
          we explain the choices clearly so you understand how each decision
          affects the finished result.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-medium">Heading styles</h3>
            <p className="mt-2 text-sm leading-7 text-white/70">
              We explain the difference between wave, pencil pleat and pinch
              pleat, and which one best suits your room and window shape.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-medium">Lining options</h3>
            <p className="mt-2 text-sm leading-7 text-white/70">
              We talk through standard lining, blackout and thermal options,
              depending on privacy, warmth and light control.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-medium">Track systems</h3>
            <p className="mt-2 text-sm leading-7 text-white/70">
              We explain how tracks work on apex, angled and large windows, and
              what is realistic in your space.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="font-medium">Operation and finish</h3>
            <p className="mt-2 text-sm leading-7 text-white/70">
              We help you understand how the curtains will open, stack and sit
              once installed so there are no surprises later.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">
          Why this matters more for apex and shaped windows
        </h2>

        <p className="mt-4 text-white/70 leading-8">
          Standard windows are usually straightforward. Apex, triangular and
          feature glazing are not. The height, angles and architecture of the
          space mean that simple assumptions can lead to the wrong track, wrong
          heading or a finish that never feels quite right.
        </p>

        <p className="mt-4 text-white/70 leading-8">
          This is why a consultation should include real explanation, not just a
          quick quote. The better you understand the options, the better the
          final curtain scheme will be.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">
          Common questions we answer
        </h2>

        <ul className="mt-6 list-disc pl-6 text-white/70 leading-8">
          <li>Which heading style will look best in this room?</li>
          <li>Do I need blackout lining or standard lining?</li>
          <li>Can the curtains open properly on this shape of window?</li>
          <li>Should the curtains frame the whole space or just the glass?</li>
          <li>What kind of track is needed for this installation?</li>
          <li>Will the curtains look too heavy or too light in the room?</li>
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">
          A more confident decision
        </h2>

        <p className="mt-4 text-white/70 leading-8">
          The consultation is your chance to get clarity before committing. We
          want you to understand what is being recommended, why it suits the
          space and how it will look and function once fitted.
        </p>

        <p className="mt-4 text-white/70 leading-8">
          That confidence is what turns a difficult window into a well-planned,
          elegant curtain solution.
        </p>
      </section>

      <section className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-semibold">
          Get expert answers for your window
        </h2>

        <p className="mt-4 text-white/70 leading-8">
          If you have questions about headings, linings, track systems or how
          curtains will work on your shaped window, start your curtain journey
          and we’ll guide you properly.
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/start-designing"
            className="rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black hover:bg-[#e6c476]"
          >
            Start your curtain journey
          </Link>

          <Link
            href="/advice"
            className="rounded-full border border-white/15 px-6 py-3 text-sm text-white hover:bg-white/10"
          >
            View more guides
          </Link>
        </div>
      </section>
    </main>
  );
}
