"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Lightbulb,
  Ruler,
  Sparkles,
  ShieldCheck,
  Layers3,
  PenTool,
} from "lucide-react";

import { type AdvicePost } from "@/lib/advice-posts";
import { createClient } from "@/lib/supabase/client";

type FaqItem = {
  question: string;
  answer: string;
  category: string;
};

const faqs: FaqItem[] = [
  {
    category: "Measuring",
    question: "How do I measure an apex window for curtains?",
    answer:
      "Start with the full width you want the curtain scheme to cover, not just the glass. Then identify the highest point of the apex and measure the drops needed on each side. In many apex installations, multiple drop measurements are needed because the top line is angled rather than flat.",
  },
  {
    category: "Measuring",
    question: "Do I measure the glass or the full wall area?",
    answer:
      "Usually the full intended curtain area. Well-designed curtains often extend beyond the visible glass so they stack more neatly and make the window look more balanced.",
  },
  {
    category: "Measuring",
    question: "How much wider should curtains be than the window?",
    answer:
      "That depends on the heading style and fullness. In general, curtains need enough extra width to look luxurious when closed and to stack properly when open.",
  },
  {
    category: "Tracks",
    question: "Do apex curtains need a bespoke track?",
    answer:
      "Very often, yes. Angled and apex windows usually need tracks designed specifically for the geometry of the space. The aim is to make the curtains sit naturally with the architecture.",
  },
  {
    category: "Tracks",
    question: "Can curtain tracks bend for unusual windows?",
    answer:
      "Some can, but not every track is suitable for every angle or span. The track choice depends on shape, scale, weight of fabric and desired operation.",
  },
  {
    category: "Tracks",
    question: "Can curtains still open properly on angled windows?",
    answer:
      "They can, but it depends on the design. Some apex installations are more decorative, while others are designed for regular opening and closing.",
  },
  {
    category: "Fabrics",
    question: "What fabric is best for very tall windows?",
    answer:
      "That depends on the room and the effect you want. For large glazed spaces, fabrics with good body and drape often work best because they hold their shape better over long drops.",
  },
  {
    category: "Fabrics",
    question: "Should apex curtains be lined?",
    answer:
      "Usually yes. Lining improves body, finish and performance. It can also help with privacy, insulation and blackout depending on the room.",
  },
  {
    category: "Fabrics",
    question: "Are blackout curtains a good idea for apex bedrooms?",
    answer:
      "Yes, very often. Bedrooms with apex glazing can admit a lot of light, so blackout lining is commonly used where sleep quality matters.",
  },
  {
    category: "Style",
    question: "What heading style works best for apex windows?",
    answer:
      "Wave pleat, pencil pleat and hand-sewn pinch pleat can all work well. The right answer depends on the room style, amount of stack back needed and how formal or relaxed you want the finished look to feel.",
  },
  {
    category: "Style",
    question: "Are wave curtains suitable for gable end windows?",
    answer:
      "Yes, often very suitable. Wave pleat can look especially strong in contemporary spaces because it creates even, modern folds across large expanses.",
  },
  {
    category: "Style",
    question: "Do pinch pleat curtains suit barn conversions?",
    answer:
      "They can look excellent in barn conversions, especially when the brief is warm, tailored and luxurious rather than ultra-minimal.",
  },
  {
    category: "Installation",
    question: "Do large feature windows need full-height curtains?",
    answer:
      "Often yes. Full-height curtains usually look more intentional and luxurious, and they soften tall spaces beautifully.",
  },
  {
    category: "Installation",
    question: "Should curtains sit inside the apex shape or frame the whole space?",
    answer:
      "Both approaches can work. Framing the broader wall area often produces a more elegant result, while following the apex exactly can emphasize the architecture more strongly.",
  },
  {
    category: "Installation",
    question: "Do apex curtains need tiebacks?",
    answer:
      "Not always. Some schemes look best without tiebacks, especially if you want a cleaner, more architectural finish.",
  },
  {
    category: "General",
    question: "Can you help if I am not sure what type of window I have?",
    answer:
      "Yes. The easiest approach is to upload a photo and get tailored advice. That avoids guesswork and usually leads to a much better curtain solution.",
  },
  {
    category: "General",
    question: "Are bespoke curtains worth it for unusual windows?",
    answer:
      "For apex, triangular and gable end glazing, bespoke curtains are usually the difference between something that merely covers the window and something that truly completes the room.",
  },
  {
    category: "General",
    question: "What is the biggest mistake people make with unusual windows?",
    answer:
      "Trying to force a standard curtain solution onto a non-standard space. That often leads to awkward proportions, poor operation and a result that never feels quite right.",
  },
];

const categories = [
  "All",
  "Measuring",
  "Tracks",
  "Fabrics",
  "Style",
  "Installation",
  "General",
];

type Props = {
  posts: AdvicePost[];
};

export default function AdvicePageClient({ posts }: Props) {
  
  const [activeCategory, setActiveCategory] = useState("All");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  

 

  const featuredPosts = posts.filter((post) => post.featured).slice(0, 4);
  const libraryPosts = posts.slice(0, 9);

  const filteredFaqs = useMemo(() => {
    if (activeCategory === "All") return faqs;
    return faqs.filter((faq) => faq.category === activeCategory);
  }, [activeCategory]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.apexcurtains.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Advice",
        item: "https://www.apexcurtains.com/advice",
      },
    ],
  };

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[8%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-[#f5d38a]/40 hover:text-[#f5d38a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Advice
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            Expert advice for
            <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
              {" "}apex, angled and feature windows
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
            Explore guides, practical answers and curtain design advice for difficult
            window shapes. Built to help visitors trust the process and move toward the
            right solution.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/start-designing"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              Start Your Curtain Journey
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#faqs"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              Browse quick answers
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          <MiniStat icon={<Ruler className="h-5 w-5" />} label="Measuring guides" />
          <MiniStat icon={<Layers3 className="h-5 w-5" />} label="Track advice" />
          <MiniStat icon={<PenTool className="h-5 w-5" />} label="Style comparisons" />
          <MiniStat icon={<ShieldCheck className="h-5 w-5" />} label="Practical answers" />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Featured Guides
          </div>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Start with the big questions
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {featuredPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#f5d38a]/30 hover:shadow-[0_35px_100px_rgba(0,0,0,0.45)]"
            >
              <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f5d38a]/10 via-transparent to-[#f5d38a]/10 blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="inline-flex rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#f5d38a]">
                  {post.category}
                </div>

                <h3 className="mt-5 text-2xl font-semibold leading-tight">
                  {post.title}
                </h3>

                <p className="mt-4 text-sm leading-8 text-white/72">
                  {post.excerpt}
                </p>

                <Link
                  href={`/advice/${post.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm text-[#f5d38a]"
                >
                  Read guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Advice Library
          </div>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Premium curtain advice posts
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {libraryPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.35, delay: (index % 3) * 0.04 }}
              className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-[#f5d38a]/25 hover:bg-white/[0.055]"
            >
              <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-r from-[#f5d38a]/8 via-transparent to-[#f5d38a]/8 blur-3xl" />
              </div>

              <div className="relative z-10">
                <div className="inline-flex rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#f5d38a]">
                  {post.category}
                </div>

                <h3 className="mt-4 text-2xl font-semibold leading-tight">
                  {post.title}
                </h3>

                <p className="mt-4 text-sm leading-8 text-white/72">
                  {post.excerpt}
                </p>

                <Link
                  href={`/advice/${post.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm text-[#f5d38a]"
                >
                  Explore topic
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <ExpertTip
            title="Designer Tip"
            text="For many apex spaces, the curtain scheme should be considered as part of the room architecture, not as an afterthought to the glass."
          />
          <ExpertTip
            title="Practical Tip"
            text="Bedrooms with unusual glazing often benefit from blackout lining, especially where tall glass admits early light."
          />
          <ExpertTip
            title="Style Tip"
            text="Wave pleat often suits contemporary glazing beautifully, while pinch pleat can add warmth and refinement in more classic interiors."
          />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Explore Solutions
          </div>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Explore curtain solutions by window type
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/65">
            Move from advice into the right specialist page for your window.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { href: "/apex-curtains", label: "Apex Curtains" },
            { href: "/gable-end-curtains", label: "Gable End Curtains" },
            { href: "/triangular-window-curtains", label: "Triangular Window Curtains" },
            { href: "/barn-conversion-curtains", label: "Barn Conversion Curtains" },
            { href: "/large-window-curtains", label: "Large Window Curtains" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 text-sm font-medium text-white/85 transition hover:border-[#f5d38a]/25 hover:bg-white/[0.06] hover:text-[#f5d38a]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section
        id="faqs"
        className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8"
      >
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Quick Answers
          </div>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/65">
            A growing library of answers covering measuring, tracks, fabrics,
            heading styles and installation for unusual windows.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {categories.map((category) => {
            const active = activeCategory === category;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-[#f5d38a]/40 bg-[#f5d38a]/10 text-[#f5d38a]"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={`${faq.category}-${faq.question}`}
                className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_14px_50px_rgba(0,0,0,0.22)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#f5d38a]">
                      {faq.category}
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {faq.question}
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-white/60 transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="border-t border-white/10 px-6 py-5 text-sm leading-8 text-white/72">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.35)] sm:p-12">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-[#f5d38a]">
            <Lightbulb className="h-5 w-5" />
          </div>

          <div className="mt-5 text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
            Still unsure?
          </div>

          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Upload a photo and get tailored advice
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/65">
            If your window is unusual, don’t guess. Start your design journey,
            upload a photo and we’ll guide you towards the most suitable curtain solution.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/start-designing"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
            >
              Start Your Curtain Journey
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/window-types"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
            >
              View window types
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function MiniStat({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_14px_50px_rgba(0,0,0,0.22)]">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-[#f5d38a]">
        {icon}
      </div>
      <div className="mt-4 text-sm text-white/75">{label}</div>
    </div>
  );
}

function ExpertTip({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
      <div className="text-xs uppercase tracking-[0.2em] text-[#f5d38a]">
        {title}
      </div>
      <div className="mt-4 text-sm leading-8 text-white/72">{text}</div>
    </div>
  );
}