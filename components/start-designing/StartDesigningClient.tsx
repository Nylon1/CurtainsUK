"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

type FormData = {
  windowType: string;
  purpose: string;
  fabricStyle: string;
  liningType: string;
  roomType: string;
  headingStyle: string;
  imageFile: File | null;
  imagePreview: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  contactTime: string;

  arloPriority: string;
  arloStyle: string;
  suggestedHeading: string;
  suggestedLining: string;
  recommendationTitle: string;
  photoName: string;
};

const totalSteps = 13;

const optionGroups = {
  windowType: [
    "Standard",
    "Apex",
    "Barn Conversion",
    "Triangular",
    "Other Shape",
    "Not Sure",
  ],
  purpose: [
    "Privacy",
    "Reduce sunlight / glare",
    "Interior design / aesthetics",
    "A mix of everything",
  ],
  fabricStyle: [
    "Plain / solid colour",
    "Subtle pattern",
    "Floral or decorative",
    "Not sure yet",
  ],
  liningType: [
    "Standard lining",
    "Blackout",
    "Thermal",
    "Not sure",
  ],
  roomType: [
    "Bedroom",
    "Lounge / Living Room",
    "Barn Conversion",
    "Extension / New Build",
    "Other",
  ],
  headingStyle: [
    {
      label: "Pencil Pleat",
      description: "Classic style, medium cost",
      image: "/headings/pencil-pleat.jpeg",
    },
    {
      label: "Wave Pleat",
      description: "Modern folds, higher cost",
      image: "/headings/wave-pleat.jpg",
    },
    {
      label: "Hand-sewn Pinch Pleat",
      description: "Tailored luxury look, premium cost",
      image: "/headings/pinch-pleat.jpg",
    },
    {
      label: "Not Sure",
      description: "I'd like advice",
      image: "/headings/not-sure.jpeg",
    },
  ],
  contactTime: [
    "Morning (9am – 12pm)",
    "Afternoon (12pm – 5pm)",
    "Evening (5pm – 8pm)",
    "Anytime",
  ],
};

const screenMeta = [
  {
    key: "windowType",
    eyebrow: "Step 1",
    title: "What type of window do you have?",
    subtitle: "Choose the option that feels closest to your window.",
  },
  {
    key: "purpose",
    eyebrow: "Step 2",
    title: "What is your main goal for the curtains?",
    subtitle: "This helps guide the right fabric and curtain setup.",
  },
  {
    key: "fabricStyle",
    eyebrow: "Step 3",
    title: "What type of fabric style do you prefer?",
    subtitle: "Tell us the look you’re naturally drawn to.",
  },
  {
    key: "liningType",
    eyebrow: "Step 4",
    title: "What type of lining would you prefer?",
    subtitle: "Choose the level of light control or insulation you want.",
  },
  {
    key: "roomType",
    eyebrow: "Step 5",
    title: "Which room is this window in?",
    subtitle: "The room helps us understand the design and practical needs.",
  },
  {
    key: "headingStyle",
    eyebrow: "Step 6",
    title: "Which curtain heading style do you prefer?",
    subtitle: "This affects both the look and the cost level.",
  },
  {
    key: "imageUpload",
    eyebrow: "Step 7",
    title: "Upload a photo of your window",
    subtitle: "A clear photo is helpful for unusual glazing, but you can continue without one and add it later.",
  },
  {
    key: "name",
    eyebrow: "Step 8",
    title: "What is your name?",
    subtitle: "So we know who to prepare the advice for.",
  },
  {
    key: "email",
    eyebrow: "Step 9",
    title: "What is your email address?",
    subtitle: "We’ll use this to send your design follow-up.",
  },
  {
    key: "phone",
    eyebrow: "Step 10",
    title: "What is your phone number?",
    subtitle: "Useful if we need to discuss your window in more detail.",
  },
  {
    key: "postcode",
    eyebrow: "Step 11",
    title: "What is your postcode?",
    subtitle: "This helps us understand your area and service route.",
  },
  {
    key: "contactTime",
    eyebrow: "Step 12",
    title: "When is the best time for us to contact you?",
    subtitle: "Choose the time that suits you best.",
  },
  {
    key: "review",
    eyebrow: "Final Step",
    title: "Review your details",
    subtitle: "Check everything looks right before submitting.",
  },
] as const;

export default function StartDesigningPage() {
  const searchParams = useSearchParams();

  const prefillWindowType = searchParams.get("windowType") || "";
  const prefillRoom = searchParams.get("room") || "";
  const prefillPriority = searchParams.get("priority") || "";
  const prefillStyle = searchParams.get("style") || "";
  const prefillSuggestedHeading = searchParams.get("suggestedHeading") || "";
  const prefillSuggestedLining = searchParams.get("suggestedLining") || "";
  const prefillRecommendationTitle = searchParams.get("recommendationTitle") || "";
  const prefillPhotoName = searchParams.get("photoName") || "";

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<FormData>({
    windowType: mapArloWindowTypeToForm(prefillWindowType),
    purpose: mapArloPriorityToForm(prefillPriority),
    fabricStyle: "",
    liningType: mapArloLiningToForm(prefillSuggestedLining),
    roomType: mapArloRoomToForm(prefillRoom),
    headingStyle: mapArloHeadingToForm(prefillSuggestedHeading),
    imageFile: null,
    imagePreview: "",
    name: "",
    email: "",
    phone: "",
    postcode: "",
    contactTime: "",
    arloPriority: prefillPriority,
    arloStyle: prefillStyle,
    suggestedHeading: prefillSuggestedHeading,
    suggestedLining: prefillSuggestedLining,
    recommendationTitle: prefillRecommendationTitle,
    photoName: prefillPhotoName,
  });

  useEffect(() => {
    const preview = form.imagePreview;
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [form.imagePreview]);

  const current = screenMeta[step];
  const progress = useMemo(() => ((step + 1) / totalSteps) * 100, [step]);

  const canProceed = useMemo(() => {
    switch (current.key) {
      case "windowType":
        return !!form.windowType;
      case "purpose":
        return !!form.purpose;
      case "fabricStyle":
        return !!form.fabricStyle;
      case "liningType":
        return !!form.liningType;
      case "roomType":
        return !!form.roomType;
      case "headingStyle":
        return !!form.headingStyle;
      case "imageUpload":
        return true;
      case "name":
        return form.name.trim().length > 1;
      case "email":
        return /\S+@\S+\.\S+/.test(form.email);
      case "phone":
        return form.phone.trim().length > 5;
      case "postcode":
        return form.postcode.trim().length > 2;
      case "contactTime":
        return !!form.contactTime;
      case "review":
        return true;
      default:
        return false;
    }
  }, [current.key, form]);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() {
    if (!canProceed || step >= totalSteps - 1) return;
    setDirection(1);
    setStep((s) => s + 1);
  }

  function prevStep() {
    if (step <= 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: preview,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = new FormData();

      payload.append("windowType", form.windowType);
      payload.append("purpose", form.purpose);
      payload.append("fabricStyle", form.fabricStyle);
      payload.append("liningType", form.liningType);
      payload.append("roomType", form.roomType);
      payload.append("headingStyle", form.headingStyle);
      payload.append("name", form.name);
      payload.append("email", form.email);
      payload.append("phone", form.phone);
      payload.append("postcode", form.postcode);
      payload.append("contactTime", form.contactTime);

      payload.append("arloPriority", form.arloPriority);
      payload.append("arloStyle", form.arloStyle);
      payload.append("suggestedHeading", form.suggestedHeading);
      payload.append("suggestedLining", form.suggestedLining);
      payload.append("recommendationTitle", form.recommendationTitle);
      payload.append("photoName", form.photoName);

      if (form.imageFile) {
        payload.append("imageFile", form.imageFile);
      }

      const response = await fetch("/api/send-lead", {
        method: "POST",
        body: payload,
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to send lead");
      }

      setSubmitted(true);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong sending the enquiry."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute left-[8%] top-[6%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
          <div className="absolute right-[10%] top-[18%] h-[300px] w-[300px] rounded-full bg-sky-400/10 blur-[120px]" />
          <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="w-full rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-[36px] sm:p-12">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#f5d38a] text-2xl text-black">
              ✓
            </div>

            <div className="mt-6 text-xs uppercase tracking-[0.24em] text-[#f5d38a]">
              Enquiry Received
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Thank you for your enquiry
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">
              Your curtain design request has been sent successfully.
              One of our Apex Window specialists will review your details and contact you shortly.
            </p>

            <div className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-left">
                <div className="text-sm text-white/50">Your design summary</div>

                {form.recommendationTitle && (
                  <div className="mt-4 mb-5 rounded-[18px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#f5d38a]">
                      Arlo recommendation
                    </div>
                    <div className="mt-2 text-base font-medium text-white">
                      {form.recommendationTitle}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <SummaryItem label="Window type" value={form.windowType} />
                  <SummaryItem label="Main goal" value={form.purpose} />
                  <SummaryItem label="Fabric style" value={form.fabricStyle} />
                  <SummaryItem label="Lining type" value={form.liningType} />
                  <SummaryItem label="Room type" value={form.roomType} />
                  <SummaryItem label="Heading style" value={form.headingStyle} />
                  <SummaryItem label="Name" value={form.name} />
                  <SummaryItem label="Best contact time" value={form.contactTime} />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-left">
                <div className="text-sm text-white/50">Uploaded window photo</div>

                {form.imagePreview ? (
                  <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10 bg-black/30">
                    <img
                      src={form.imagePreview}
                      alt="Uploaded window"
                      className="h-[260px] w-full rounded-xl object-contain sm:h-[360px]"
                    />
                  </div>
                ) : (
                  <div className="mt-4 text-white/50">No image uploaded</div>
                )}

                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="text-sm text-white/50">What happens next</div>

                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <p>• We review your design selections and window photo if supplied</p>
                    <p>• We prepare the most suitable curtain approach</p>
                    <p>• We contact you as soon as possible</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-white/10 pt-6"></div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/"
                className="rounded-full bg-[#f5d38a] px-6 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476]"
              >
                Back to Homepage
              </Link>

              <Link
                href="/start-designing"
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm text-white transition hover:bg-white/10"
              >
                Start Another Design
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-apex-navy-900 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-[8%] top-[6%] h-[320px] w-[320px] rounded-full bg-[#f5d38a]/10 blur-[120px]" />
        <div className="absolute right-[10%] top-[18%] h-[300px] w-[300px] rounded-full bg-sky-400/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[35%] h-[260px] w-[260px] rounded-full bg-[#f5d38a]/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="text-sm text-white/45">
            Step {step + 1} of {totalSteps}
          </div>
        </div>

        {form.recommendationTitle && (
          <div className="mb-5 rounded-[24px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-4 shadow-[0_0_30px_rgba(245,211,138,0.08)] sm:mb-6 sm:rounded-[28px] sm:p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-[#f5d38a]">
              Arlo recommendation
            </div>

            <div className="mt-3 text-xl font-semibold text-white sm:text-2xl">
              {form.recommendationTitle}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="text-sm text-white/75"><span className="text-white/45">Window:</span> {form.windowType || "—"}</div>
              <div className="text-sm text-white/75"><span className="text-white/45">Room:</span> {form.roomType || "—"}</div>
              <div className="text-sm text-white/75"><span className="text-white/45">Priority:</span> {form.arloPriority || "—"}</div>
              <div className="text-sm text-white/75"><span className="text-white/45">Style:</span> {form.arloStyle || "—"}</div>
              <div className="text-sm text-white/75"><span className="text-white/45">Suggested heading:</span> {form.suggestedHeading || "—"}</div>
              <div className="text-sm text-white/75"><span className="text-white/45">Suggested lining:</span> {form.suggestedLining || "—"}</div>
            </div>
          </div>
        )}

        <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/10 sm:mb-8">
          <motion.div
            className="h-full rounded-full bg-[#f5d38a]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex min-h-[560px] flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:min-h-[720px] sm:rounded-[36px] sm:p-8 lg:p-10">
            <div className="mb-5 sm:mb-8">
              <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                Start Designing
              </div>
            </div>

            <div className="flex flex-1 items-center">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current.key}
                  custom={direction}
                  variants={screenVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full"
                >
                  <div className="mb-7 sm:mb-10">
                    <div className="text-xs uppercase tracking-[0.22em] text-[#f5d38a]">
                      {current.eyebrow}
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:mt-4 sm:text-4xl lg:text-5xl">
                      {current.title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:mt-4 sm:text-base sm:leading-8">
                      {current.subtitle}
                    </p>
                  </div>

                  {current.key === "windowType" && <OptionGrid options={optionGroups.windowType} value={form.windowType} onSelect={(value) => updateField("windowType", value)} />}
                  {current.key === "purpose" && <OptionGrid options={optionGroups.purpose} value={form.purpose} onSelect={(value) => updateField("purpose", value)} />}
                  {current.key === "fabricStyle" && <OptionGrid options={optionGroups.fabricStyle} value={form.fabricStyle} onSelect={(value) => updateField("fabricStyle", value)} />}
                  {current.key === "liningType" && <OptionGrid options={optionGroups.liningType} value={form.liningType} onSelect={(value) => updateField("liningType", value)} />}
                  {current.key === "roomType" && <OptionGrid options={optionGroups.roomType} value={form.roomType} onSelect={(value) => updateField("roomType", value)} />}
                  {current.key === "headingStyle" && <OptionGrid options={optionGroups.headingStyle} value={form.headingStyle} onSelect={(value) => updateField("headingStyle", value)} />}

                  {current.key === "imageUpload" && (
                    <div>
                      <label className="group flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/5 p-6 text-center transition hover:border-[#f5d38a]/30 hover:bg-white/10 sm:min-h-[340px] sm:rounded-[28px] sm:p-8">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#f5d38a]/20 bg-[#f5d38a]/10 text-[#f5d38a] sm:h-16 sm:w-16">
                          <ImagePlus className="h-7 w-7" />
                        </div>
                        <div className="mt-5 text-lg font-medium sm:mt-6 sm:text-xl">
                          Add your window photo
                        </div>
                        <div className="mt-2 text-sm text-white/55">
                          Optional • JPG, PNG or WebP
                        </div>
                        {form.photoName && <div className="mt-4 text-sm text-[#f5d38a]">Arlo note: {form.photoName}</div>}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                      </label>

                      {form.imagePreview && (
                        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/30 sm:mt-6 sm:rounded-[28px]">
                          <img src={form.imagePreview} alt="Uploaded window preview" className="h-[260px] w-full object-contain sm:h-[360px]" />
                        </div>
                      )}
                    </div>
                  )}

                  {current.key === "name" && <SingleInput icon={<User className="h-5 w-5" />} type="text" value={form.name} onChange={(value) => updateField("name", value)} placeholder="Enter your full name" />}
                  {current.key === "email" && <SingleInput icon={<Mail className="h-5 w-5" />} type="email" value={form.email} onChange={(value) => updateField("email", value)} placeholder="Enter your email address" />}
                  {current.key === "phone" && <SingleInput icon={<Phone className="h-5 w-5" />} type="tel" value={form.phone} onChange={(value) => updateField("phone", value)} placeholder="Enter your phone number" />}
                  {current.key === "postcode" && <SingleInput icon={<MapPin className="h-5 w-5" />} type="text" value={form.postcode} onChange={(value) => updateField("postcode", value)} placeholder="Enter your postcode" />}
                  {current.key === "contactTime" && <OptionGrid options={optionGroups.contactTime} value={form.contactTime} onSelect={(value) => updateField("contactTime", value)} />}

                  {current.key === "review" && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 sm:rounded-[28px] sm:p-6">
                        {form.recommendationTitle && (
                          <div className="mb-5 rounded-[18px] border border-[#f5d38a]/20 bg-[#f5d38a]/10 p-4">
                            <div className="text-xs uppercase tracking-[0.14em] text-[#f5d38a]">Arlo recommendation</div>
                            <div className="mt-2 text-base font-medium text-white">{form.recommendationTitle}</div>
                          </div>
                        )}
                        <ReviewItem label="Window type" value={form.windowType} />
                        <ReviewItem label="Main goal" value={form.purpose} />
                        <ReviewItem label="Fabric style" value={form.fabricStyle} />
                        <ReviewItem label="Lining type" value={form.liningType} />
                        <ReviewItem label="Room type" value={form.roomType} />
                        <ReviewItem label="Heading style" value={form.headingStyle} />
                        <ReviewItem label="Name" value={form.name} />
                        <ReviewItem label="Email" value={form.email} />
                        <ReviewItem label="Phone" value={form.phone} />
                        <ReviewItem label="Postcode" value={form.postcode} />
                        <ReviewItem label="Best contact time" value={form.contactTime} />
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 sm:rounded-[28px] sm:p-6">
                        <div className="text-sm text-white/50">Uploaded window photo</div>
                        {form.imagePreview ? (
                          <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-black/30">
                            <img src={form.imagePreview} alt="Uploaded window" className="h-[260px] w-full object-contain sm:h-[360px]" />
                          </div>
                        ) : (
                          <div className="mt-4 text-white/50">No image uploaded — you can provide one later.</div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 0}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </button>

              {step < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed}
                  className="inline-flex items-center justify-center rounded-full bg-[#f5d38a] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476] disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
                >
                  {current.key === "imageUpload" && !form.imageFile ? "Skip for now" : "Next"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-[#f5d38a] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#e6c476] disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
                >
                  {submitting ? "Submitting..." : "Submit enquiry"}
                  {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

const screenVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
    filter: "blur(6px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    filter: "blur(6px)",
  }),
};

function mapArloWindowTypeToForm(value: string) {
  const v = value.toLowerCase();
  if (v.includes("apex")) return "Apex";
  if (v.includes("triangular")) return "Triangular";
  if (v.includes("gable")) return "Barn Conversion";
  if (v.includes("feature")) return "Other Shape";
  if (v.includes("not sure")) return "Not Sure";
  return "";
}

function mapArloRoomToForm(value: string) {
  const v = value.toLowerCase();
  if (v.includes("bedroom")) return "Bedroom";
  if (v.includes("living")) return "Lounge / Living Room";
  if (v.includes("barn")) return "Barn Conversion";
  return "";
}

function mapArloPriorityToForm(value: string) {
  const v = value.toLowerCase();
  if (v.includes("privacy")) return "Privacy";
  if (v.includes("blackout")) return "A mix of everything";
  if (v.includes("warmth")) return "A mix of everything";
  if (v.includes("luxury")) return "Interior design / aesthetics";
  if (v.includes("shape visible")) return "Interior design / aesthetics";
  if (v.includes("mix")) return "A mix of everything";
  return "";
}

function mapArloHeadingToForm(value: string) {
  const v = value.toLowerCase();
  if (v.includes("wave")) return "Wave Pleat";
  if (v.includes("pencil")) return "Pencil Pleat";
  if (v.includes("pinch")) return "Hand-sewn Pinch Pleat";
  return "";
}

function mapArloLiningToForm(value: string) {
  const v = value.toLowerCase();
  if (v.includes("blackout")) return "Blackout";
  if (v.includes("thermal")) return "Thermal";
  return "";
}

function OptionGrid({
  options,
  value,
  onSelect,
}: {
  options: Array<string | { label: string; description?: string; image?: string }>;
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {options.map((option, index) => {
        const item = typeof option === "string" ? { label: option, description: "", image: "" } : option;
        const active = value === item.label;

        return (
          <motion.button
            key={`${item.label}-${index}`}
            type="button"
            onClick={() => onSelect(item.label)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className={`rounded-[22px] border p-4 text-left transition sm:rounded-[24px] sm:p-5 ${
              active
                ? "border-[#f5d38a]/50 bg-[#f5d38a]/10 shadow-[0_0_30px_rgba(245,211,138,0.12)]"
                : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            {item.image ? <img src={item.image} alt={item.label} loading="lazy" className="mb-4 h-28 w-full rounded-[18px] object-cover sm:h-36" /> : null}

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-medium sm:text-lg">{item.label}</div>
                {item.description ? <div className="mt-2 text-sm text-white/60">{item.description}</div> : null}
              </div>

              {active ? (
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5d38a] text-black">
                  <Check className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function SingleInput({
  icon,
  type,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 sm:gap-4 sm:rounded-[24px] sm:px-5 sm:py-5">
        <div className="text-[#f5d38a]">{icon}</div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-lg text-white outline-none placeholder:text-white/30 sm:text-xl"
          autoFocus
        />
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4">
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-1 text-white">{value || "—"}</div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-white/45">{label}</div>
      <div className="mt-2 text-sm text-white">{value || "—"}</div>
    </div>
  );
}
