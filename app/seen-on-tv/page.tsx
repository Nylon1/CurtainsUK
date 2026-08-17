import type { Metadata } from "next";
import InfoPageTemplate from "@/components/layout/InfoPageTemplate";

export const metadata: Metadata = {
  title: { absolute: "Media Features | Apex Curtains" },
  description:
    "Media references for Apex Curtains will be published when supporting campaign or publication records are available.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page() {
  return (
    <InfoPageTemplate
      title="Media Features"
      breadcrumb="Media Features"
      intro="We publish media and broadcast references only when they can be supported by a campaign, publication or feature record."
      section1Title="Verification first"
      section1Text="Media claims are being reviewed against source records before they are presented publicly as proof points."
      section2Title="Press enquiries"
      section2Text="Journalists, editors and producers can contact Apex Curtains for information about our specialist work with apex, triangular and architecturally unusual windows."
      section3Title="Future updates"
      section3Text="Verified media appearances, campaign references and approved logos can be added here once the supporting records are documented."
    />
  );
}
