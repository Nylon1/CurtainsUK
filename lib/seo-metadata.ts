import type { Metadata } from "next";

export const SITE_URL = "https://www.apexcurtains.com";

export function canonicalMetadata(pathname: string): Metadata {
  const path = pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = `${SITE_URL}${path}`;

  return {
    alternates: {
      canonical: url,
    },
    openGraph: {
      url,
      siteName: "Apex Curtains",
    },
  };
}
