import type { SmartTrackSystem } from "./domain";
import type { CushionDispatchEstimate } from "../cushion-studio/dispatch";
/** Source-controlled supplier decisions. Null means unconfirmed, never a default offer. */
export type TrackPackage = {
  version: string;
  motorModel: "Forest Shuttle Go" | "Forest Shuttle iOn";
  motorArticle: string | null;
  trackSystem: string | null;
  controller: {
    model: string;
    article: string;
    channels: number;
    groups: boolean;
    reference: string;
  } | null;
  allHardwareIncluded: true;
  mounting: readonly ("WALL" | "CEILING")[];
  minimumLengthCm: number | null;
  precisionCm: string | null;
  waveSpacingMm: readonly number[] | null;
  finish: string | null;
  bracketSpecification: string | null;
  carrierSpecification: string | null;
  maximumLoadKg: number;
  configurationLimitsConfirmed: boolean;
  dispatch: CushionDispatchEstimate | null;
  multiTrackCarriageConfirmed: boolean;
  service: "SUPPLY_ONLY" | null;
  approvalReference: string | null;
};
export const TRACK_PACKAGE: Readonly<TrackPackage> = Object.freeze({
  version: "forest-shuttle-go-package-2026-10-17-v1",
  motorModel: "Forest Shuttle Go",
  motorArticle: null,
  trackSystem: null,
  controller: {
    model: "Forest EasyTouch 6-channel, matt white",
    article: "5201081006",
    channels: 6,
    groups: true,
    reference:
      "Owner photo and Forest EasyTouch manual 041024, confirmed 2026-10-17",
  },
  allHardwareIncluded: true,
  mounting: ["WALL", "CEILING"] as const,
  minimumLengthCm: null,
  precisionCm: null,
  waveSpacingMm: [60, 80],
  finish: null,
  bracketSpecification: null,
  carrierSpecification: null,
  maximumLoadKg: 35,
  configurationLimitsConfirmed: false,
  dispatch: null,
  multiTrackCarriageConfirmed: true,
  service: "SUPPLY_ONLY",
  approvalReference: null,
});
export const ION_PACKAGE: Readonly<TrackPackage> = Object.freeze({
  ...TRACK_PACKAGE,
  version: "forest-shuttle-ion-package-2026-10-17-v1",
  motorModel: "Forest Shuttle iOn",
  maximumLoadKg: 25,
});
export function trackPackage(system: SmartTrackSystem): Readonly<TrackPackage> {
  return system === "FOREST_SHUTTLE_ION" ? ION_PACKAGE : TRACK_PACKAGE;
}
export function customerTrackPackage(
  p: Readonly<TrackPackage> = TRACK_PACKAGE,
) {
  return {
    version: p.version,
    motor: p.motorModel,
    controller:
      p.controller?.model ?? "Included control, model awaiting confirmation",
    allHardwareIncluded: p.allHardwareIncluded,
    mounting: p.mounting,
    minimumLengthCm: p.minimumLengthCm,
    precisionCm: p.precisionCm,
    maximumLengthCm: 500,
    maximumLoadKg: p.maximumLoadKg,
    finish: p.finish,
    service: p.service,
    waveSpacingMm: p.waveSpacingMm,
    builtInWifi: p.motorModel === "Forest Shuttle Go",
    favourite: p.motorModel === "Forest Shuttle Go",
    power:
      p.motorModel === "Forest Shuttle Go"
        ? "Mains power with a UK three-pin plug. Forest specifies a 4 m cable."
        : "Rechargeable battery power. Allow access to remove and recharge the battery with its Forest charger.",
  };
}
