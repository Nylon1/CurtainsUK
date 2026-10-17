/** Customer specification only. No supplier prices or inferred package choices. */
export const SMART_TRACK_VERSION = 1 as const;
export type SmartTrackSystem = "FOREST_SHUTTLE_GO" | "FOREST_SHUTTLE_ION";
export type TrackHeading = "PENCIL" | "PINCH" | "WAVE";
export type TrackOpening = "CENTRE" | "LEFT" | "RIGHT";
export type WeightMaterial = {
  name: "face" | "lining" | "interlining" | "components";
  metres?: number;
  widthCm?: number;
  areaM2?: number;
  grams?: number;
  density?: number;
  unit?: "GSM" | "G_PER_LINEAR_METRE";
  evidence?: string;
};
export type TrackWeightInput =
  | { mode: "UNKNOWN" }
  | { mode: "MEASURED"; kg: number }
  | {
      mode: "EXISTING_ESTIMATE";
      panels: number;
      dropCm: number;
      widthCm: number;
      widthBasis: "FLAT" | "COVERAGE";
      fullness?: number;
      gsm?: number;
      liningGsm?: number;
      interliningGsm?: number;
      lining: boolean;
      interlining: boolean;
    }
  | { mode: "CURTAINSUK"; configurationId: string };
export type SmartTrackSpec = {
  version: 1;
  id: string;
  productType: "SMART_TRACK";
  system: SmartTrackSystem;
  /** Exact customer text survives pricing and fulfilment; never band-rounded. */
  lengthCm: string;
  shape: "STRAIGHT";
  heading: TrackHeading;
  opening: TrackOpening;
  waveSpacingMm?: 60 | 80;
  mounting: "WALL" | "CEILING";
  motorSide: "LEFT" | "RIGHT";
  viewpoint: "INSIDE_FACING_WINDOW";
  quantity: number;
  weight: TrackWeightInput;
  linkedCurtain?: {
    configurationId: string;
    specificationDigest: string;
    coverageConfirmed: boolean;
  };
  powerLocationChecked: boolean;
  measurementsConfirmed: boolean;
};
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function exactLength(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{1,3}(?:\.\d{1,6})?$/.test(value) ||
    !(Number(value) > 0) ||
    Number(value) > 500
  )
    throw Error("TRACK_LENGTH_INVALID");
  return value;
}
const positive = (x: unknown, maximum: number) =>
  typeof x === "number" && Number.isFinite(x) && x > 0 && x <= maximum;
export function parseWeight(value: unknown): TrackWeightInput {
  if (!value || typeof value !== "object") throw Error("TRACK_WEIGHT_INVALID");
  const v = value as Record<string, unknown>;
  if (v.mode === "UNKNOWN") return { mode: "UNKNOWN" };
  if (v.mode === "MEASURED" && positive(v.kg, 1000))
    return { mode: "MEASURED", kg: v.kg as number };
  if (
    v.mode === "CURTAINSUK" &&
    typeof v.configurationId === "string" &&
    UUID.test(v.configurationId)
  )
    return { mode: "CURTAINSUK", configurationId: v.configurationId };
  if (
    v.mode === "EXISTING_ESTIMATE" &&
    Number.isSafeInteger(v.panels) &&
    positive(v.panels, 50) &&
    positive(v.dropCm, 2000) &&
    positive(v.widthCm, 5000) &&
    ["FLAT", "COVERAGE"].includes(String(v.widthBasis)) &&
    (v.widthBasis === "FLAT" || positive(v.fullness, 10)) &&
    typeof v.lining === "boolean" &&
    typeof v.interlining === "boolean" &&
    [v.gsm, v.liningGsm, v.interliningGsm].every(
      (x) => x === undefined || positive(x, 5000),
    )
  ) {
    return {
      mode: v.mode,
      panels: v.panels as number,
      dropCm: v.dropCm as number,
      widthCm: v.widthCm as number,
      widthBasis: v.widthBasis as "FLAT" | "COVERAGE",
      ...(v.widthBasis === "COVERAGE"
        ? { fullness: v.fullness as number }
        : {}),
      ...(v.gsm === undefined ? {} : { gsm: v.gsm as number }),
      ...(v.liningGsm === undefined
        ? {}
        : { liningGsm: v.liningGsm as number }),
      ...(v.interliningGsm === undefined
        ? {}
        : { interliningGsm: v.interliningGsm as number }),
      lining: v.lining,
      interlining: v.interlining,
    };
  }
  throw Error("TRACK_WEIGHT_INVALID");
}
export function parseSmartTrackSpec(value: unknown): SmartTrackSpec {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("TRACK_SPEC_INVALID");
  const v = value as Record<string, unknown>;
  if (
    v.version !== 1 ||
    v.productType !== "SMART_TRACK" ||
    !["FOREST_SHUTTLE_GO", "FOREST_SHUTTLE_ION"].includes(String(v.system)) ||
    !UUID.test(String(v.id)) ||
    v.shape !== "STRAIGHT" ||
    !["PENCIL", "PINCH", "WAVE"].includes(String(v.heading)) ||
    !["CENTRE", "LEFT", "RIGHT"].includes(String(v.opening)) ||
    !["WALL", "CEILING"].includes(String(v.mounting)) ||
    !["LEFT", "RIGHT"].includes(String(v.motorSide)) ||
    v.viewpoint !== "INSIDE_FACING_WINDOW" ||
    !Number.isSafeInteger(v.quantity) ||
    !positive(v.quantity, 50) ||
    typeof v.powerLocationChecked !== "boolean" ||
    typeof v.measurementsConfirmed !== "boolean"
  )
    throw Error("TRACK_SPEC_INVALID");
  let linkedCurtain: SmartTrackSpec["linkedCurtain"];
  if (v.heading === "WAVE" && v.waveSpacingMm !== 60 && v.waveSpacingMm !== 80)
    throw Error("TRACK_WAVE_SPACING_REQUIRED");
  if (v.linkedCurtain !== undefined) {
    const link = v.linkedCurtain as NonNullable<
      SmartTrackSpec["linkedCurtain"]
    >;
    if (
      !link ||
      !UUID.test(link.configurationId) ||
      !/^[a-f0-9]{64}$/.test(link.specificationDigest) ||
      typeof link.coverageConfirmed !== "boolean"
    )
      throw Error("TRACK_LINK_INVALID");
    linkedCurtain = {
      configurationId: link.configurationId,
      specificationDigest: link.specificationDigest,
      coverageConfirmed: link.coverageConfirmed,
    };
  }
  return {
    version: 1,
    id: String(v.id),
    productType: "SMART_TRACK",
    system: v.system as SmartTrackSystem,
    lengthCm: exactLength(v.lengthCm),
    shape: "STRAIGHT",
    heading: v.heading as TrackHeading,
    ...(v.heading === "WAVE"
      ? { waveSpacingMm: v.waveSpacingMm as 60 | 80 }
      : {}),
    opening: v.opening as TrackOpening,
    mounting: v.mounting as "WALL" | "CEILING",
    motorSide: v.motorSide as "LEFT" | "RIGHT",
    viewpoint: "INSIDE_FACING_WINDOW",
    quantity: v.quantity as number,
    weight: parseWeight(v.weight),
    ...(linkedCurtain ? { linkedCurtain } : {}),
    powerLocationChecked: v.powerLocationChecked,
    measurementsConfirmed: v.measurementsConfirmed,
  };
}
