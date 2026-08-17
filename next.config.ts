import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "apexcurtains.com" }],
        destination: "https://www.apexcurtains.com/:path*",
        permanent: true,
      },
      {
        source: "/curtains-in-birmingham",
        destination: "/areas/birmingham",
        permanent: true,
      },
      {
        source: "/wave-pleat-curtains-on-apex-windows-elegant-solutions-for-modern-homes",
        destination: "/curtain-headings",
        permanent: true,
      },
      {
        source: "/our-price-promise",
        destination: "/get-curtain-quote",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
