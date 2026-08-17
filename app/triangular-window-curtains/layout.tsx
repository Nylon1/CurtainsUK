import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/triangular-window-curtains");

export default function TriangularCurtainsLayout({ children }: { children: ReactNode }) {
  return children;
}
