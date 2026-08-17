import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/large-window-curtains");

export default function LargeWindowCurtainsLayout({ children }: { children: ReactNode }) {
  return children;
}
