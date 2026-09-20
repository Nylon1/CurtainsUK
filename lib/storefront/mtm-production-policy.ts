import type { HeadingType } from "@/lib/decision-engine/types";

export const AUTOMATED_MTM_WINDOW_SLUGS = [
  "standard-window",
  "patio-sliding-doors",
  "french-doors",
  "bifold-doors",
  "bay-window",
] as const;

export type AutomatedMtmWindowSlug = (typeof AUTOMATED_MTM_WINDOW_SLUGS)[number];
export type MtmHardware = "TRACK" | "POLE";
export type MtmDesiredFinish = "SHORT" | "FLOOR" | "SOFT_BREAK" | "PUDDLE";

const TRACK_HEADINGS: readonly HeadingType[] = ["PENCIL_PLEAT", "DOUBLE_PINCH", "WAVE"];
const POLE_HEADINGS: readonly HeadingType[] = ["PENCIL_PLEAT", "DOUBLE_PINCH", "EYELET"];
const BAY_HEADINGS: readonly HeadingType[] = ["PENCIL_PLEAT", "DOUBLE_PINCH"];

export function isAutomatedMtmWindowSlug(value: string): value is AutomatedMtmWindowSlug {
  return (AUTOMATED_MTM_WINDOW_SLUGS as readonly string[]).includes(value);
}

export function headingsForAutomatedMtm(input: {
  windowSlug: AutomatedMtmWindowSlug;
  hardware: MtmHardware;
}): readonly HeadingType[] {
  if (input.windowSlug === "bay-window") return input.hardware === "TRACK" ? BAY_HEADINGS : [];
  return input.hardware === "TRACK" ? TRACK_HEADINGS : POLE_HEADINGS;
}

export function assertAutomatedMtmCompatibility(input: {
  windowSlug: string;
  hardware: MtmHardware;
  heading: HeadingType;
}): void {
  if (!isAutomatedMtmWindowSlug(input.windowSlug)) {
    throw new Error("MTM_AUTOMATED_OPENING_UNAVAILABLE");
  }
  if (input.windowSlug === "bay-window" && input.hardware !== "TRACK") {
    throw new Error("MTM_BAY_REQUIRES_EXISTING_TRACK");
  }
  if (!headingsForAutomatedMtm({ windowSlug: input.windowSlug, hardware: input.hardware }).includes(input.heading)) {
    throw new Error("MTM_HARDWARE_HEADING_INCOMPATIBLE");
  }
}

export function measurementAnchors(input: {
  windowSlug: AutomatedMtmWindowSlug;
  hardware: MtmHardware;
  heading: HeadingType;
}): Readonly<{ width: "TRACK_FULL_WIDTH" | "POLE_BETWEEN_FINIALS" | "BAY_TRACK_ROUTE"; drop: "TRACK_TOP_TO_FINISH" | "TRACK_BOTTOM_TO_FINISH" | "POLE_BOTTOM_TO_FINISH" }> {
  if (input.windowSlug === "bay-window") {
    return { width: "BAY_TRACK_ROUTE", drop: "TRACK_TOP_TO_FINISH" };
  }
  if (input.hardware === "POLE") {
    return { width: "POLE_BETWEEN_FINIALS", drop: "POLE_BOTTOM_TO_FINISH" };
  }
  return {
    width: "TRACK_FULL_WIDTH",
    drop: input.heading === "WAVE" ? "TRACK_BOTTOM_TO_FINISH" : "TRACK_TOP_TO_FINISH",
  };
}
