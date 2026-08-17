import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/advice");

export default function AdviceLayout({ children }: { children: ReactNode }) {
  return children;
}
