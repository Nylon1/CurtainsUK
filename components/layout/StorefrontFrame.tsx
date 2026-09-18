"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { isPremiumConsultationPath } from "@/lib/storefront/consultation-navigation";

export default function StorefrontFrame({ children }: { children: React.ReactNode }) {
  // The consultation is an application journey. Shopify owns storefront navigation.
  const consultation = isPremiumConsultationPath(usePathname());
  return <>{!consultation && <Navbar />}{children}{!consultation && <Footer />}</>;
}
