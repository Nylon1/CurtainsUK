import type { ReactNode } from "react";
import DesignDetailLinks from "@/components/seo/DesignDetailLinks";

export default function CurtainSolutionsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DesignDetailLinks />
    </>
  );
}
