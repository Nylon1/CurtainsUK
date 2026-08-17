import type { Metadata } from "next";
import LocalAuthoritySection from "@/components/seo/LocalAuthoritySection";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ city: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { city } = await params;
  const canonical = `https://www.apexcurtains.com/areas/${city}`;

  return {
    alternates: {
      canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
}

export default async function AreaCityLayout({ children, params }: LayoutProps) {
  const { city } = await params;

  return (
    <>
      {children}
      <LocalAuthoritySection citySlug={city} />
    </>
  );
}
