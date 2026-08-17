import type { ReactNode } from "react";
import AuthorityLinks from "@/components/seo/AuthorityLinks";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/services");

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AuthorityLinks
        eyebrow="Plan the complete solution"
        heading="Understand the track, curtain function and window type before installation"
      />
    </>
  );
}
