import type { ReactNode } from "react";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/gallery");

export default function GalleryLayout({ children }: { children: ReactNode }) {
  return children;
}
