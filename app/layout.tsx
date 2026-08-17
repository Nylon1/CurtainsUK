import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const SITE_URL = "https://www.apexcurtains.com";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Apex Curtains | Curtains for Apex, Triangular & Architectural Windows",
    template: "%s | Apex Curtains",
  },
  description:
    "Specialists in curtains for apex, triangular, gable end and architectural windows across the UK.",
  keywords: [
    "apex curtains",
    "triangular window curtains",
    "gable end curtains",
    "architectural window curtains",
    "curtains for shaped windows",
    "apex window curtains UK",
  ],
  openGraph: {
    title: "Apex Curtains",
    description:
      "Specialists in curtains for apex, triangular, gable end and architectural windows across the UK.",
    siteName: "Apex Curtains",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apex Curtains",
    description:
      "Specialists in curtains for apex, triangular, gable end and architectural windows across the UK.",
  },
};

const globalSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Apex Curtains",
      url: SITE_URL,
      description:
        "Specialists in curtains for apex, triangular, gable end and architectural windows across the UK.",
      areaServed: {
        "@type": "Country",
        name: "United Kingdom",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Apex Curtains",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalSchema) }}
        />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
