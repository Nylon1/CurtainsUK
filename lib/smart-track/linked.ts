import {
  roomsDigest,
  unseal,
  type RetainedClaims,
  type HouseReviewRequest,
} from "../storefront/rooms-core";
import type { LinkedCurtainEvidence } from "./pricing";
import type { HouseCheckoutServices } from "../storefront/rooms-checkout";
/** Only server-verified retained receipts are material/measurement evidence. */
export async function linkedCurtainEvidence(
  configurationId: string,
  house: HouseReviewRequest | undefined,
  services: HouseCheckoutServices,
  fabricWeight?: (
    id: string,
  ) => Promise<{ gsm: number | null; widthCm: number | null } | undefined>,
): Promise<LinkedCurtainEvidence | undefined> {
  const retained = house?.rooms
    .flatMap((r) => r.curtains)
    .find((c) => c.configuration_id === configurationId);
  if (!retained) return;
  const claims = unseal<RetainedClaims>(
    "retained",
    retained.receipt,
    services.secret,
  );
  if (claims.configuration_id !== configurationId) return;
  const c = claims.configuration;
  const calculated = await services.calculate(c);
  const evidence = await fabricWeight?.(c.fabricId);
  const face =
    evidence?.gsm && evidence.widthCm && calculated.fabricMetres
      ? {
          name: "face" as const,
          metres: calculated.fabricMetres,
          widthCm: evidence.widthCm,
          density: evidence.gsm,
          unit: "GSM" as const,
          evidence:
            "Fabric Master weight_gsm and full_width_mm; calculated fabric consumption",
        }
      : null;
  return {
    configurationId,
    specificationDigest: roomsDigest(c),
    heading:
      (
        {
          PENCIL_PLEAT: "PENCIL",
          DOUBLE_PINCH: "PINCH",
          TRIPLE_PINCH: "PINCH",
          WAVE: "WAVE",
        } as Record<string, string>
      )[c.heading] ?? "INCOMPATIBLE",
    opening: c.stackDirection === "SPLIT" ? "CENTRE" : c.stackDirection,
    coverageCm: c.widthCm ?? 0,
    measurementBasis: c.measurementBasis,
    weight: {
      materials: face ? [face] : [],
      complete: false,
      assumptions: [
        `CurtainsUK calculated face-fabric consumption: ${calculated.fabricMetres ?? "unconfirmed"} linear metres.`,
        `Finished drop ${c.dropCm} cm; lining ${c.lining}; interlining ${c.interlining}.`,
        face
          ? "Face-cloth estimate uses the current Fabric Master GSM and full cloth width, including calculated making allowances. Offcuts may overstate retained cloth. Lining, interlining and component weights still need confirmation."
          : "Governed fabric density and complete lining, interlining and making-component weights are required before estimating a total.",
      ],
    },
  };
}
