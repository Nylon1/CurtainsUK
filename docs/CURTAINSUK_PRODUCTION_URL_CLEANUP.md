# Production URL and environment cleanup

Verified 14 September 2026 on https://www.curtainsuk.com.

## Deployed changes

- Application commit `100d652`: existing customer HCI presentation and commands served through the signed Shopify app proxy on the production hostname. No recommendation/ranking change.
- Theme follow-up `a35c52b`: cart drawer/notification link to the existing validated basket instead of displaying a disabled staging checkout button.
- Live theme remains Dawn `182264234363`; Minimal `79650455661` remains the rollback reference.
- Gateway deployment: `curtainsuk-staging-sxh8sjozn-hamzas-projects-4ef62f35.vercel.app`, assigned to the existing internal gateway alias. No Vercel production-project promotion.
- Live settings readback: purchase controls true, staging mode false. Settings were read, not overwritten.

## Verification

| Check | Result |
| --- | --- |
| Production staging banner/copy | PASS: clean in crawl and browser; announcement is Made-to-measure curtains / UK delivery |
| Reachable document crawl | PASS: 19 pages, all 200, zero remaining crawl queue, zero staging-copy matches, zero Vercel navigation links |
| Linked query routes | PASS: 16 window/HCI routes, all 200, no Vercel navigation links |
| Anonymous HCI | PASS: production-domain bootstrap, questions, calibration, approved cohort image extraction, palette addition/confirmation, five directions and one refinement |
| HCI sample/return | PASS: exact recommended VARINI WOODROSE identity; sample intent and return to saved final shortlist stay same-origin |
| HCI Make Curtains | PASS: exact recommended fabric and Standard window retained in configurator; return link same-origin |
| Upload-first entry | PASS: fresh consultation opens optional image controls on production hostname |
| Sample checkout | PASS to payment boundary: existing Sadira Lagoon sample, one line, SKU 4262/770, GBP 1.00 total, free native sample shipping, GBP 0.17 included tax; Shop Pay is an intended payment-provider exception |
| Additional payment | None: payment not submitted; rehearsal basket removed and empty state verified |
| Purchase controls | PASS: live theme true; server sample preparation true and actual existing GBP 1.00 price |
| Production indexing | PASS: production canonical and no staging noindex on homepage |
| Separate staging | PASS: gateway consultation retains explicit internal preview identification and noindex/nofollow/noarchive |
| Mobile | PASS: 390 and 412 homepage/shortlist checks, no horizontal overflow; 412 configurator/sample handoffs |
| Runtime | PASS: no Vercel 5xx log entries during the inspected 45-minute window |
| Tests | PASS: 302 tests; TypeScript, changed TypeScript lint and deployment build passed |

The new customer routes use `/apps/curtainsuk-decision/consultation`, not a redirect to a Vercel page. Shopify strips cookies from app-proxy traffic. A signed, expiring visitor capability therefore scopes this transport to the visitor's own consultation; it is not an HCI or service credential. Existing ownership, revision, idempotency and rate-limit checks remain. Remote tests rejected another visitor's session (409), forged capability (401), and foreign-origin mutation (403).

The direct internal gateway/staging routes remain available for their existing purpose. Their URLs are no longer customer navigation destinations. Existing saved HCI handoff return origins cannot send the browser to the old gateway. Old gateway-owned consultations are not silently adopted by another anonymous identity.

## Audit coverage and external links

Reviewed theme Liquid/JS/settings, deployed settings readback, app-proxy configuration, public page/policy/navigation renderings and available shop metafields. No staging URL found in the deployed settings or queried shop metafields. Shopify app configuration intentionally retains server/admin application, OAuth and proxy gateway destinations. These are not customer navigation links.

Existing app scopes do not allow enumerating Shopify Page or Menu objects through Admin GraphQL. No additional scopes were requested. Their reachable customer renderings were crawled instead; this is not a claim to have enumerated every unused/hidden Shopify content object or every Fabric Master record.

The crawl's external navigation hosts are intentional Shopify attribution/help and existing policy resource links: www.shopify.com, help.shopify.com, policies.google.com, tools.google.com, www.networkadvertising.org, www.facebook.com, www.google.com, advertise.bingads.microsoft.com, optout.aboutads.info, www.allaboutcookies.org and ico.org.uk. Shopify CDN images/resources are expected; live checkout may use the selected payment provider, observed shop.app.

Corrected the existing privacy-policy cookie-information href from a relative `www.allaboutcookies.org` to `https://www.allaboutcookies.org`. Verified on the live page. No policy text was rewritten.

## Separate owner content issue

The existing Shopify privacy policy still contains `creativecurtainsonline.com` and unfilled template placeholders (including contact/date and optional processing statements). This is a real legacy policy-content issue, outside this routing-only patch. The owner must supply/approve accurate final legal content; no business/legal claims were invented in this task.

Local audit details are in Downloads (`production-url-crawl.json`, `production-query-route-audit.json`, `production-proxy-security.jsonl`, deployment/test/runtime logs). Customer data, visitor capabilities and raw reference images are not committed.
