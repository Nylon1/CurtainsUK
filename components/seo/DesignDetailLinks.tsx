import Link from "next/link";

const details = [
  {
    href: "/curtain-headings",
    title: "Curtain headings",
    text: "Compare wave, pinch pleat, pencil pleat and other heading directions.",
  },
  {
    href: "/curtain-linings",
    title: "Curtain linings",
    text: "Understand standard lining, blackout, thermal lining and interlining.",
  },
  {
    href: "/curtain-fabrics",
    title: "Curtain fabrics",
    text: "Explore weight, drape, pattern, light response and practical suitability.",
  },
  {
    href: "/curtain-accessories",
    title: "Curtain accessories",
    text: "See how tiebacks, tieback hooks and finishing details complete the scheme.",
  },
];

export default function DesignDetailLinks() {
  return (
    <section className="bg-apex-navy-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d6b56b]">
            Complete the curtain specification
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Heading, lining, fabric and finishing details all work together
          </h2>
          <p className="mt-5 text-base leading-8 text-[#C8D1D8]">
            The window shape is only one part of the design. The finished result also depends on how the curtain is headed, what it is made from, how it is lined and which finishing details are used.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {details.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[26px] border border-white/10 bg-[#1B405B] p-6 transition hover:border-[#d6b56b]/35 hover:-translate-y-0.5"
            >
              <h3 className="text-xl font-semibold text-[#F4F0E8]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#C8D1D8]">{item.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
