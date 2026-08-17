import { Mail, MapPin, Phone, Sparkles } from "lucide-react";
import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Window Types", href: "/window-types" },
  { label: "Gallery", href: "/gallery" },
  { label: "Advice", href: "/advice" },
  { label: "Areas", href: "/areas" },
  { label: "Contact", href: "/contact" },
  { label: "Start Your Curtain Journey", href: "/start-designing" },
];

const infoLinks = [
  { label: "Press & Media Enquiries", href: "/press" },
  { label: "Seen on TV", href: "/seen-on-tv" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms and Conditions", href: "/terms" },
  { label: "Cookies Policy", href: "/cookies" },
  { label: "Data Subject Request", href: "/data-request" },
];

const helpLinks = [
  {
    label: "Arlo | Smart Apex Window Curtain Advisor",
    href: "/arlo-curtain-advisor",
  },
  {
    label: "Measuring for Curtains for Apex Windows",
    href: "/advice/how-to-measure-for-apex-curtains",
  },
  {
    label: "Best Curtains for Apex Windows",
    href: "/advice/best-curtains-for-apex-windows-styles-that-actually-work",
  },
  {
    label: "Frequently Asked Questions",
    href: "/advice",
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/10 bg-apex-navy-950 text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[10%] top-[10%] h-40 w-40 rounded-full bg-[#f5d38a]/8 blur-[100px]" />
        <div className="absolute right-[10%] bottom-[10%] h-40 w-40 rounded-full bg-white/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.9fr_0.9fr_1fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold">
                AC
              </div>
              <div>
                <div className="text-lg font-semibold">Apex Curtains</div>
                <div className="text-sm text-white/55">
                  Apex, triangular & architectural windows
                </div>
              </div>
            </div>

            <p className="mt-6 max-w-md text-sm leading-8 text-white/65">
              Specialists in curtains for apex, angled, triangular and large
              architectural windows. Designed for difficult glazing, premium
              spaces and considered interiors.
            </p>

            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
              >
                <Sparkles className="h-4 w-4" />
                Get Expert Advice
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d38a]">
              Explore
            </h3>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition hover:text-[#f5d38a]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d38a]">
              Information
            </h3>
            <ul className="mt-5 space-y-3">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition hover:text-[#f5d38a]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d38a]">
              Popular Guides
            </h3>
            <ul className="mt-5 space-y-3">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition hover:text-[#f5d38a]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d38a]">
              Contact
            </h3>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 text-[#f5d38a]" />
                <div>
                  <div className="text-sm font-medium text-white">Call us</div>
                  <div className="text-sm text-white/65">0800 772 0367</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 text-[#f5d38a]" />
                <div>
                  <div className="text-sm font-medium text-white">Email</div>
                  <div className="text-sm text-white/65">
                    hello@apexcurtains.com
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 text-[#f5d38a]" />
                <div>
                  <div className="text-sm font-medium text-white">
                    Service Area
                  </div>
                  <div className="text-sm text-white/65">
                    Serving homes across the UK
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-sm font-medium text-white">
                Have a difficult window?
              </div>
              <p className="mt-2 text-sm leading-7 text-white/65">
                Upload your window details and we’ll guide you toward the most
                suitable curtain solution.
              </p>
              <div className="mt-4">
                <Link
                  href="/start-designing"
                  className="text-sm font-medium text-[#f5d38a] transition hover:text-white"
                >
                  Start your curtain journey →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-white/45">
          © {new Date().getFullYear()} Apex Curtains. All rights reserved.
        </div>
      </div>
    </footer>
  );
}