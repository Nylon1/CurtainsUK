import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/commercial-curtain-track-installation");

export default function CommercialCurtainTrackLayout({ children }: { children: ReactNode }) {
  return children;
}
