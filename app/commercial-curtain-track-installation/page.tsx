import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Commercial Curtain & Track Installation UK | Airport Lounges, Hotels & Premium Interiors | Apex Curtains",
  description:
    "Apex Curtains provides commercial curtain and track installation for Manchester Airport lounge environments, airports, hotels, executive lounges, hospitality spaces and premium interiors across the UK. Site surveys, supply, installation, wave systems, voiles, blackout and RAMS available.",
};

const sectors = [
  "Airport lounges",
  "Executive lounges",
  "Hotels",
  "Hospitality interiors",
  "Offices and meeting rooms",
  "Private clinics",
  "Restaurants",
  "VIP and premium spaces",
];

const services = [
  "Site surveys and measuring",
  "Made-to-measure curtains",
  "Curtain track supply and installation",
  "Ceiling-mounted curtain tracks",
  "Wave curtain systems",
  "Voiles and sheer curtains",
  "Blackout curtain solutions",
  "Curved and bespoke track layouts",
  "Fabric guidance and specification support",
  "Curtain dressing and final handover",
];

const caseStudyDetails = [
  ["Project Type", "Commercial curtain and track installation"],
  ["Client Environment", "Manchester Airport lounge environment"],
  ["Location", "Manchester Airport"],
  ["Scope", "Survey, supply, installation and final dressing"],
];

const projectInfo = [
  {
    title: "The Brief",
    text: "The requirement was to provide a made-to-measure curtain and track solution suitable for a premium Manchester Airport lounge environment, with a finish that complemented the wider interior design and commercial setting.",
  },
  {
    title: "What We Delivered",
    text: "Apex Curtains supported the project with measuring, curtain and track supply, professional installation, ceiling track alignment, dressing and final finishing to create a clean commercial result.",
  },
  {
    title: "The Result",
    text: "The completed installation delivered a polished curtain finish suitable for a busy airport lounge setting, balancing visual impact, privacy, softness and commercial practicality.",
  },
];

const readiness = [
  {
    title: "Project Ready",
    text: "RAMS, risk assessments, method statements and public liability insurance details can be provided where required.",
  },
  {
    title: "Contractor Friendly",
    text: "We can coordinate with contractors, designers and site teams to clarify dimensions, access, fixing points, track requirements and installation sequencing.",
  },
  {
    title: "Premium Finish",
    text: "We focus on accurate measuring, suitable curtain systems, clean installation and final dressing for high-quality commercial interiors.",
  },
];

const faqItems = [
  {
    q: "Do you provide commercial curtain installation?",
    a: "Yes. Apex Curtains provides commercial curtain and track installation for airports, airport lounges, hotels, hospitality spaces, offices, private clinics and premium interiors across the UK.",
  },
  {
    q: "Have you worked at Manchester Airport?",
    a: "Yes. Apex Curtains has completed commercial curtain and track installation work for a Manchester Airport lounge environment.",
  },
  {
    q: "Can you work with fit-out contractors?",
    a: "Yes. We can work as a specialist curtain subcontractor for fit-out contractors, main contractors, designers, architects and project teams.",
  },
  {
    q: "Do you supply and install curtain tracks?",
    a: "Yes. We can supply and install curtain tracks, including ceiling-mounted tracks, wave curtain systems and bespoke track layouts depending on the project requirements.",
  },
  {
    q: "Do you provide RAMS and insurance details?",
    a: "For suitable commercial projects, RAMS, risk assessments, method statements and public liability insurance details can be provided where required.",
  },
  {
    q: "Can you price from drawings?",
    a: "Yes. We can review drawings, elevations, site photos or approximate dimensions and provide an initial supply-and-install estimate.",
  },
  {
    q: "Do you work nationwide?",
    a: "Yes. Apex Curtains can support commercial curtain and track projects across the UK, depending on project size, location and scope.",
  },
];

export default function CommercialCurtainTrackInstallationPage() {
  return (
    <main className="bg-apex-navy-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#c8a45d]/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#173b55_0%,#082b49_48%,#061a2d_100%)]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(135deg,#ffffff_0.5px,transparent_0.5px)] bg-[length:18px_18px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-[#c8a45d]">
            Apex Curtains Commercial
          </p>

          <h1 className="max-w-5xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Commercial Curtain & Track Installation for Airports, Hotels &
            Premium Interiors
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75">
            Specialist made-to-measure curtain and track packages for commercial
            fit-out projects across the UK. Apex Curtains supports contractors,
            designers, architects and commercial clients from site survey
            through to supply, installation, dressing and handover.
          </p>

         <div className="mt-10 flex flex-col gap-4 sm:flex-row">
  <Link
    href="/contact"
    className="rounded-full bg-[#c8a45d] px-7 py-3 text-sm font-semibold text-black transition hover:bg-[#e1be73]"
  >
    Request a Commercial Estimate
  </Link>

  <a
    href="/downloads/Apex-Curtains-Commercial-Project-Profile.pdf"
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-full border border-[#c8a45d]/60 px-7 py-3 text-sm font-semibold text-[#c8a45d] transition hover:bg-[#c8a45d]/10"
  >
    Download Project Profile
  </a>
</div>

          <div className="mt-12 grid gap-4 text-sm text-white/70 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#c8a45d]/20 bg-white/[0.03] p-5">
              Manchester Airport lounge project experience
            </div>
            <div className="rounded-2xl border border-[#c8a45d]/20 bg-white/[0.03] p-5">
              Supply, installation, tracks, voiles and blackout
            </div>
            <div className="rounded-2xl border border-[#c8a45d]/20 bg-white/[0.03] p-5">
              RAMS and public liability insurance available
            </div>
          </div>
        </div>
      </section>

      {/* Case Study */}
      <section className="border-y border-[#c8a45d]/20 bg-apex-navy-850">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
                Featured Case Study
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Manchester Airport Lounge Curtain & Track Installation
              </h2>

              <p className="mt-6 text-lg leading-8 text-white/75">
                Apex Curtains recently completed a commercial curtain and track
                installation for a Manchester Airport lounge environment. The
                project required a premium finish, accurate ceiling track
                alignment and careful coordination suitable for a high-footfall
                commercial setting.
              </p>

              <p className="mt-4 text-lg leading-8 text-white/75">
                This project demonstrates our ability to support airport lounge,
                hospitality and premium commercial interior projects where
                appearance, installation quality and coordination matter.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {caseStudyDetails.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#c8a45d]/25 bg-white/[0.03] p-5"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-[#c8a45d]">
                      {label}
                    </p>
                    <p className="mt-3 text-white/85">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#c8a45d]/30 bg-white/[0.03] p-4 shadow-2xl shadow-black/30">
              <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-white/10">
                <img
                  src="/images/commercial/airport-lounge-main.jpeg"
                  alt="Commercial curtain and track installation at Manchester Airport lounge"
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-white/60">
                Recent commercial curtain and track installation completed for a
                Manchester Airport lounge environment.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {projectInfo.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-7"
              >
                <h3 className="text-2xl font-semibold text-[#c8a45d]">
                  {item.title}
                </h3>
                <p className="mt-4 leading-7 text-white/70">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              [
                "/images/commercial/airport-lounge-track.jpeg",
                "Ceiling-mounted curtain track detail at Manchester Airport lounge",
              ],
              [
                "/images/commercial/airport-lounge-curtains.jpeg",
                "Made-to-measure commercial curtains installed at Manchester Airport lounge",
              ],
              [
                "/images/commercial/airport-lounge-finish.jpeg",
                "Final dressed curtains for Manchester Airport lounge interior",
              ],
            ].map(([src, alt]) => (
              <div
                key={src}
                className="overflow-hidden rounded-3xl border border-[#c8a45d]/20 bg-white/[0.03] p-3"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white/10">
                  <img
                    src={src}
                    alt={alt}
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-12 rounded-3xl border border-[#c8a45d]/30 bg-black/30 p-8 text-center">
  <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
    Commercial Project Profile
  </p>

  <h3 className="mt-4 text-3xl font-semibold text-white">
    View our commercial curtain and track project profile
  </h3>

  <p className="mx-auto mt-4 max-w-2xl leading-7 text-white/70">
    Download our short project profile covering commercial curtain and track
    installation for airport lounges, hotels, hospitality spaces and premium
    interiors.
  </p>

  <div className="mt-8">
    <a
      href="/downloads/Apex-Curtains-Commercial-Project-Profile.pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex rounded-full bg-[#c8a45d] px-7 py-3 text-sm font-semibold text-black transition hover:bg-[#e1be73]"
    >
      Download Commercial Project Profile
    </a>
  </div>
</div>

      {/* Sectors */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
              Commercial Sectors
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Curtain solutions for high-footfall commercial spaces
            </h2>
            <p className="mt-5 leading-7 text-white/65">
              We support projects where curtains and tracks need to look
              refined, function properly and fit into a wider commercial
              programme.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {sectors.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <p className="text-lg text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="border-y border-[#c8a45d]/20 bg-white/[0.03]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
                What We Provide
              </p>

              <h2 className="mt-4 text-3xl font-semibold">
                Curtain and track packages for fit-out contractors and designers
              </h2>

              <p className="mt-6 text-lg leading-8 text-white/75">
                We can work directly with commercial clients or as a specialist
                curtain subcontractor for fit-out contractors, interior
                designers, architects and main contractors.
              </p>

              <p className="mt-4 text-lg leading-8 text-white/75">
                Our role is to make the curtain package straightforward:
                practical advice, accurate measurements, suitable products,
                professional installation and a polished handover.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 text-white/85"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Readiness */}
      <section className="border-b border-[#c8a45d]/20 bg-apex-navy-850">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
            Project Readiness
          </p>

          <h2 className="mt-4 max-w-3xl text-3xl font-semibold">
            Commercial support for contractors, designers and project teams
          </h2>

          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {readiness.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[#c8a45d]/30 p-8"
              >
                <h3 className="text-2xl font-semibold text-[#c8a45d]">
                  {item.title}
                </h3>
                <p className="mt-4 leading-7 text-white/70">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h3 className="text-2xl font-semibold text-white">
              Available on request
            </h3>
            <p className="mt-4 leading-8 text-white/70">
              Public liability insurance details, RAMS, risk assessments, method
              statements, product guidance, fabric information and installation
              details can be provided where required for suitable commercial
              projects.
            </p>
          </div>
        </div>
      </section>

      {/* Project Support CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
            Project Support
          </p>

          <h2 className="mt-4 text-3xl font-semibold">
            Send drawings, site photos or dimensions
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/75">
            If you have an upcoming commercial project requiring curtains,
            voiles, blackout solutions or track installation, send us the
            available information and we can provide an initial review.
          </p>

          <ul className="mt-8 grid gap-3 text-white/80 sm:grid-cols-2">
            <li>Drawings or elevations</li>
            <li>Site photos</li>
            <li>Approximate widths and drops</li>
            <li>Ceiling height</li>
            <li>Track requirements</li>
            <li>Fabric or finish preferences</li>
            <li>Project location</li>
            <li>Timescale</li>
          </ul>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="rounded-full bg-[#c8a45d] px-7 py-3 text-sm font-semibold text-black transition hover:bg-[#e1be73]"
            >
              Send Project Details
            </Link>

            <a
              href="mailto:hello@apexcurtains.com?subject=Commercial curtain and track project enquiry"
              className="rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Email Project Details
            </a>
          </div>
        </div>
      </section>

{/* Who We Work With */}
<section className="border-y border-[#c8a45d]/20 bg-black/30">
  <div className="mx-auto max-w-7xl px-6 py-20">
    <div className="max-w-3xl">
      <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
        Who We Work With
      </p>

      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
        Supporting contractors, designers and commercial project teams
      </h2>

      <p className="mt-6 text-lg leading-8 text-white/70">
        Apex Curtains works with the teams responsible for delivering premium
        interiors, from early-stage specification through to supply,
        installation and final dressing.
      </p>
    </div>

    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {[
        {
          title: "Main Contractors",
          text: "Support for wider commercial fit-out and refurbishment projects requiring reliable curtain and track packages.",
        },
        {
          title: "Fit-Out Contractors",
          text: "Specialist curtain subcontractor support for lounges, hotels, hospitality spaces, offices and premium interiors.",
        },
        {
          title: "Interior Designers",
          text: "Guidance on heading styles, track systems, voiles, blackout options, fabric suitability and final presentation.",
        },
        {
          title: "Architects",
          text: "Practical input on curtain layouts, ceiling-mounted tracks, fixing considerations and specification support.",
        },
        {
          title: "Facilities Teams",
          text: "Replacement, upgrade and refurbishment support for existing commercial spaces and operational environments.",
        },
        {
          title: "Hotel Groups",
          text: "Made-to-measure curtains, tracks, voiles and blackout solutions for bedrooms, suites, lounges and hospitality areas.",
        },
        {
          title: "Lounge Operators",
          text: "Curtain and track solutions for airport lounges, executive lounges, VIP areas and high-footfall premium spaces.",
        },
        {
          title: "Commercial Clients",
          text: "Direct support for businesses needing a measured, supplied and professionally installed curtain package.",
        },
      ].map((item) => (
        <div
          key={item.title}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#c8a45d]/40 hover:bg-white/[0.05]"
        >
          <h3 className="text-xl font-semibold text-[#c8a45d]">
            {item.title}
          </h3>
          <p className="mt-4 leading-7 text-white/65">{item.text}</p>
        </div>
      ))}
    </div>

    <div className="mt-12 rounded-3xl border border-[#c8a45d]/30 bg-[#c8a45d]/10 p-8">
      <h3 className="text-2xl font-semibold text-white">
        A specialist curtain subcontractor for commercial interiors
      </h3>

      <p className="mt-4 max-w-4xl leading-8 text-white/70">
        Whether you are managing a full refurbishment, designing a premium
        interior or sourcing a reliable curtain and track specialist, Apex
        Curtains can support with site surveys, specification guidance,
        supply, installation, RAMS and public liability insurance details
        where required.
      </p>
    </div>
  </div>
</section>

{/* Commercial Packages */}
<section className="border-y border-[#c8a45d]/20 bg-apex-navy-850">
  <div className="mx-auto max-w-7xl px-6 py-20">
    <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
      Commercial Packages
    </p>

    <h2 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
      Flexible curtain and track support for commercial fit-out projects
    </h2>

    <div className="mt-12 grid gap-6 lg:grid-cols-4">
      {[
        {
          title: "Supply Only",
          text: "Made-to-measure curtains, tracks and accessories supplied to specification for contractors, designers and client teams.",
        },
        {
          title: "Supply & Install",
          text: "A complete measured, manufactured and professionally installed curtain and track package with final dressing.",
        },
        {
          title: "Design Support",
          text: "Guidance on headings, track types, voiles, blackout options, fullness, fabric suitability and final presentation.",
        },
        {
          title: "Project Support",
          text: "Support with site review, phasing, access, documentation, contractor coordination and commercial handover.",
        },
      ].map((item) => (
        <div
          key={item.title}
          className="rounded-3xl border border-[#c8a45d]/25 bg-white/[0.03] p-7"
        >
          <h3 className="text-2xl font-semibold text-[#c8a45d]">
            {item.title}
          </h3>
          <p className="mt-4 leading-7 text-white/70">{item.text}</p>
        </div>
      ))}
    </div>
  </div>
</section>

{/* Documentation Available */}
<section className="bg-black/40">
  <div className="mx-auto max-w-7xl px-6 py-20">
    <div className="rounded-[2rem] border border-[#c8a45d]/30 bg-white/[0.03] p-8 sm:p-10">
      <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
        Documentation Available
      </p>

      <h2 className="mt-4 text-3xl font-semibold text-white">
        Project-ready support for commercial sites
      </h2>

      <p className="mt-5 max-w-4xl leading-8 text-white/70">
        For suitable commercial projects, Apex Curtains can provide the
        documentation and practical information required by contractors, site
        teams and commercial clients.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "Public liability insurance details",
          "RAMS available on request",
          "Risk assessments",
          "Method statements",
          "Product and fabric guidance",
          "Installation details",
          "Site survey information",
          "Access and fixing considerations",
          "Contractor coordination",
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-black/30 p-5 text-white/75"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

{/* Why This Matters */}
<section className="border-y border-[#c8a45d]/20 bg-apex-navy-900">
  <div className="mx-auto max-w-7xl px-6 py-20">
    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
          Why It Matters
        </p>

        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Curtains can make or weaken the final finish
        </h2>
      </div>

      <div>
        <p className="text-lg leading-8 text-white/75">
          In premium commercial interiors, curtains are not an afterthought.
          They affect privacy, acoustics, light control, softness, zoning and
          the overall visual standard of the space.
        </p>

        <p className="mt-5 text-lg leading-8 text-white/75">
          A poorly specified curtain or track system can compromise an otherwise
          high-quality fit-out. Apex Curtains helps project teams get the
          details right, from track positioning and heading style through to
          fabric behaviour, fullness and final dressing.
        </p>
      </div>
    </div>
  </div>
</section>

{/* Project Types */}
<section className="bg-apex-navy-950">
  <div className="mx-auto max-w-7xl px-6 py-20">
    <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
      Project Types
    </p>

    <h2 className="mt-4 max-w-4xl text-3xl font-semibold text-white">
      Commercial curtain and track solutions for different environments
    </h2>

    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[
        "Airport lounge curtains",
        "Hotel bedroom curtains",
        "Executive suite curtains",
        "Hospitality voile curtains",
        "Blackout curtains for meeting rooms",
        "Ceiling-mounted curtain tracks",
        "Commercial wave curtain systems",
        "Privacy curtains for premium spaces",
        "Curtains for private clinics",
      ].map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/80"
        >
          {item}
        </div>
      ))}
    </div>
  </div>
</section>



      {/* FAQs */}
      <section className="bg-white text-black">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <p className="text-sm uppercase tracking-[0.3em] text-[#8c6b2f]">
            FAQs
          </p>

          <h2 className="mt-4 text-3xl font-semibold">
            Commercial Curtain Installation FAQs
          </h2>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.q}>
                <h3 className="text-xl font-semibold">{item.q}</h3>
                <p className="mt-3 leading-7 text-black/70">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-apex-navy-950 px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm uppercase tracking-[0.3em] text-[#c8a45d]">
            Apex Curtains Commercial
          </p>

          <h2 className="mt-4 text-3xl font-semibold sm:text-5xl">
            Need a specialist curtain and track subcontractor?
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70">
            Apex Curtains supports airport lounges, hotels, hospitality spaces,
            offices and premium interiors with made-to-measure curtain and track
            packages across the UK.
          </p>

          <div className="mt-10">
            <Link
              href="/contact"
              className="rounded-full bg-[#c8a45d] px-8 py-4 text-sm font-semibold text-black transition hover:bg-[#e1be73]"
            >
              Request a Commercial Estimate
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
