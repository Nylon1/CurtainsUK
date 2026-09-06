import type { Metadata } from "next";
import StorefrontHome from "@/components/storefront/StorefrontHome";

export const metadata: Metadata = {
  title: "Curtains for Every Window",
  description: "Made-to-measure curtains for standard, bay, apex, triangular, gable, tall, wide and unusual windows.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <StorefrontHome />;
}
