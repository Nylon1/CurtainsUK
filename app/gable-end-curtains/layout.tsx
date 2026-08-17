import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/gable-end-curtains");

export default function GableEndCurtainsLayout({ children }: { children: ReactNode }) {
  return children;
}
