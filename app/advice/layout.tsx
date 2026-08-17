import type { ReactNode } from "react";
import AuthorityLinks from "@/components/seo/AuthorityLinks";
import { canonicalMetadata } from "@/lib/seo-metadata";

export const metadata = canonicalMetadata("/advice");

export default function AdviceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AuthorityLinks
        eyebrow="From advice to solution"
        heading="Connect the answer to the window, track and finished curtain solution"
      />
    </>
  );
}
