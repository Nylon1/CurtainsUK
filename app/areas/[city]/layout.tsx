import type { Metadata } from "next";

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

export default function AreaCityLayout({ children }: LayoutProps) {
  return children;
}
