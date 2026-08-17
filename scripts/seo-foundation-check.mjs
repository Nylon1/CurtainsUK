import fs from "node:fs";

const checks = [];

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function expect(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
}

const layout = read("app/layout.tsx");
const robots = read("app/robots.ts");
const sitemapUtils = read("lib/sitemap-utils.ts");
const sitemapPages = read("app/sitemap-pages.xml/route.ts");
const advicePosts = read("lib/advice-posts.ts");
const advicePage = read("app/advice/[slug]/page.tsx");
const proxy = read("proxy.ts");
const nextConfig = read("next.config.ts");

expect(
  "final canonical origin is www",
  layout.includes('metadataBase: new URL("https://www.apexcurtains.com")'),
  "Root metadataBase must use the production www origin."
);
expect(
  "root does not force homepage canonical",
  !layout.includes('canonical: "/"'),
  "A global homepage canonical would collapse child-page signals."
);
expect(
  "sitemap utilities use www",
  sitemapUtils.includes('baseUrl = "https://www.apexcurtains.com"'),
  "All XML sitemap URLs must use the final host."
);
expect(
  "robots points to www sitemap",
  robots.includes('https://www.apexcurtains.com/sitemap.xml'),
  "robots.txt must advertise the final sitemap URL."
);
expect(
  "broken journey hub is not in static sitemap",
  !sitemapPages.includes('loc: `${baseUrl}/journey`'),
  "The nonexistent /journey hub must not be submitted."
);
expect(
  "homepage sitemap image uses real asset",
  sitemapPages.includes('/window-types/apex-hero.jpg'),
  "The homepage image entry must reference an existing asset."
);
expect(
  "published advice is filtered",
  advicePosts.includes('.eq("published", true)'),
  "Draft advice records must not enter public inventory/sitemaps."
);
expect(
  "duplicate advice slug is retired",
  advicePage.includes('best-curtains-for-apex-windows-expert-guide'),
  "Known duplicate advice URL must remain covered by a permanent redirect."
);
expect(
  "admin routes are server protected",
  proxy.includes('matcher: ["/admin/:path*"]') && proxy.includes('!user'),
  "Admin protection must run before client rendering."
);
expect(
  "non-www host permanently redirects",
  nextConfig.includes('permanent: true') && nextConfig.includes('host: "apexcurtains.com"'),
  "The non-www host must permanently consolidate to www."
);

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}`);
  if (!check.ok) console.log(`      ${check.detail}`);
}

if (failed.length) {
  console.error(`\n${failed.length} SEO foundation check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} SEO foundation checks passed.`);
