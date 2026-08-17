import type { Metadata } from "next";
import InfoPageTemplate from "@/components/layout/InfoPageTemplate";

export const metadata: Metadata = {
  title: { absolute: "Apex Curtains TV Advertising | Seen on TV" },
  description:
    "Apex Curtains has advertised on television, including campaigns shown on premium TV channels. Learn more about our broadcast advertising activity.",
  alternates: {
    canonical: "https://www.apexcurtains.com/seen-on-tv",
  },
  openGraph: {
    title: "Apex Curtains TV Advertising | Seen on TV",
    description:
      "Apex Curtains has advertised on television as part of its national brand and specialist architectural-curtain campaigns.",
    url: "https://www.apexcurtains.com/seen-on-tv",
    siteName: "Apex Curtains",
    type: "website",
  },
};

export default function Page() {
  return (
    <InfoPageTemplate
      title="Apex Curtains on TV"
      breadcrumb="Seen on TV"
      intro="Apex Curtains has run television advertising as part of our wider UK brand campaigns for specialist curtains and difficult architectural windows."
      section1Title="Television advertising"
      section1Text="Our advertising has appeared on television, including premium channels, helping us introduce Apex Curtains and our specialist work with apex, triangular, gable-end and unusual windows to a wider audience."
      section2Title="Advertising, not editorial coverage"
      section2Text="We describe this clearly as paid television advertising rather than independent editorial endorsement. That distinction keeps the claim accurate while still documenting a genuine part of the Apex Curtains brand story."
      section3Title="Campaign records"
      section3Text="As campaign records, dates, channels and approved creative assets are organised, this page can be expanded with more specific broadcast details and supporting material."
    />
  );
}
