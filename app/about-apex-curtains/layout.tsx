import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/about-apex-curtains");

export default function AboutApexCurtainsLayout({ children }: { children: ReactNode }) {
  return children;
}
