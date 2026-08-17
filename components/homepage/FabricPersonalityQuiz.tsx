"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

type QuizState = {
  patternConfidence: string;
  roomMood: string;
  colourApproach: string;
  curtainRole: string;
  roomType: string;
};

type PersonalityResult = {
  key: string;
  title: string;
  subtitle: string;
  summary: string;
  fabrics: string[];
  headings: string[];
  lining: string;
  tones: string[];
  arloHint: string;
};

const initialState: QuizState = {
  patternConfidence: "",
  roomMood: "",
  colourApproach: "",
  curtainRole: "",
  roomType: "",
};

const questions = [
  {
    key: "patternConfidence" as const,
    eyebrow: "Question 1",
    title: "How confident are you with pattern?",
    subtitle:
      "This helps reveal whether you lean towards plain fabrics, gentle movement, or something bolder.",
    options: [
      {
        label: "Very calm fabrics only",
        value: "plain",
        note: "You prefer quiet, understated surfaces.",
      },
      {
        label: "Subtle texture over pattern",
        value: "textured",
        note: "Depth matters more than print.",
      },
      {
        label: "A little pattern is lovely",
        value: "soft-pattern",
        note: "You like interest without too much drama.",
      },
      {
        label: "I love strong pattern",
        value: "bold-pattern",
        note: "You want the fabric to speak.",
      },
    ],
  },
  {
    key: "roomMood" as const,
    eyebrow: "Question 2",
    title: "How should the room feel?",
    subtitle:
      "Think about the overall atmosphere you want once the curtains are in place.",
    options: [
      {
        label: "Soft and relaxing",
        value: "soft",
        note: "Calm, gentle and easy to live with.",
      },
      {
        label: "Elegant and refined",
        value: "elegant",
        note: "Tailored, polished and considered.",
      },
      {
        label: "Warm and cosy",
        value: "warm",
        note: "Comfort, depth and softness.",
      },
      {
        label: "Dramatic and expressive",
        value: "dramatic",
        note: "You want presence and impact.",
      },
    ],
  },
  {
    key: "colourApproach" as const,
    eyebrow: "Question 3",
    title: "How do you use colour in the room?",
    subtitle:
      "This helps decide whether your curtains should disappear quietly or add more visual energy.",
    options: [
      {
        label: "Mostly neutrals",
        value: "neutral",
        note: "You like calm, balanced palettes.",
      },
      {
        label: "Soft colour accents",
        value: "soft-colour",
        note: "A little colour goes a long way.",
      },
      {
        label: "Balanced layered colour",
        value: "balanced",
        note: "You enjoy a more curated interior.",
      },
      {
        label: "Bold colour statements",
        value: "bold-colour",
        note: "You are confident with stronger tones.",
      },
    ],
  },
  {
    key: "curtainRole" as const,
    eyebrow: "Question 4",
    title: "What role should the curtains play?",
    subtitle:
      "Should they quietly support the room, or become part of the design statement?",
    options: [
      {
        label: "Blend quietly into the room",
        value: "blend",
        note: "The architecture should lead.",
      },
      {
        label: "Add softness and warmth",
        value: "soften",
        note: "You want comfort and balance.",
      },
      {
        label: "Frame the window beautifully",
        value: "frame",
        note: "You want the window to feel finished.",
      },
      {
        label: "Become a design feature",
        value: "feature",
        note: "You want the curtains to make an impression.",
      },
    ],
  },
  {
    key: "roomType" as const,
    eyebrow: "Question 5",
    title: "Where are these curtains going?",
    subtitle:
      "The room changes the best fabric direction, heading style and lining choice.",
    options: [
      {
        label: "Bedroom",
        value: "bedroom",
        note: "Privacy and blackout usually matter more.",
      },
      {
        label: "Living room",
        value: "living-room",
        note: "Style and softness usually lead here.",
      },
      {
        label: "Dining / entertaining space",
        value: "dining-room",
        note: "A more polished feel can work beautifully.",
      },
      {
        label: "Feature space / extension",
        value: "feature-space",
        note: "The curtains often need to work with the architecture.",
      },
    ],
  },
];

export default function FabricPersonalityQuiz() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [state, setState] = useState<QuizState>(initialState);

  const isComplete = step >= questions.length;
  const currentQuestion = questions[Math.min(step, questions.length - 1)];

  const answeredCount = useMemo(
    () => Object.values(state).filter(Boolean).length,
    [state]
  );

  const progress = useMemo(
    () => (answeredCount / questions.length) * 100,
    [answeredCount]
  );

  const liveResult = useMemo(() => getResult(state), [state]);

  function updateAnswer(key: keyof QuizState, value: string) {
    setState((prev) => ({ ...prev, [key]: value }));

    setDirection(1);
    setTimeout(() => {
      setStep((prev) => Math.min(prev + 1, questions.length));
    }, 160);
  }

  function goBack() {
    if (step === 0) return;

    setDirection(-1);

    if (isComplete) {
      setStep(questions.length - 1);
      return;
    }

    setStep((prev) => Math.max(prev - 1, 0));
  }

  function resetQuiz() {
    setDirection(-1);
    setState(initialState);
    setStep(0);
  }

  return (
    <section className="relative overflow-hidden border-t border-white/10 bg-gradient-to-b from-apex-navy-850 to-apex-navy-950 py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[10%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[140px]" />
        <div className="absolute right-[10%] top-[22%] h-[280px] w-[280px] rounded-full bg-sky-400/10 blur-[140px]" />
        <div className="absolute bottom-[6%] left-[36%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Style Discovery
          </div>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Find your
            <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
              {" "}curtain personality
            </span>
          </h2>

          <p className="mt-5 text-sm leading-8 text-white/68 sm:text-base">
            This is not a fabric library. It is a guided style read. Answer a few
            deeper questions and we’ll reveal the fabric direction, heading style
            and lining approach that suits your room best.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#f5d38a]">
                  Take the quiz
                </div>
                <div className="mt-2 text-sm text-white/45">
                  Step {Math.min(step + 1, questions.length)} of {questions.length}
                </div>
              </div>

              <div className="w-full max-w-[180px]">
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/35">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[#f5d38a]"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              {!isComplete ? (
                <motion.div
                  key={currentQuestion.key}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="text-xs uppercase tracking-[0.2em] text-white/38">
                    {currentQuestion.eyebrow}
                  </div>

                  <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {currentQuestion.title}
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-white/65 sm:text-base">
                    {currentQuestion.subtitle}
                  </p>

                  <div className="mt-8 grid gap-4">
                    {currentQuestion.options.map((option) => {
                      const active = state[currentQuestion.key] === option.value;

                      return (
                        <motion.button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateAnswer(currentQuestion.key, option.value)
                          }
                          whileHover={{ y: -3, scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 260, damping: 18 }}
                          className={`rounded-[26px] border p-5 text-left transition ${
                            active
                              ? "border-[#f5d38a]/40 bg-[#f5d38a]/10 shadow-[0_0_30px_rgba(245,211,138,0.08)]"
                              : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-lg font-medium text-white">
                                {option.label}
                              </div>
                              <div className="mt-2 text-sm leading-7 text-white/58">
                                {option.note}
                              </div>
                            </div>

                            {active && (
                              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5d38a] text-black">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={step === 0}
                      className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={resetQuiz}
                      className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Reset
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="complete"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#f5d38a]">
                    <Sparkles className="h-4 w-4" />
                    Personality revealed
                  </div>

                  <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    You are
                    <span className="bg-gradient-to-r from-[#f5d38a] via-white to-[#f5d38a] bg-clip-text text-transparent">
                      {" "}{liveResult.title}
                    </span>
                  </h3>

                  <p className="mt-5 text-sm leading-8 text-white/68 sm:text-base">
                    {liveResult.subtitle}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/arlo-curtain-advisor"
                      className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
                    >
                      Ask Arlo About This Look
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      href="/start-designing"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
                    >
                      Start Designing
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={resetQuiz}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:bg-white/10"
                    >
                      Retake quiz
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/70">
              <Sparkles className="h-4 w-4 text-[#f5d38a]" />
              {isComplete ? "Personality revealed" : "Live style analysis"}
            </div>

            <h3 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {isComplete
                ? `You are ${liveResult.title}`
                : "Your curtain personality is evolving"}
            </h3>

            <p className="mt-4 text-sm leading-8 text-white/68 sm:text-base">
              {isComplete
                ? liveResult.summary
                : "Based on your answers so far, we’re shaping a likely curtain direction. This updates as you move through the quiz."}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {liveResult.fabrics.slice(0, 4).map((fabric, index) => (
                <motion.div
                  key={fabric}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-5"
                >
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                    Fabric cue
                  </div>
                  <div className="mt-3 text-lg text-white">{fabric}</div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoBox
                title="Heading direction"
                text={liveResult.headings.join(" or ")}
              />
              <InfoBox
                title="Lining direction"
                text={liveResult.lining}
              />
            </div>

            <div className="mt-8 rounded-[24px] border border-[#f5d38a]/15 bg-[#f5d38a]/8 p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#f5d38a]">
                Arlo note
              </div>
              <p className="mt-3 text-sm leading-8 text-white/78">
                {liveResult.arloHint}
              </p>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-black/20 p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Most homes like yours usually lean towards
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {liveResult.tones.map((tone) => (
                  <span
                    key={tone}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/78"
                  >
                    {tone}
                  </span>
                ))}
              </div>
            </div>

            {!isComplete && (
              <div className="mt-8 text-sm text-white/45">
                Complete the final answers to reveal your full curtain personality.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
        {title}
      </div>
      <div className="mt-3 text-sm leading-8 text-white/78">{text}</div>
    </div>
  );
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 36 : -36,
    opacity: 0,
    filter: "blur(6px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -28 : 28,
    opacity: 0,
    filter: "blur(6px)",
  }),
};

function getResult(state: QuizState): PersonalityResult {
  const {
    patternConfidence,
    roomMood,
    colourApproach,
    curtainRole,
    roomType,
  } = state;

  const isBold =
    patternConfidence === "bold-pattern" ||
    colourApproach === "bold-colour" ||
    curtainRole === "feature" ||
    roomMood === "dramatic";

  const isTextured =
    patternConfidence === "textured" ||
    roomMood === "warm" ||
    curtainRole === "soften";

  const isElegant =
    roomMood === "elegant" ||
    curtainRole === "frame" ||
    colourApproach === "balanced";

  const isSoftPattern =
    patternConfidence === "soft-pattern" ||
    colourApproach === "soft-colour";

  if (isBold) {
    return {
      key: "statement-maker",
      title: "The Statement Maker",
      subtitle:
        "You are comfortable with fabrics that bring visual confidence into the room.",
      summary:
        "You are not looking for curtains that disappear. You want them to contribute to the character of the space, especially where the window already has strong architectural presence.",
      fabrics: [
        "Large florals",
        "Geometric prints",
        "Velvet plains with depth",
        "Strong woven patterns",
      ],
      headings: ["Hand-sewn Pinch Pleat", "Wave Pleat"],
      lining:
        roomType === "bedroom"
          ? "Blackout lining is usually the strongest fit."
          : "Interlining or premium lining can help the curtains feel richer and more substantial.",
      tones: [
        "Confident visual layering",
        "Bold pattern tolerance",
        "Feature-led curtain styling",
      ],
      arloHint:
        "This personality often works beautifully in dramatic apex spaces, large feature windows and rooms where the curtains should feel like part of the design story.",
    };
  }

  if (isTextured && !isBold) {
    return {
      key: "textured-sophisticate",
      title: "The Textured Sophisticate",
      subtitle:
        "You are drawn to depth, softness and richness without relying on loud pattern.",
      summary:
        "You prefer fabrics that feel layered and luxurious in a quieter way. Texture matters more to you than print, and you want the room to feel warmer, more grounded and more complete.",
      fabrics: [
        "Textured plains",
        "Linen blends",
        "Soft wool-look weaves",
        "Rich neutral textures",
      ],
      headings: ["Wave Pleat", "Hand-sewn Pinch Pleat"],
      lining:
        roomType === "bedroom"
          ? "Blackout or thermal lining usually works very well here."
          : "Thermal or privacy lining would often suit this direction.",
      tones: [
        "Quiet luxury",
        "Texture over print",
        "Warm layered finish",
      ],
      arloHint:
        "This direction is especially strong for family rooms, loft spaces, barn conversions and any space that needs softness without losing elegance.",
    };
  }

  if (isElegant) {
    return {
      key: "elegant-classic",
      title: "The Elegant Classic",
      subtitle:
        "You prefer a refined, balanced room where the curtains feel tailored and composed.",
      summary:
        "You are likely drawn to fabrics that add polish rather than noise. You want the curtains to frame the room beautifully and support the architecture with a more considered finish.",
      fabrics: [
        "Refined jacquards",
        "Subtle florals",
        "Tailored woven plains",
        "Soft structured neutrals",
      ],
      headings: ["Hand-sewn Pinch Pleat", "Wave Pleat"],
      lining:
        roomType === "bedroom"
          ? "Blackout lining can be paired without losing elegance."
          : "A privacy or standard lining is often enough unless insulation is important.",
      tones: [
        "Tailored and polished",
        "Refined pattern use",
        "Balanced visual structure",
      ],
      arloHint:
        "This personality suits rooms where the curtains need to feel elegant, composed and properly considered rather than overly minimal or heavily decorative.",
    };
  }

  if (isSoftPattern) {
    return {
      key: "romantic-stylist",
      title: "The Romantic Stylist",
      subtitle:
        "You like movement, softness and a little decorative personality in the room.",
      summary:
        "You are comfortable with fabrics that add warmth and character, especially when they feel graceful rather than loud. This often points towards flowing fabrics, soft pattern and expressive detail.",
      fabrics: [
        "Delicate florals",
        "Botanical prints",
        "Embroidered fabrics",
        "Soft patterned linens",
      ],
      headings: ["Pencil Pleat", "Hand-sewn Pinch Pleat"],
      lining:
        roomType === "bedroom"
          ? "Blackout lining can work well if sleep matters, while still keeping the room soft."
          : "Privacy lining or light filtering often suits this look beautifully.",
      tones: [
        "Gentle decorative detail",
        "Soft pattern confidence",
        "Expressive but elegant",
      ],
      arloHint:
        "This look often suits bedrooms, dressing spaces and softer living rooms where the curtains should contribute personality without feeling too formal.",
    };
  }

  return {
    key: "calm-minimalist",
    title: "The Calm Minimalist",
    subtitle:
      "You prefer a quieter fabric direction where the room and window shape do most of the talking.",
    summary:
      "You are drawn to fabrics that feel understated, clean and well balanced. The curtains should soften the space, but they should not dominate it. This usually points towards plains, gentle texture and a more architectural finish.",
    fabrics: [
      "Smooth plains",
      "Fine linen blends",
      "Soft neutral textures",
      "Subtle woven surfaces",
    ],
    headings: ["Wave Pleat", "Hand-sewn Pinch Pleat"],
    lining:
      roomType === "bedroom"
        ? "Blackout lining is often the smartest practical addition."
        : "A simple privacy or light-filtering lining usually works well here.",
    tones: [
      "Architectural calm",
      "Quiet surfaces",
      "Understated design confidence",
    ],
    arloHint:
      "This direction is especially effective where the window shape is already dramatic and you want the curtains to soften it without stealing focus.",
  };
}