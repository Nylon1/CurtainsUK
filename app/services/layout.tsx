import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/services");

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return children;
}
