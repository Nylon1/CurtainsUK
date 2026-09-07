# CurtainsUK Phase 5D — Security and Operations Readiness

> Launch update: customer uploads, scanner setup and private file storage in this historical report are superseded by the [Phase 5E email-evidence workflow](curtainsuk-phase-5e-owner-inputs.md#evidence-by-email--owner-decision-applied). Do not activate those file services for launch.

Status: non-production implementation. No firewall rule, malware-scanning subscription, supplier automation, Shopify publication, or production payment setting was changed.

## Evidence-upload security

The upload path remains private and fail-closed:

- Only JPEG, PNG, WebP, HEIC/HEIF and PDF are accepted. Declared MIME type, extension and file signature must agree, and the existing hard byte limit is enforced while the body is read.
- A file is quarantined before scanning. It cannot be used to approve a project unless the latest durable scan state is `CLEAN`.
- Every scan attempt, including provider timeout, malformed response and provider unavailability, is appended to the private audit store. An unavailable scanner never promotes a file.
- Staff retrieval uses a short-lived HMAC capability bound to the evidence and staff actor. The raw capability is never stored; its SHA-256 digest is registered in PostgreSQL and can be consumed once only. The server reads at most the enforced 3 MiB object limit and returns it as an attachment with `no-store` and sandbox headers; the private bucket is not exposed.
- Retrieval issuance, consumption and the existing evidence access event are audited. Failed and replayed grants fail closed.
- Staff can request customer deletion without first deleting the audit record. Storage deletion and database completion are two explicit audited steps, so a failed storage operation can be retried.
- Retention cleanup is disabled unless `CURTAINSUK_EVIDENCE_RETENTION_CLEANUP_ENABLED=true`. It uses a preview, expected-set comparison, batch limit and two-phase deletion. Scheduling must remain disabled until the owner confirms whether active projects need an additional retention extension or legal-hold field.
- Orphan cleanup has the same preview/expected-set protections. The pilot grace period is configurable; its safe default is 48 hours.

The current default retention period remains 180 days. That value is a technical default, not an approved business/legal policy.

### Malware-scanning provider decision

The server now supports a provider-neutral HTTP scanner plus a production-shaped Cloudmersive Advanced Virus Scan adapter. It sends the quarantined file server-to-server, never places the provider key in a browser payload, requests `no-store`, uses a strict timeout, interprets the documented risk flags, and quarantines any unexpected result.

Cloudmersive is only a candidate; it has not been subscribed to or activated. Official information reviewed on 7 September 2026:

- [Advanced Virus Scan API](https://api.cloudmersive.com/docs/virus.asp)
- [Small-business plans](https://cloudmersive.com/pricing-small-business)
- [Security and regional processing](https://www.cloudmersive.com/security)
- [Data Processing Addendum](https://www.cloudmersive.com/data-processing-dpa)

Published monthly options at review time ranged from the free evaluation plan (600 calls, 3.5 MB limit, North America) through Basic ($19.99, 10,000 calls, North America/Canada), Business ($49.99, 25,000 calls, includes Germany) and Business Advantage ($199.99, 100,000 calls, includes the United Kingdom). Plans, regions and limits must be reconfirmed before purchase. OPSWAT Metadefender Private Scan remains an alternative, but its suitable private-use path requires a commercial agreement.

Owner decisions required before real evidence is accepted:

1. Choose the provider and paid plan.
2. Approve the processor/DPA and processing region; do not use a North-American plan by accident.
3. Confirm the maximum evidence size is supported by the chosen plan.
4. Provision the API key and endpoint only in staging secret storage.
5. Approve retention duration, deletion-request identity verification and legal-hold procedure.

Until those decisions are complete, the launch dashboard item for malware scanning is `BLOCKED`.

## UK delivery configuration

Delivery uses the existing supplier-neutral rate contract with nine explicit cells:

| Region | Parcel classes |
| --- | --- |
| UK Mainland | Standard, Oversize, Specialist |
| Highlands & Islands | Standard, Oversize, Specialist |
| Northern Ireland | Standard, Oversize, Specialist |

Every seed row is `AWAITING_OWNER_CONFIRMATION` with a null amount. No price was invented. A private staff page and API can append a new version for one cell, with actor, reason, effective date and optimistic previous-version checking. Only effective, `VALIDATED` rows with an exact positive GBP minor-unit amount can quote delivery; future-effective versions are ignored until their effective time. International delivery remains unsupported. Delivery remains separate from curtain goods and is not included in the minimum-order check.

Owner decisions required:

1. Carrier/service and VAT treatment for each region and parcel class.
2. Exact VAT-inclusive amount for all nine cells, including whether any cell must remain quote-only.
3. Postcode mapping for Highlands & Islands and Northern Ireland.
4. Size/weight thresholds for Standard, Oversize and Specialist parcels.
5. Service levels, exclusions, failed-delivery/return policy and price effective date.

Shipping is therefore `OWNER DECISION REQUIRED` and cannot be treated as launch-ready.

## Application protection and replay safety

Application-level limits are enforced in PostgreSQL so they remain effective across serverless instances. Keys are HMAC-derived from scope, authenticated shop or staff actor, and the platform-forwarded client address; raw IP addresses and secrets are not persisted by this limiter. Database failure fails closed for mutation and staff endpoints.

| Endpoint family | Fixed-window application policy |
| --- | --- |
| Fabric catalogue | 120 requests/minute/shop+client |
| Pricing | 60/minute/shop+client |
| Specialist calculation | 30/minute/shop+client |
| Review submission | 6/hour/shop+client |
| Checkout handoff | 20/15 minutes/shop+client |
| Evidence grant | 30/minute/staff+client |
| Evidence retrieval | 60/minute/staff+client |
| Evidence deletion | 10/hour/staff+client |
| Evidence maintenance mutation | 5/hour/staff+client |
| Shipping-rate mutation | 12/hour/staff+client |

Rejections return `Retry-After` where applicable and a small controlled reason code, without echoing signatures, tokens, addresses or supplier data.

Timestamp validation is not the sole replay defence. Each valid signed `review-request` and `checkout-handoff` mutation claims a body-bound request fingerprint in PostgreSQL before processing. A duplicate signature/request body during the validity window returns `409`; an unavailable replay store returns `503`. Read-only price/spec calculations remain safely repeatable. Replay receipts are private and append-only.

## Vercel Firewall draft — not applied

Vercel Firewall should be a coarse outer layer; the signed proxy, staff authentication, durable replay claim and application limits remain authoritative. Vercel documents per-region rate-limit counters, so Firewall limits cannot replace the database-backed global business limits. See [Vercel Firewall rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

Recommended staged rollout:

1. Create rules in log-only mode and observe genuine preview traffic before enforcement.
2. Add a generous signed-proxy IP limit (draft starting point: 600 requests/minute) to absorb obvious floods without competing with operation-specific limits.
3. Add a lower upload-path limit (draft starting point: 30 POSTs/10 minutes/IP).
4. Keep authenticated staff paths at a generous perimeter limit (draft starting point: 600 requests/10 minutes/IP); authorization and actor limits remain in the application.
5. Exclude health checks and trusted deployment validation deliberately, not through broad path wildcards.
6. Never include query strings, signatures, access tokens or request bodies in custom log labels.
7. Review Firewall plan availability, regional behaviour and false positives, then have an authorised owner publish the final rules.

These are observation starting points, not approved production policy. No Firewall change was published in Phase 5D.

## Database activation

Both Phase 5D migrations are applied to the dedicated CurtainsUK Supabase project. Verification confirmed the expected tables, indexes and append-only triggers; forced RLS; no `anon`/`authenticated` schema use; service-role read/RPC access without direct mutation grants; and all nine null `AWAITING_OWNER_CONFIRMATION` delivery seeds. The replay store also passed a live duplicate-mutation check (`201` followed by `409`).

## Security launch status

| Area | Status | Blocking item |
| --- | --- | --- |
| Private file validation/quarantine | PASS | Durable private schema is applied and verified |
| One-time signed staff retrieval | PASS | Durable private schema is applied and verified |
| Retention/deletion/orphan mechanics | PASS | Owner must approve policy before enabling scheduled deletion |
| Malware scanner | BLOCKED | Provider, plan, DPA/region and secret provisioning |
| UK shipping | OWNER DECISION REQUIRED | Nine rates and operating rules |
| Durable mutation replay defence | PASS | Live duplicate mutation returned `201`, then `409` |
| Application rate limiting | PASS | Database-backed operation policies are deployed |
| Vercel Firewall | OWNER DECISION REQUIRED | Observe traffic and approve/publish final rules |
