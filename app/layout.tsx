import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const SITE_URL = "https://www.curtainsuk.com";

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
    default: "CurtainsUK | Curtains for Every Window",
    template: "%s | CurtainsUK",
  },
  description:
    "Made-to-measure curtains for standard, bay, apex, triangular, gable, tall, wide and unusual windows.",
  keywords: [
    "made to measure curtains",
    "bay window curtains",
    "apex curtains",
    "curtains for unusual windows",
  ],
  openGraph: {
    title: "CurtainsUK | Curtains for Every Window",
    description:
      "Made-to-measure curtains for standard, bay, apex, triangular, gable, tall, wide and unusual windows.",
    siteName: "CurtainsUK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CurtainsUK | Curtains for Every Window",
    description:
      "Made-to-measure curtains for standard, bay, apex, triangular, gable, tall, wide and unusual windows.",
  },
  robots: { index: false, follow: false },
};

const globalSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "CurtainsUK",
      url: SITE_URL,
      description:
        "Made-to-measure curtains for standard and specialist-shaped windows across the UK.",
      areaServed: {
        "@type": "Country",
        name: "United Kingdom",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "CurtainsUK",
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
    <html lang="en-GB">
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
