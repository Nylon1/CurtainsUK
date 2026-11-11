# Customer Experience monitoring 2.0

Production source: `release/production`. The scheduled workflow lives on GitHub's
default `main` branch and checks out `release/production` for its test code.
Its workflow copy must be synchronised to `main` after the protected production
release. A manual workflow dispatch is required for the first live heartbeat.
Preserve the `ref: release/production` checkout in the default-branch copy.

Browser installation has two bounded attempts. Pricing and checkout contracts
run before browser installation, so an Ubuntu mirror or browser download outage
does not suppress those independent checks. Browser scans run only after a
successful installation. Unrun checks remain failing coverage, with a `BACKEND`
classification and `MONITOR_BROWSER_SETUP_FAILED`,
`MONITOR_DEPENDENCY_SETUP_FAILED` or `MONITOR_CHECK_NOT_RUN` reason; they do not
claim a checkout assertion failed. A valid later scan explicitly passes the
`public-journeys` output check so a missing-output incident can recover.

Reporting and recovery regression checks:
`node --import tsx --test scripts/customer-journey-report.test.mjs lib/storefront/synthetic-monitor.test.ts`.

## Separate operational sources

| Source | What it records | Consent boundary |
| --- | --- | --- |
| Browser journeys | Visits, navigation, cart and checkout steps, performance | Shopify analytics permission |
| Browser technical faults | Fixed error code, safe page path, feature, script basename and position | Recorded without analytics permission; no cookies, storage identity, form values, URL query, free text or channel |
| Server faults | Route template, fixed code, status, release and bounded diagnostic | Server-side operational logging |
| Synthetic runs | Start, completion, expected next run, passing and failing checks, workflow SHA, tested source SHA and API deployment | Signed GitHub Actions OIDC; stored separately from customer events |

The Error Centre displays synthetic checks in Journey health. `UNKNOWN` means no
run has arrived; `STALE` means the expected next run is missing. A check can
recover only after a later passing result. The persistent check registry makes
a removed check visible as degraded coverage. Critical synthetic failures
generate an immediate operational email when the configured mail service is
available. The hourly digest includes lower-priority open findings. The hourly
cron also alerts when the synthetic heartbeat becomes stale. Synthetic run
history is retained for 90 days; the check registry and current findings remain
until an intentional retirement or verified recovery.

## Current live check catalogue

The four-hour browser run covers the homepage, tool navigation, search,
contact, Fabric Library, Curtain Style, a published fabric profile and Making
Studio, Shop by Window, curtains and Roman prices, all five Room Visualiser
defaults, all six Design Library topics, Design My Home cart, native cart,
Cushion Studio, motorised tracks, Beyond Windows, Hotel Studio, hanging and
fitting guides, Fabric Intelligence match and guided entries, photo-analysis
entry, the five adviser sign-in boundaries, Jane and specialist service
authentication, sample preparation, and key mobile pages. It makes no payment
or order. The separate pricing/checkout contract suite runs every four hours.
The sitemap scanner rotates the current catalogue across six runs and checks
pages and representative products daily.

The monitor deliberately treats `CUSTOMER_SIGN_IN_REQUIRED` HTTP 401 from the
protected adviser services as a successful authentication boundary. Other
unexpected statuses are failures. All reports contain fixed technical codes
and public route paths only.

## Coverage limits

Page and frame loading does not prove every control works. This monitor does
not exercise actual photo upload and analysis, a valid private sample-credit
redemption, completed payment, customer email delivery, or signed-in adviser
conversations. These remain separate QA items. A controlled mobile sample-add
check reached the native cart during this implementation, but the scheduled
monitor uses read-only sample preparation to avoid creating unattended carts.

When a new customer tool or service is published, add a named functional check
to `scripts/customer-journey-smoke.mjs` or the checkout contracts and verify
its source release. The homepage navigation coverage check warns when a newly
linked studio, visualiser, adviser or cart route is absent from the catalogue.
