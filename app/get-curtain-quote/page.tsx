import Link from "next/link";

export const metadata = {
  title: "Get a Curtain Quote | Apex Curtains",
  description:
    "Send your window details for a made-to-measure curtain quotation for apex, angled, triangular, gable-end and other difficult glazing.",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-apex-navy-950 px-4 pb-24 pt-32 text-white sm:px-6 lg:px-8 lg:pt-40">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">Get a quotation</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
          Tell us about the window and the curtain you want to create
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C8D1D8]">
          A useful quotation starts with the window shape, approximate size, room use and the result you want from the curtains. Photos are especially helpful for apex, triangular, gable-end and unusually tall glazing.
        </p>

        <section className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Window", "Send a clear photo and rough dimensions if you have them."],
            ["2", "Room need", "Tell us whether privacy, blackout, thermal comfort or mainly decoration matters."],
            ["3", "Design direction", "Share any thoughts on heading, fabric, lining, colour or accessories."],
            ["4", "Installation", "Mention height, access or unusual fixing conditions that may affect fitting."],
          ].map(([number, title, text]) => (
            <article key={number} className="rounded-[28px] border border-white/10 bg-[#1B405B] p-6">
              <span className="text-sm font-semibold text-[#d6b56b]">0{number}</span>
              <h2 className="mt-3 text-xl font-semibold text-[#F4F0E8]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7 sm:p-9">
            <h2 className="text-3xl font-semibold">Ready to send your project?</h2>
            <p className="mt-4 max-w-2xl leading-8 text-[#C8D1D8]">
              Start the curtain journey and upload the information you already have. You do not need a finished specification before contacting us — the design can be refined around the window and room.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/start-designing" className="rounded-full bg-[#d6b56b] px-6 py-3 text-sm font-semibold text-apex-navy-950">Start your curtain journey</Link>
              <a href="tel:08007720367" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold">Call 0800 772 0367</a>
            </div>
          </div>

          <aside className="rounded-[32px] border border-[#d6b56b]/25 bg-[#d6b56b]/10 p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d6b56b]">Want to explore first?</p>
            <h2 className="mt-4 text-2xl font-semibold">Build the curtain specification before requesting a quote</h2>
            <p className="mt-4 leading-8 text-[#C8D1D8]">
              Our design guide walks through window type, heading, fabric, lining, accessories, track and installation so you can understand the choices without guessing.
            </p>
            <Link href="/curtain-design-guide" className="mt-6 inline-flex rounded-full border border-[#d6b56b]/35 bg-[#d6b56b]/10 px-5 py-3 text-sm font-semibold text-[#F4F0E8]">
              Open the Curtain Design Guide
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
