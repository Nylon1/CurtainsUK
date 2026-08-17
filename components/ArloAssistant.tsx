"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ImagePlus,
  Sparkles,
  User,
} from "lucide-react";

type WindowType =
  | "apex"
  | "triangular"
  | "gable"
  | "angled"
  | "feature"
  | "not-sure"
  | "";

type RoomType =
  | "bedroom"
  | "living-room"
  | "dining-room"
  | "barn-conversion"
  | "stairwell"
  | "other"
  | "";

type PriorityType =
  | "privacy"
  | "blackout"
  | "warmth"
  | "luxury-look"
  | "keep-shape-visible"
  | "everything"
  | "";

type StyleType =
  | "wave-pleat"
  | "pencil-pleat"
  | "pinch-pleat"
  | "motorised"
  | "not-sure"
  | "";

type ArloState = {
  windowType: WindowType;
  room: RoomType;
  priority: PriorityType;
  style: StyleType;
  photoName: string;
};

type Message = {
  id: string;
  sender: "arlo" | "user";
  text: string;
};

type Option = {
  value: string;
  label: string;
};

const initialState: ArloState = {
  windowType: "",
  room: "",
  priority: "",
  style: "",
  photoName: "",
};

export default function ArloAssistant() {
 const messagesRef = useRef<HTMLDivElement | null>(null);
const bottomRef = useRef<HTMLDivElement | null>(null);
    const [state, setState] = useState<ArloState>(initialState);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro-1",
      sender: "arlo",
      text: "Hello, I’m Arlo. I specialise in apex, angled and unusual window coverings. To further assist you, Please let me know what type of window you have?",
    },
    
  ]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isTyping, setIsTyping] = useState(false);

  const recommendation = useMemo(() => buildRecommendation(state), [state]);

  const currentOptions = useMemo(() => {
    if (currentStep === 1) {
      return [
        { value: "apex", label: "Apex" },
        { value: "triangular", label: "Triangular" },
        { value: "gable", label: "Gable End" },
        { value: "angled", label: "Angled" },
        { value: "feature", label: "Large Feature Window" },
        { value: "not-sure", label: "Not sure" },
      ];
    }

    if (currentStep === 2) {
      return [
        { value: "bedroom", label: "Bedroom" },
        { value: "living-room", label: "Living room" },
        { value: "dining-room", label: "Dining room" },
        { value: "barn-conversion", label: "Barn conversion" },
        { value: "stairwell", label: "Stairwell / landing" },
        { value: "other", label: "Other" },
      ];
    }

    if (currentStep === 3) {
      return [
        { value: "privacy", label: "Privacy" },
        { value: "blackout", label: "Blackout / sleep" },
        { value: "warmth", label: "Warmth / insulation" },
        { value: "luxury-look", label: "Luxury look" },
        { value: "keep-shape-visible", label: "Keep the shape visible" },
        { value: "everything", label: "A mix of everything" },
      ];
    }

    if (currentStep === 4) {
      return [
        { value: "wave-pleat", label: "Wave Pleat" },
        { value: "pencil-pleat", label: "Pencil Pleat" },
        { value: "pinch-pleat", label: "Pinch Pleat" },
        { value: "motorised", label: "Motorised" },
        { value: "not-sure", label: "Not sure" },
      ];
    }

    return [];
  }, [currentStep]);

  function addMessage(sender: "arlo" | "user", text: string, animated = false) {
    setMessages((prev) => [
      ...prev,
      {
        id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender,
        text,
      },
    ]);
  }

  function updateState<K extends keyof ArloState>(key: K, value: ArloState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function resetConversation() {
    setState(initialState);
    setCurrentStep(1);
    setIsTyping(false);
    setMessages([
      {
        id: "intro-1",
        sender: "arlo",
        text: "Hello, I’m Arlo. I specialise in apex, angled and unusual window coverings.To further assist you, Please let me know what type of window you have?",
      },
      
    ]);
  }

  function simulateArloReply(text: string, nextStep?: 1 | 2 | 3 | 4 | 5 | 6) {

  setIsTyping(true);

  const thinkingTime = Math.min(
    2600,
    Math.max(1200, text.length * 18)
  );

  setTimeout(() => {

    setIsTyping(false);

    addMessage("arlo", text, true);

    if (nextStep) {
      setCurrentStep(nextStep);
    }

  }, thinkingTime);

}

  function handleOptionSelect(option: Option) {
    addMessage("user", option.label);

    if (currentStep === 1) {
      updateState("windowType", option.value as WindowType);

      const reply =
        option.value === "apex"
          ? "Apex windows usually benefit from a bespoke approach, especially if you want the shape to stay elegant."
          : option.value === "triangular"
          ? "Triangular windows often need a carefully tailored treatment so the shape still feels intentional and refined."
          : option.value === "gable"
          ? "Gable end glazing often suits a larger, more architectural curtain scheme."
          : option.value === "angled"
          ? "Angled windows usually work best with a solution designed around the slope rather than a standard off-the-shelf option."
          : option.value === "feature"
          ? "Large feature windows often need a more considered scheme so the room feels balanced without losing drama."
          : "That’s completely fine. Many customers aren’t sure of the exact term, and a photo usually makes it clear very quickly.";

    simulateArloReply(`${reply} Which room is this for?`, 2);
      return;
    }

    if (currentStep === 2) {
      updateState("room", option.value as RoomType);

      const reply =
        option.value === "bedroom"
          ? "That helps. In bedrooms, privacy and blackout usually matter much more."
          : option.value === "living-room"
          ? "Living spaces often benefit from a balance of softness, light control and keeping the architecture visible."
          : option.value === "barn-conversion"
          ? "Barn conversions often benefit from warmth and scale-sensitive styling because the glazing can feel dramatic and exposed."
          : "Understood. The room always helps shape the recommendation.";

       simulateArloReply(`${reply} What matters to you most here?`, 3);
    }

    if (currentStep === 3) {
      updateState("priority", option.value as PriorityType);

      const reply =
        option.value === "blackout"
          ? "That points toward a stronger lining choice straight away."
          : option.value === "warmth"
          ? "Thermal performance becomes more important there."
          : option.value === "keep-shape-visible"
          ? "That usually means we should be careful not to visually overpower the window."
          : "Good — that gives me a clearer direction.";

     simulateArloReply(`${reply} What style do you naturally prefer?`, 4);
      return;
    }

    if (currentStep === 4) {
      updateState("style", option.value as StyleType);

      const reply =
        option.value === "wave-pleat"
          ? "Wave pleat works beautifully when you want a cleaner, more architectural finish."
          : option.value === "pencil-pleat"
          ? "Pencil pleat is softer and more familiar, and can work very well in the right room."
          : option.value === "pinch-pleat"
          ? "Pinch pleat gives a more tailored and luxurious feel."
          : option.value === "motorised"
          ? "Motorised systems can feel very high-end, especially on larger or harder-to-reach windows."
          : "No problem — I can still guide you based on the window and room.";

      simulateArloReply(`${reply} The next best step is to upload a photo so I can refine the reccomendation?`, 5);
        
      
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    updateState("photoName", file.name);
    addMessage("user", `Uploaded photo: ${file.name}`);

    simulateArloReply(
  `Perfect — a photo makes unusual windows much easier to assess properly. Based on what you've told me, I'd guide you toward ${recommendation.title.toLowerCase()}.`,
  6
);
    
  }

  const progressCount = [
    state.windowType,
    state.room,
    state.priority,
    state.style,
    state.photoName,
  ].filter(Boolean).length;

  const progress = (progressCount / 5) * 100;

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-apex-navy-850/90 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-20%] h-64 w-64 rounded-full bg-[#f5d38a]/10 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative grid lg:grid-cols-[0.78fr_1.22fr]">
        <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#f5d38a]">
            <Sparkles className="h-4 w-4" />
            Arlo AI Specialist
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f5d38a]">
              <Bot className="h-7 w-7" />
            </div>

            <div>
              <div className="text-xl font-semibold text-white">Arlo</div>
              <div className="text-sm text-white/50">
                Apex and unusual window consultant
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm leading-7 text-white/65">
            Arlo is designed to feel like a specialist conversation, not a standard form.
            The goal is to guide you to the right solution, then send you into the enquiry flow with much better context.
          </p>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/40">
              <span>Consultation progress</span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#f5d38a] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <SidebarLine title="Window" value={labelForWindowType(state.windowType)} />
            <SidebarLine title="Room" value={labelForRoom(state.room)} />
            <SidebarLine title="Priority" value={labelForPriority(state.priority)} />
            <SidebarLine title="Style" value={labelForStyle(state.style)} />
            <SidebarLine title="Photo" value={state.photoName || "Not uploaded yet"} />
          </div>

          {currentStep === 6 && (
            <div className="mt-8 rounded-[24px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-5 shadow-[0_0_30px_rgba(245,211,138,0.08)]">
              <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                Estimated project range
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">
                {recommendation.estimate}
              </div>
              <p className="mt-3 text-sm leading-7 text-white/72">
                {recommendation.estimateNote}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 lg:p-8">
          <div className="flex h-[720px] flex-col rounded-[28px] border border-white/10 bg-black/20">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-sm text-white/50">
                Live consultation
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === "arlo" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-7 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                      message.sender === "arlo"
                        ? "border border-white/10 bg-white/[0.04] text-white/85"
                        : "bg-[#f5d38a] text-black"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] opacity-70">
                      {message.sender === "arlo" ? (
                        <>
                          <Bot className="h-3.5 w-3.5" />
                          Arlo
                        </>
                      ) : (
                        <>
                          <User className="h-3.5 w-3.5" />
                          You
                        </>
                      )}
                    </div>
                    <div>
  {message.sender === "arlo" ? (
    <TypewriterText text={message.text} />
  ) : (
    message.text
  )}
</div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
                    <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] opacity-70">
                      <Bot className="h-3.5 w-3.5" />
                      Arlo
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Thinking</span>
                      <span className="inline-flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#f5d38a] [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#f5d38a] [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#f5d38a]" />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 6 && !isTyping && (
                <div className="rounded-[24px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-5 shadow-[0_0_30px_rgba(245,211,138,0.08)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
                    Arlo recommendation
                  </div>

                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {recommendation.title}
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-white/78">
                    {recommendation.explanation}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <SummaryCard label="Suggested heading" value={recommendation.heading} />
                    <SummaryCard label="Suggested lining" value={recommendation.lining} />
                    <SummaryCard label="Window type" value={labelForWindowType(state.windowType)} />
                    <SummaryCard label="Room" value={labelForRoom(state.room)} />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={{
                        pathname: "/start-designing",
                        query: {
                          windowType: labelForWindowType(state.windowType),
                          room: labelForRoom(state.room),
                          priority: labelForPriority(state.priority),
                          style: labelForStyle(state.style),
                          suggestedHeading: recommendation.heading,
                          suggestedLining: recommendation.lining,
                          recommendationTitle: recommendation.title,
                          photoName: state.photoName || "",
                        },
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
                    >
                      Continue to form
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <Link
                      href="/gallery"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
                    >
                      View similar projects
                    </Link>

                    <button
                      type="button"
                      onClick={resetConversation}
                      className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
                    >
                      Start again
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              {currentStep >= 1 && currentStep <= 4 && !isTyping && (
                <div className="flex flex-wrap gap-3">
                  {currentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/85 transition hover:border-[#f5d38a]/30 hover:bg-white/[0.07]"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {currentStep === 5 && !isTyping && (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#f5d38a] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]">
                    <ImagePlus className="h-4 w-4" />
                    Upload window photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={resetConversation}
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:bg-white/10"
                  >
                    Start again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SidebarLine({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
        {title}
      </div>
      <div className="mt-2 text-sm text-white/78">
        {value || "Waiting..."}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
        {label}
      </div>
      <div className="mt-2 text-sm text-white">
        {value || "—"}
      </div>
    </div>
  );
}

function labelForWindowType(value: WindowType) {
  switch (value) {
    case "apex":
      return "Apex";
    case "triangular":
      return "Triangular";
    case "gable":
      return "Gable end";
    case "angled":
      return "Angled";
    case "feature":
      return "Large feature window";
    case "not-sure":
      return "Not sure";
    default:
      return "";
  }
}

function labelForRoom(value: RoomType) {
  switch (value) {
    case "bedroom":
      return "Bedroom";
    case "living-room":
      return "Living room";
    case "dining-room":
      return "Dining room";
    case "barn-conversion":
      return "Barn conversion";
    case "stairwell":
      return "Stairwell / landing";
    case "other":
      return "Other";
    default:
      return "";
  }
}

function labelForPriority(value: PriorityType) {
  switch (value) {
    case "privacy":
      return "Privacy";
    case "blackout":
      return "Blackout / sleep";
    case "warmth":
      return "Warmth / insulation";
    case "luxury-look":
      return "Luxury look";
    case "keep-shape-visible":
      return "Keep the shape visible";
    case "everything":
      return "A mix of everything";
    default:
      return "";
  }
}

function labelForStyle(value: StyleType) {
  switch (value) {
    case "wave-pleat":
      return "Wave Pleat";
    case "pencil-pleat":
      return "Pencil Pleat";
    case "pinch-pleat":
      return "Pinch Pleat";
   
    case "not-sure":
      return "Not sure";
    default:
      return "";
  }
}

function buildRecommendation(state: ArloState) {
  let title = "Bespoke curtain solution for your window";
  let heading = "Wave Pleat";
  let lining = "Standard lining";
  let explanation =
    "A bespoke approach is likely to suit this window best, especially if the shape is unusual or architectural.";
  let estimate = "£1800 – £3,800";
  let estimateNote =
    "This is a guide range for a bespoke project. Final pricing depends on size, fabric, lining and track requirements.";

    function TypewriterText({
  text,
  speed = 24,
  onDone,
}: {
  text: string;
  speed?: number;
  onDone?: () => void;
}) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));

      if (i >= text.length) {
        clearInterval(interval);
        onDone?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onDone]);

  return (
  <span>
    {displayed}
    {displayed.length < text.length && (
      <span className="ml-1 inline-block animate-pulse text-[#f5d38a]">|</span>
    )}
  </span>
);
}

  if (state.windowType === "apex") {
    title = "Bespoke apex curtain solution";
    heading =
      state.style === "pinch-pleat"
        ? "Pinch Pleat"
        : state.style === "pencil-pleat"
        ? "Pencil Pleat"
        : "Wave Pleat";
    explanation =
      "Apex windows usually benefit from a bespoke curtain system that works with the angle of the room rather than against it. The goal is to keep the architecture elegant while improving comfort and softness.";
    estimate = "£2,400 – £4,200";
  }

  if (state.windowType === "gable") {
    title = "Full-height gable end curtain scheme";
    heading =
      state.style === "wave-pleat"
        ? "Wave Pleat"
        : state.style === "pinch-pleat"
        ? "Pinch Pleat"
        : "Wave Pleat";
    explanation =
      "Gable end glazing often suits full-height drapery that respects the scale of the architecture while softening the room beautifully.";
    estimate = "£2,500 – £5,500";
  }

  if (state.windowType === "triangular") {
    title = "Tailored triangular window covering";
    heading =
      state.style === "pencil-pleat"
        ? "Pencil Pleat"
        : state.style === "pinch-pleat"
        ? "Pinch Pleat"
        : "Wave Pleat";
    explanation =
      "Triangular windows usually need a carefully considered bespoke treatment. The aim is to preserve the shape while making the room feel more finished and balanced.";
    estimate = "£1,900 – £3,800";
  }

  if (state.windowType === "angled") {
    title = "Bespoke angled window curtain solution";
    estimate = "£1,700 – £3,600";
  }

  if (state.windowType === "feature") {
    title = "Large feature window curtain scheme";
    estimate = "£1,800 – £4,800";
  }

  if (state.priority === "blackout") {
    lining = "Blackout lining";
  } else if (state.priority === "warmth") {
    lining = "Thermal lining";
  } else if (state.priority === "everything") {
    lining = "Blackout or thermal lining, depending on fabric and room";
  }

  if (state.room === "bedroom" && lining === "Standard lining") {
    lining = "Blackout lining";
  }

  if (state.style === "motorised") {
    heading = "Motorised curtain system";
    estimateNote =
      "Motorised systems can increase the overall cost depending on access, track type and controls.";
  }

  if (state.style === "pinch-pleat") {
    estimateNote =
      "Hand-finished and more tailored heading styles can increase the final price compared with simpler options.";
  }

  return {
    title,
    heading,
    lining,
    explanation,
    estimate,
    estimateNote,
  };
}

function TypewriterText({
  text,
  speed = 24,
}: {
  text: string;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));

      if (i >= text.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="ml-1 inline-block animate-pulse text-[#f5d38a]">|</span>
      )}
    </span>
  );
}