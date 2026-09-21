import type { Metadata } from "next";
import { redirect } from "next/navigation";
export const metadata: Metadata = {title:"Room-image privacy | CurtainsUK",robots:{index:false,follow:false}};
export default function ImagePrivacy() {
  // Release with the canonical Shopify page; retain this historical entry point.
  redirect("https://www.curtainsuk.com/pages/room-image-ai-privacy");
}
