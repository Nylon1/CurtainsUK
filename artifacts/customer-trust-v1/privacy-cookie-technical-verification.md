# Customer Trust V1 — Privacy and Cookie Technical Verification

**Read-only evidence; no Shopify/Supabase/Vercel settings were changed.** 21 September 2026.

## Application and database evidence

- Supabase project: `hqysjumypgeapgmqkcrx` (CurtainsUK), `eu-central-1`, `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.166.
- No Supabase Edge Functions are configured.
- The private schema contains the governed supplier/catalogue tables and HCI/checkout staging tables. The relevant HCI persistence tables are RLS-enabled; no customer rows or secrets are included in this report.
- Current code path: the Vercel HCI gateway calls the configured image/recommendation service over HTTPS, hashes the customer owner before sending state, rejects raw image fields before persistence, and stores derived presentation/private state through guarded Supabase RPCs.
- The browser accepts one optional JPG/PNG/WebP image up to 2 MB and sends it to the HCI route for automated analysis. Guided Measure saves its draft locally under `curtainsuk.guided-measure.v1`; the code does not establish a universal expiry for that browser storage.
- `hci-image-privacy.ts` contains an application adapter contract (`REQUEST_ONLY`, maximum 30 days, training permission false). The `REQUEST_ONLY`/30-day values are not evidence of the upstream provider’s actual logs, backups, subprocessors or deletion behaviour, so the public draft does not state them as operational facts. The owner-approved no-training/no-reuse restriction remains the required service purpose.

## What is proven / not proven

Proven in code: image upload is optional; raw image payloads are rejected from the stored HCI state; derived colour/preferences/recommendation records can be persisted; the service call is HTTPS with a server-side token; no image data is intentionally used by the application for a reusable dataset.

Not yet proven from deployment/provider contracts: upstream temporary storage, processor/subprocessor identity, raw-image deletion timing, logs/backups, human access, international locations and transfer safeguards, and record-specific retention schedules. The Privacy and Room Image drafts therefore keep those details qualified and remain review-only.

## Shopify consent evidence

Read-only Shopify Admin inspection for `carpetup.myshopify.com` found:

- Customer Privacy automation is off.
- Shopify Network Intelligence is enabled; primary customer-data hosting is listed as the European Union.
- Cookie banner: not visible in any region; “show in checkout” is unchecked.
- Customer events list Facebook & Instagram Web, Google & YouTube Web, Pinterest Web, and TikTok Server + Web (with the Admin’s optimized-data indicators where shown).
- The saved privacy destination and notification sender still contain legacy configuration and require a separate Admin cleanup/write step before publication.

The integration list alone does not prove firing, consent gating, cookie duration or withdrawal behaviour. The candidate Cookie Information page therefore requires a real Accept/Reject/Preferences/withdrawal and pixel-blocking runtime test after Admin configuration.

## Scope boundary

No pricing, stock, Fabric Master, payment, PAID → REVIEW, workroom-release or cart-immutability code was changed. No cookie, policy, notification, OAuth, app-proxy, theme or Shopify settings were changed by this review build.
