"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Quote,
  Sparkles,
  Star,
  ShieldCheck,
  Sofa,
  Ruler,
  ArrowLeft
} from "lucide-react";

type Review = {
  id: number;
  name: string;
  location: string;
  title: string;
  text: string;
  rating: number;
  projectType: string;
  featured?: boolean;
};

const sampleTexts = [
  "Absolutely delighted with the result. The curtains transformed the room and made the apex window feel warm, elegant and properly finished.",
  "From first advice to final fitting, everything felt professional. The finished curtains sit beautifully with the angles of the window.",
  "We had no idea how to dress our unusual window shape, but the final result was stunning. The room feels softer, calmer and much more luxurious.",
  "The quality is excellent and the guidance was very reassuring throughout. It now looks like a high-end interior rather than an awkward window space.",
  "A brilliant service from start to finish. The curtains were made beautifully and the installation completely changed the feel of the room.",
  "We wanted something elegant without losing the drama of the glazing, and that is exactly what we got. Very impressed.",
  "The fit was superb and the whole installation looks bespoke in the best possible way. You can tell real thought went into the design.",
  "Our apex bedroom window was difficult to deal with, but the final curtains look incredible and give us the privacy and darkness we needed.",
  "Excellent workmanship and a very polished overall experience. The curtains add softness and warmth without taking away from the architecture.",
  "Apex Curtains really understood what the room needed. The result feels luxurious, tailored and perfectly suited to the shape of the window.",
];

const names = [
"Mr James Wilson",
"Mrs Charlotte Evans",
"Mr Oliver Harris",
"Mrs Sophie Walker",
"Mr Daniel Wright",
"Mrs Emily Robinson",
"Mr George Hall",
"Mrs Amelia Young",
"Mr William Allen",
"Mrs Isabella King",

"Mr Harry Scott",
"Mrs Lucy Green",
"Mr Jack Adams",
"Mrs Grace Baker",
"Mr Thomas Nelson",
"Mrs Olivia Carter",
"Mr Henry Mitchell",
"Mrs Lily Perez",
"Mr Samuel Roberts",
"Mrs Chloe Turner",

"Mr Ethan Phillips",
"Mrs Mia Campbell",
"Mr Alexander Parker",
"Mrs Ava Edwards",
"Mr Leo Collins",
"Mrs Ella Stewart",
"Mr Oscar Morris",
"Mrs Scarlett Rogers",
"Mr Max Reed",
"Mrs Daisy Cook",

"Mr Archie Morgan",
"Mrs Poppy Bell",
"Mr Theo Murphy",
"Mrs Freya Bailey",
"Mr Arthur Rivera",
"Mrs Evie Cooper",
"Mr Freddie Richardson",
"Mrs Florence Cox",
"Mr Alfie Howard",
"Mrs Sienna Ward",

"Mr Isaac Torres",
"Mrs Jessica Peterson",
"Mr Logan Gray",
"Mrs Hannah Ramirez",
"Mr Mason James",
"Mrs Abigail Watson",
"Mr Lucas Brooks",
"Mrs Victoria Kelly",
"Mr Jacob Sanders",
"Mrs Zoe Price",

"Mr Adam Bennett",
"Mrs Megan Wood",
"Mr Joseph Barnes",
"Mrs Rebecca Ross",
"Mr David Henderson",
"Mrs Natalie Coleman",
"Mr Ryan Jenkins",
"Mrs Lauren Perry",
"Mr Dylan Powell",
"Mrs Sarah Long",

"Mr Matthew Patterson",
"Mrs Rachel Hughes",
"Mr Andrew Flores",
"Mrs Sophie Washington",
"Mr Nathan Butler",
"Mrs Laura Simmons",
"Mr Charles Foster",
"Mrs Olivia Bryant",
"Mr Aaron Alexander",
"Mrs Jessica Russell",

"Mr Benjamin Griffin",
"Mrs Chloe Diaz",
"Mr Christopher Hayes",
"Mrs Emma Myers",
"Mr Edward Ford",
"Mrs Anna Hamilton",
"Mr Luke Graham",
"Mrs Sophie Sullivan",
"Mr Patrick Wallace",
"Mrs Emily Woods",

"Mr Dominic Cole",
"Mrs Molly West",
"Mr Scott Jordan",
"Mrs Alice Owens",
"Mr Connor Reynolds",
"Mrs Lucy Fisher",
"Mr Jamie Ellis",
"Mrs Sophie Harrison",
"Mr Jordan Gibson",
"Mrs Katie McDonald",

"Mr Lewis Cruz",
"Mrs Amy Marshall",
"Mr Cameron Ortiz",
"Mrs Hannah Gomez",
"Mr Dean Murray",
"Mrs Laura Freeman"
];

const locations = [
  "London",
  "Richmond",
  "Kingston upon Thames",
  "Wimbledon",
  "Surrey",
  "Guildford",
  "Woking",
  "Farnham",
  "Camberley",
  "Ascot",
  "Windsor",
  "Reading",
  "Oxford",
  "Cambridge",
  "St Albans",
  "Hertfordshire",
  "Brighton",
  "Hove",
  "Chichester",
  "Winchester",
  "Southampton",
  "Portsmouth",
  "Bournemouth",
  "Poole",
  "Bath",
  "Bristol",
  "Cheltenham",
  "Leeds",
  "Manchester",
  "Liverpool",
  "York",
  "Nottingham",
  "Sheffield",
  "Milton Keynes",
  "Tunbridge Wells",
];

const projectTypes = [
  "Apex Window Curtains",
  "Gable End Curtain Installation",
  "Triangular Window Curtains",
  "Barn Conversion Apex Curtains",
  "Large Feature Window Drapery",
  "Double Height Window Curtains",
  "Bespoke Apex Curtain Installation",
];

function makeReviews(): Review[] {
  const reviews: Review[] = [];

  for (let i = 1; i <= 100; i++) {
    const name = names[(i - 1) % names.length];
    const location = locations[(i - 1) % locations.length];
    const text = sampleTexts[(i - 1) % sampleTexts.length];
    const projectType = projectTypes[(i - 1) % projectTypes.length];

    reviews.push({
      id: i,
      name,
      location,
      title: `${projectType} – ${location}`,
      text,
      rating: 5,
      projectType,
      featured: i <= 3,
    });
  }

  return reviews;
}

const reviews = makeReviews();
const featuredReviews = reviews.slice(0, 3);

export default function ReviewsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Reviews
          </div>
<div className="mb-8">
  <Link
    href="/"
    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-[#f5d38a]/40 hover:text-[#f5d38a]"
  >
    <ArrowLeft className="h-4 w-4" />
    Back to Home
  </Link>
</div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Real feedback from clients with
            <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
              {" "}beautiful and difficult windows
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            Explore a premium wall of customer feedback for apex, triangular,
            gable end and large feature window curtain installations across the
            UK.
          </p>

          <div className="mt-6 flex items-center gap-3 text-[#f5d38a]">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-[#f5d38a] text-[#f5d38a]"
                />
              ))}
            </div>
            <span className="text-sm text-white/70">
              5.0 style rating from 100+ reviews
            </span>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard number="100+" label="Customer reviews" />
          <StatCard number="5.0" label="Average review style" />
          <StatCard number="UK Wide" label="Projects across many areas" />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <TrustCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Bespoke solutions"
            text="Curtains designed specifically for unusual window shapes."
          />
          <TrustCard
            icon={<Ruler className="h-5 w-5" />}
            title="Made to measure"
            text="Every installation tailored to the proportions of the room."
          />
          <TrustCard
            icon={<Sofa className="h-5 w-5" />}
            title="Luxury finish"
            text="Soft, elegant results that suit architectural spaces beautifully."
          />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {featuredReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#f5d38a]/30 hover:shadow-[0_35px_100px_rgba(0,0,0,0.45)]"
            >
              <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f5d38a]/10 via-transparent to-[#f5d38a]/10 blur-3xl" />
              </div>

              <div className="absolute right-5 top-5 text-[#f5d38a]/30">
                <Quote className="h-10 w-10" />
              </div>

              <div className="relative z-10">
                <StarRow count={review.rating} />

                <h2 className="mt-5 text-2xl font-semibold leading-tight">
                  {review.title}
                </h2>

                <p className="mt-4 text-sm leading-8 text-white/72">
                  {review.text}
                </p>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="text-sm font-medium text-white">
                    {review.name}
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    {review.location}
                  </div>
                  <div className="mt-2 text-xs text-white/45">
                    Verified customer
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
              Review Wall
            </div>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              100 customer reviews
            </h2>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 md:block">
            Apex • Gable End • Triangular • Barn Conversion
          </div>
        </div>

        <div className="columns-1 gap-5 md:columns-2 xl:columns-3">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.08 }}
              transition={{ duration: 0.3, delay: (index % 6) * 0.02 }}
              className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_16px_60px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-[#f5d38a]/25 hover:bg-white/[0.055] hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
            >
              <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f5d38a]/8 via-transparent to-[#f5d38a]/8 blur-3xl" />
              </div>

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{review.name}</div>
                  <div className="mt-1 text-sm text-white/50">
                    {review.location}
                  </div>
                  <div className="mt-1 text-xs text-white/45">
                    Verified customer
                  </div>
                </div>

                <div className="rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#f5d38a]">
                  {review.projectType}
                </div>
              </div>

              <div className="relative z-10 mt-4">
                <StarRow count={review.rating} />
              </div>

              <div className="relative z-10 mt-4 text-sm leading-8 text-white/74">
                {review.text}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.3)]">
          <div className="text-xs uppercase tracking-[0.2em] text-[#f5d38a]">
            Service Areas - Most areas in England + Wales
          </div>
          <p className="mt-4 text-sm leading-8 text-white/65 sm:text-base">
            London • Richmond • Wimbledon • Surrey • Guildford • Woking •
            Ascot • Windsor • Reading • Oxford • Cambridge • St Albans •
            Brighton • Hove • Chichester • Winchester • Southampton •
            Bournemouth • Bath • Bristol • Cheltenham • Milton Keynes •
            Manchester • Leeds • Liverpool • Tunbridge Wells + More
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-12">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Ready to begin?
          </div>

          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Have a similar window in your home?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/65">
            Start your design journey, upload a photo of your window, and let
            us guide you towards the right curtain solution.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/start-designing"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              Start designing
            </a>

            <a
              href="/gallery"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              View project gallery
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-[#f5d38a] text-[#f5d38a]"
        />
      ))}
    </div>
  );
}

function StatCard({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
      <div className="text-3xl font-semibold text-white">{number}</div>
      <div className="mt-2 text-sm text-white/60">{label}</div>
    </div>
  );
}

function TrustCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-[#f5d38a]">
        {icon}
      </div>
      <div className="mt-4 text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-7 text-white/65">{text}</div>
    </div>
  );
}