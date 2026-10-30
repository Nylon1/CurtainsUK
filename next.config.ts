import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project deploys from the protected checkout with Vercel CLI and has
  // no Git connection. Bake the operator-verified protected SHA into that build.
  // An omitted value keeps Jane disabled; the SHA is public, never a secret.
  env: { JANE_COMPILED_SOURCE_COMMIT: process.env.CURTAINSUK_BUILD_SOURCE_COMMIT ?? "" },
  turbopack: { root: process.cwd() },
  outputFileTracingIncludes: { "/hotel-design-studio-preview/**": ["./lib/hotel-studio/runtime/**/*"], "/api/staging/shopify-proxy/hotel-studio/**": ["./lib/hotel-studio/runtime/**/*"], "/api/staging/shopify-proxy/smart-track/**": ["./lib/smart-track/runtime/*","./shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-rooms-store.js"], "/api/staging/shopify-proxy/cushion-studio/**": ["./lib/cushion-studio/runtime/geometry.mjs"], "/cushion-studio-preview/**": ["./lib/cushion-studio/runtime/geometry.mjs"], "/api/staging/shopify-proxy/*": ["./lib/room-visualiser/runtime/rooms/customer.html","./lib/room-visualiser/profile-curtain.html","./lib/storefront/hci/consultation.html", "./lib/storefront/hci/consultation.css", "./lib/storefront/hci/consultation.js", "./lib/storefront/hci/visuals/*.svg", "./lib/storefront/hci/privacy.html", "./lib/storefront/hci/premium/*"], "/curtain-consultation": ["./lib/storefront/hci/consultation.html"], "/api/curtain-consultation/assets/*": ["./lib/storefront/hci/consultation.css", "./lib/storefront/hci/consultation.js", "./lib/storefront/hci/visuals/*.svg"], "/admin/curtain-consultation": ["./lib/storefront/hci/consultation.html"], "/api/admin/curtain-consultation/assets/*": ["./lib/storefront/hci/consultation.css", "./lib/storefront/hci/consultation.js", "./lib/storefront/hci/visuals/*.svg"] },
  // Shopify app proxies can forward a trailing slash. Serving both forms
  // directly avoids a redirect back onto the storefront host.
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.prestigious.co.uk", pathname: "/assets/**" },
      { protocol: "https", hostname: "trade.sandersondesigngroup.com", pathname: "/static/media/catalog/product/**" },
    ],
  },
  async headers() {
    return [{source:'/room-visualiser/:version/:path*',headers:[
      {key:'Cache-Control',value:'public, max-age=31536000, immutable'},
      {key:'Access-Control-Allow-Origin',value:'https://www.curtainsuk.com'},
      {key:'Timing-Allow-Origin',value:'https://www.curtainsuk.com'},
      {key:'X-Content-Type-Options',value:'nosniff'},
    ]}];
  },
  async rewrites() {
    return [{
      source: '/room-visualiser/fixed140/:asset',
      destination: 'https://74iymdcvkhmv4pak.public.blob.vercel-storage.com/room-visualiser/fixed140/:asset',
    }];
  },
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
      {
        source: "/meetarlo",
        destination: "/arlo-curtain-advisor",
        permanent: true,
      },
      {
        source: "/advice/what-curtain-track-is-best-for-apex-windows",
        destination: "/curtain-tracks",
        permanent: true,
      },
      {
        source: "/advice/can-you-put-curtains-on-angled-windows",
        destination: "/apex-curtains",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
