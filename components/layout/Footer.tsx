import { Mail, MapPin, Phone, Sparkles } from "lucide-react";
import Link from "next/link";

const exploreLinks = [
  { label: "Curtain Design Guide", href: "/curtain-design-guide" },
  { label: "Window Types", href: "/window-types" },
  { label: "Curtain Tracks", href: "/curtain-tracks" },
  { label: "Gallery", href: "/gallery" },
  { label: "Advice", href: "/advice" },
  { label: "Areas", href: "/areas" },
];

const specificationLinks = [
  { label: "Curtain Headings", href: "/curtain-headings" },
  { label: "Curtain Fabrics", href: "/curtain-fabrics" },
  { label: "Curtain Linings", href: "/curtain-linings" },
  { label: "Curtain Accessories", href: "/curtain-accessories" },
  { label: "Blackout, Thermal & Privacy", href: "/curtain-solutions" },
  { label: "Premium Installation", href: "/services/premium-installation" },
];

const helpLinks = [
  { label: "Professional Workspace", href: "/professionals/workspace/login" },
  { label: "Professional & Specifier Hub", href: "/professionals" },
  { label: "Ask Arlo", href: "/arlo-curtain-advisor" },
  { label: "Measure an Apex Window", href: "/advice/how-to-measure-for-apex-curtains" },
  { label: "Apex Curtain Pricing", href: "/advice/how-much-do-apex-window-curtains-cost-in-the-uk-full-2026-pricing-guide" },
  { label: "Frequently Asked Questions", href: "/faq" },
  { label: "Reviews", href: "/reviews" },
];

const infoLinks = [
  { label: "About Apex Curtains", href: "/about-apex-curtains" },
  { label: "Press & Media", href: "/press" },
  { label: "Seen on TV", href: "/seen-on-tv" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "Cookies Policy", href: "/cookies" },
];

function LinkGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d38a]">{title}</h3>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-white/70 transition hover:text-[#f5d38a]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/10 bg-apex-navy-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[10%] h-40 w-40 rounded-full bg-[#f5d38a]/8 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[10%] h-40 w-40 rounded-full bg-white/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold">AC</div>
              <div>
                <div className="text-lg font-semibold">Apex Curtains</div>
                <div className="text-sm text-white/55">Apex, triangular & architectural windows</div>
              </div>
            </div>

            <p className="mt-6 max-w-md text-sm leading-8 text-white/65">
              Specialist made-to-measure curtains and track systems for apex, angled, triangular, gable-end and unusually tall architectural glazing.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/curtain-design-guide" className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]">
                <Sparkles className="h-4 w-4" />
                Build your curtain specification
              </Link>
              <Link href="/start-designing" className="inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/5">
                Start your project
              </Link>
            </div>
          </div>

          <LinkGroup title="Explore" links={exploreLinks} />
          <LinkGroup title="Specification" links={specificationLinks} />
          <LinkGroup title="Help" links={helpLinks} />

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d38a]">Contact</h3>
            <div className="mt-5 space-y-4">
              <a href="tel:08007720367" className="flex items-start gap-3 text-sm text-white/70 transition hover:text-white">
                <Phone className="mt-1 h-4 w-4 shrink-0 text-[#f5d38a]" />
                <span><strong className="block font-medium text-white">Call us</strong>0800 772 0367</span>
              </a>
              <a href="mailto:hello@apexcurtains.com" className="flex items-start gap-3 text-sm text-white/70 transition hover:text-white">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-[#f5d38a]" />
                <span><strong className="block font-medium text-white">Email</strong>hello@apexcurtains.com</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-white/70">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#f5d38a]" />
                <span><strong className="block font-medium text-white">Service area</strong>Serving homes across the UK</span>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-sm font-medium text-white">Have a difficult window?</div>
              <p className="mt-2 text-sm leading-7 text-white/65">Send the shape, rough dimensions and a clear photo so the track and curtain route can be considered together.</p>
              <Link href="/start-designing" className="mt-4 inline-block text-sm font-medium text-[#f5d38a] transition hover:text-white">Start your curtain journey →</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 border-t border-white/10 pt-6 text-sm text-white/45 sm:grid-cols-[1fr_auto] sm:items-center">
          <span>© {new Date().getFullYear()} Apex Curtains. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {infoLinks.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-white">{link.label}</Link>)}
          </div>
        </div>
      </div>
    </footer>
  );
}
