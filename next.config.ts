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
    ];
  },
};

export default nextConfig;
