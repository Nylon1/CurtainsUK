# Customer Trust, Legal & Site-wide Footer V1

21 September 2026. **Built for review; NOT PUBLISHED.**

This is an implementation and evidence pack, not a legal sign-off. No Shopify page, policy, notification, privacy setting, theme or gateway deployment was changed. No payment, price, stock, Fabric Master, lifecycle or workroom-release rule was changed. A local commit is not authority to deploy this package.

## Review entry points

- Owner decisions: [decision sheet](CUSTOMER_TRUST_OWNER_DECISION_SHEET.md). Legacy references: [Drapesey audit](../artifacts/customer-trust-v1/drapesey-audit.md). Technical evidence: [privacy/cookie verification](../artifacts/customer-trust-v1/privacy-cookie-technical-verification.md).
- Run `node scripts/build-customer-trust.mjs`, then `node scripts/preview-customer-trust.mjs`.
- Review index: http://127.0.0.1:4347/ ; footer: http://127.0.0.1:4347/footer .
- Source of truth: `content/customer-trust/catalogue.mjs`, `footer.css`, `footer.js`.
- Generated publication manifest: `artifacts/customer-trust-v1/publication-manifest.json`. `releaseApproved` is false. The builder refuses `--release`; it has no Shopify write operation.
- Full route inventory: [route matrix](../artifacts/customer-trust-v1/route-matrix.md), [live audit](../artifacts/customer-trust-v1/live-audit.json).
- Local browser evidence: [verification](../artifacts/customer-trust-v1/browser-verification.json), [desktop](../artifacts/customer-trust-v1/footer-1440.png), [390px](../artifacts/customer-trust-v1/footer-390.png), [412px](../artifacts/customer-trust-v1/footer-412.png).
- Existing public policy/page bodies are preserved in `published-content-before.json`. This contains public content only, not credentials or customer records.

## Current policy audit

Shopify connector identifies `carpetup.myshopify.com`. Admin's stable URL slug is `madetomeasurecurtains`; the Domains screen lists both myshopify names and confirms `www.curtainsuk.com` as connected primary. These are not assumed to be different stores.

| Existing destination/surface | Decision | Evidence and proposed destination |
|---|---|---|
| Existing NEED SOME HELP service strip | KEEP / expand | Preserve copy and visual treatment; remove template-only restriction so it is site-wide. |
| Basic Shopify footer | KEEP utility layer | Copyright/payment/social utility remains. Four trust groups live in one canonical service-footer component, not repeated per template. |
| `/policies/refund-policy` | REWRITE | Generic 30-day policy includes perishable/plant/hazardous-goods categories unrelated to this service. Replace with MTM/samples/statutory-rights distinction. |
| `/policies/privacy-policy` | REWRITE | Current 14 Sept policy lacks sufficiently verified current processors/retention; image claims need downstream evidence. Keep native policy URL. |
| `/policies/terms-of-service` | REWRITE | Generic boilerplate, state/province language and broad disclaimers. Keep native policy URL. |
| `/policies/contact-information` | REWRITE | Only enquiries and address. Separate support, complaint, media and MTM-change purposes. |
| `/policies/shipping-policy` | REWRITE | Empty body. Draft now states UK Mainland, free samples, approximately 3–4 week MTM estimate and current checkout delivery charge without hard-coding a price. |
| `/pages/privacy-policy` | MERGE | Duplicate includes `[Insert Date]`. Redirect to native Privacy Policy after canonical release. |
| `/pages/terms-and-conditions` | MERGE | Old Drapesey terms: deposit process, short fault-report periods and older cancellation logic. Redirect to native Terms. |
| `/pages/contact-us` | REWRITE | Old Drapesey email/branding and unverified hours/phone. Retain handle, replace content. |
| `/pages/cookies-policy` | REWRITE | Old implied-consent wording and unverified inventory. Retain handle, connect genuine preference control. |
| `/pages/faq` | MERGE | Acoustic-panel FAQ; redirect to `/pages/faq-1` after replacement. |
| `/pages/faq-1` | REWRITE | Curtain FAQ has width-addition advice inconsistent with fitted-hardware rules. Link to Guided Measure instead. |
| `/pages/about-us` | MERGE | Carpet Up flooring text; consolidate into `/pages/about-us-1`. |
| `/pages/about-us-1` | REWRITE | Keep fabric-first explanation; omit unverified founding/history/scale claims. |
| `/pages/media` | REWRITE | Remove unsupported television-coming-soon assertion. Use restrained expertise/enquiry page. |
| `/pages/fabric-care-guide` | REWRITE | Product-specific care guidance, no universal washing/solvent promise. |
| `/pages/curtain-fabric-colour-guide` | REWRITE | Keep existing handle, extend qualified shade/texture/batch/pattern/AI guidance. |
| `/pages/curtain-gallery` | KEEP / review | Existing content retained; footer points to existing home inspiration anchor. Image rights/content not re-certified here. |
| Old measuring/fitting guide handles | MERGE | Alias manifest routes to `/pages/how-to-measure` and `/pages/how-to-fit`. No new measurement rules. |
| Samples | KEEP | Add colour guide link only. £2.50 commerce and identity unchanged. |
| Make Curtains | KEEP | Add colour guide link only; approved configuration and checkout code unchanged. |
| Fabric Detail/Browse | KEEP | Add link beside existing material note, not another product taxonomy. |
| Guided Measure / Anatomy / Fabric Knowledge | KEEP | Shared footer only; no logic, geometry or measurement modifications. |
| HCI point-of-image collection | REWRITE notice only | Optional automated processing, avoid personal details, full privacy link. Remove unverified retention/training promises from staged presentation. |
| App-proxy image privacy / old Next route | MERGE | Canonical layered Room Image page; shared content for proxy, redirect old Next entry point when released. |
| Complaints / MTM order information / Accessibility / Sitemap | CREATE | New focused customer-care destinations. |
| Responsible sourcing / modern slavery / equality / waste | CREATE drafts | Explicit adoption/evidence hold; no false sustainability or audit claims. |
| Separate Sustainability destination | DO NOT CREATE | No approved evidence for broad environmental claims. |
| Other city/specialist/legacy pages | KEEP pending scoped review | Do not mass-delete indexed pages; shared theme footer covers them. Specialist content itself not revalidated. |
| Shopify notification contact/footer | REWRITE after approval | Legacy sender/contact remains an Admin setting. MTM-only fragment is prepared locally; no Shopify write has been made. |

No existing page was deleted. Proposed redirects are a manifest, not live redirects. Shopify redirects from an existing page handle require coordinated handling of that record; do not blindly create a redirect and assume it overrides a live page.

## Footer route audit and architecture

33 public URLs were read without preview parameters, including homepage, Fabric Knowledge/library, Browse, an exact Fabric Detail, Anatomy, Guided Measure, How to Fit, window hub, Make Curtains, samples, contact/help/policies, cart/search and two HCI proxy routes. The live service strip is template-restricted; other Shopify pages have only the basic footer. The standalone HCI pages do not inherit it.

One canonical content/CSS/behaviour source generates:

1. `snippets/curtainsuk-trust-footer.liquid`, rendered unconditionally by the existing `curtainsuk-help-footer` section in `footer-group`.
2. `lib/storefront/customer-trust/generated.ts`, inserted in both current premium and legacy HCI HTML shells.
3. Review pages and native Shopify policy bodies from the same content records.

Do not hand-edit generated copies. Run the builder and commit generated diffs with source. Theme locale keys carry customer-facing footer text. HCI does not acquire a Shopify token or a second consent system: its Cookie Settings link returns to the Shopify Cookie Information page's preference control. Old Next room privacy routes to the same canonical page. Checkout/email do not inherit a Liquid theme footer; their native policy records and notification fragment are separate release surfaces using the same approved destinations.

## Draft content coverage

| Topic | Review result |
|---|---|
| Refunds & Returns | MTM and samples have no voluntary change-of-mind offer; statutory rights for faulty/damaged/incorrect/materially misdescribed goods remain. Two-hour request is not statutory cancellation. Customer/returns address is BB2 3FA. |
| Privacy | Owner-approved no-training/no-reuse restriction is stated. Provider contracts, upstream image handling, retention, legal-basis record and transfers remain technical/legal verification items; no blanket deletion promise is made. |
| Terms | Samples, MTM, measurements, pricing/payment, review/manufacture, delivery estimate, workmanship, changes and complaints. No VAT registration number is published. |
| Cookies | Cookie and browser-storage distinction and four intended integrations are stated. Admin banner is currently not visible; consent behaviour remains BLOCKED pending configuration/runtime verification. |
| Fabric Colour/Shade | Device/light/surroundings, conditional nap/weave/natural variation, batches, sample limitations, pattern placement, photography and AI colour families. Physical sample recommended; statutory rights preserved. Links staged in Fabric Detail, samples, Make Curtains, returns and footer. |
| Room Image / AI Privacy | Layered notice retained, central page and full policy linked; owner-approved no-training/no-reuse restriction is stated. Upstream processor/storage/retention facts need confirmation before release. |
| Made-to-measure orders | Paid → review → approved → workroom → delivery; payment not production release. Uses approved two-hour request language. |
| Complaints | complaints@curtainsuk.com; order/reference, facts, dates, requested outcome; review/escalation without invented SLA or ADR membership. |
| Media | media@curtainsuk.com; factual overview, topics, interviews and relevant collaborations. No awards, dominance or television claims. |
| Modern slavery | Voluntary-policy draft only. Statutory applicability cannot be determined from company existence alone; turnover/group and scope needed. No invented audits. |
| Equality/non-discrimination | Proposed treatment of all requested groups, relevant protected characteristics, access/adjustment and complaint route. Adoption/process owner not presumed. |
| Recycling/waste | Qualified owner-approved practices are stated for suitable offcuts/surplus, donations, recycling and cardboard/plastic packaging; no universal take-back or WEEE claim. |
| Responsible sourcing | Established UK suppliers and fair-treatment/respect expectation are stated; no audit/certification or broad sustainability claim. |
| Accessibility | Keyboard/focus/navigation/mobile footer tested locally; no certification or site-wide conformance claim. Support route included. |
| Contacts | Four distinct purposes preserved. Admin sender/contact cleanup remains a technical release task; no legacy sender is presented as an approved CurtainsUK route. |

## Privacy and cookie evidence

| Flow | Verified from implementation | Not established by that evidence |
|---|---|---|
| Fabric Intelligence | Gateway delegates to separate HCI upstream; database state guards reject raw media; derived palettes, preferences, answers/events and hashes retained. | Upstream processor identity/contract, independent logging, retention, training and international transfer terms. |
| Guided Measure | `curtainsuk.guided-measure.v1` local storage saves readings/progress/briefs; no fixed expiry in the UI. | A confirmed brief is not automatically a final manufacturing specification. |
| Samples / MTM | Shopify commerce records and exact configuration/order history; gateway does not request full payment-card data. | Payment provider's complete arrangements, all downstream delivery/workroom recipients and retention schedule. |
| Customer privacy settings | Automation off, Shopify Network Intelligence enabled, EU primary customer-data hosting displayed. | EU hosting does not prove all processing stays in EU or establish transfer safeguards for every supplier. |
| Cookie banner settings | Not visible in any region; saved privacy URL is `www.drapesey.com/policies/privacy-policy`; show-in-checkout unchecked. | No consent compliance PASS can be claimed from banner configuration or a footer button alone. |
| Customer events settings | Facebook & Instagram, Google & YouTube, Pinterest, TikTok listed; TikTok shows Server and Web; Google/TikTok show Optimized access. | Listing alone does not prove firing/blocking. Inventory actual events/domains/lifetimes and inspect server-side marketing before release. |
| Notifications | Sender and generic confirmation contact remain enquiries@drapesey.com; old domain authenticated. Shop reminder toggles visible. | New inbox deliverability/authentication and permission basis of all reminder features need confirmation. No emails sent in this audit. |

Cookie Settings calls `window.privacyBanner.showPreferences()` when available. Unit checks cover real API invocation and unavailable failure behaviour; the local browser verifies the latter. This does not replace the required actual Shopify UK accept/reject/revoke test. Do not turn on marketing features or accept tracking on behalf of customers as a shortcut.

## MTM cart, Continue Shopping and checkout

Existing immutable cart contract is preserved. No cart JS, price snapshot, line-property generation or Draft Order code changed. Existing `_curtainsuk_mtm_locked` handling remains responsible for Keep/Remove only, customer-friendly identity and hidden internal metadata. Continue shopping remains Browse Fabrics and must not clear retained items. Local tests are not a new paid-order/cart transaction proof.

Canonical native Shopify policy objects must supply both storefront `/policies/*` and checkout-hosted policy links. Do not publish new page-only legal text while leaving old native boilerplate. `publication-manifest.json` contains the same policy bodies for coordinated approved updates. Contact page and native contact policy share purposes/company data.

The notification fragment is in `content/customer-trust/order-confirmation-fragment.liquid`. It detects the existing validated MTM line marker, not a product title or tag attached later by a webhook. It describes paid-order review without claiming an unpaid order is paid. Samples-only orders must not receive the MTM amendment notice. It cannot approve/release manufacture. It must be previewed for MTM-only, mixed and samples-only orders before saving; the existing generic Drapesey contact line also needs replacement, not a second conflicting line below it. Sender authentication is a separate owner/admin task. No test email was sent.

## Company evidence

[Companies House](https://find-and-update.company-information.service.gov.uk/company/15652466) identifies active APEX CURTAINS LTD, number **15652466**. The owner-authorised customer correspondence and returns address is **36–44 Bolton Road, Blackburn, BB2 3FA**. The VAT registration number is intentionally not published. Incorporation is not evidence of business history or statutory-modern-slavery exemption.

## Legal/industry sources and limits

- [Hillarys privacy architecture](https://www.hillarys.co.uk/privacy-policy/) used only as a structural benchmark for layered customer privacy, not copied wording or evidence of CurtainsUK practices.
- [GOV.UK returns/refunds](https://www.gov.uk/accepting-returns-and-giving-refunds): personalised/custom-made change-of-mind distinction; faulty-goods rights retained; eligible online cancellation and refund principles. Draft sample arrangements still need operational confirmation.
- [GOV.UK distance selling](https://www.gov.uk/online-and-distance-selling-for-businesses): pre-contract and cancellation information. Confirm complete sample cancellation information/form before release.
- [ICO right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/): purposes, bases, retention and recipients must be stated accurately. A code constant is not a processor contract.
- [ICO storage/access guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/) and [consent in practice](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-we-manage-consent-in-practice/): evaluate actual technologies/purposes and applicable exemptions; do not infer consent from continued browsing.
- [GOV.UK modern slavery](https://www.gov.uk/guidance/publish-an-annual-modern-slavery-statement): applicable organisations and turnover threshold require factual scope review; voluntary policy is not automatically a statutory statement.
- [GOV.UK discrimination rights](https://www.gov.uk/discrimination-your-rights): relevant protected characteristics and legal context; internal processes need adoption.
- [CMA Green Claims Code](https://greenclaims.campaign.gov.uk/): substantiate environmental claims and avoid misleading broad assertions.
- [Shopify privacy API](https://shopify.dev/docs/api/customer-privacy), [privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/understanding-customer-privacy-settings) and [notification variables](https://help.shopify.com/en/manual/fulfillment/setup/notifications/email-variables) inform implementation boundaries.

## Verification

- Local footer: 1440px / 390px / 412px, no horizontal overflow, one canonical footer, four groups, 44px+ controls and keyboard disclosure toggle PASS. Screenshots retained. Main forest/cream colours have high contrast; no full assistive-technology audit claimed.
- All 21 drafted destinations: local 390px no-overflow/shared-footer/unpublished marker PASS; browser errors empty.
- TypeScript no-emit PASS; premium HCI presentation bundle build PASS.
- Existing storefront suite: **203/203 PASS**. Includes sample, identity, price/stock/lifecycle/configuration regressions. No production transaction was made.
- Shopify Liquid validator: all **7 changed theme files PASS**.
- Canonical-source, route, review-gate and Cookie Settings behaviour tests supplied separately.
- Live route-by-route post-deployment desktop/390/412, actual consent choices, native checkout policy content, email clients and authenticated notification marker rendering: **PENDING RELEASE**, not falsely marked PASS.

## Needs confirmation / release gates

1. Verify the upstream image processor, temporary handling, logs/backups, deletion/retention, subprocessors, countries, transfer safeguards and purpose-by-purpose lawful bases. Do not add precise operational promises until evidenced.
2. Configure Shopify consent controls and canonical CurtainsUK privacy destination; verify Accept/Reject/Preferences/withdrawal and actual non-essential web/server pixel blocking in the served regions.
3. Replace/retire the 41 legacy-referencing Shopify pages and legacy notification/cookie settings through a separately approved Admin write step. Do not delete blindly; use the audit and coordinated redirects/content replacement.
4. Replace native Shopify policy bodies and notification copy only after final review, previewing MTM-only, mixed and samples-only contexts. Global policy records affect live checkout even when a theme is unpublished.
5. Obtain legal/privacy review of final wording and approve one coherent publication. Preserve all existing commerce gates and the live rollback theme. No order/payment is needed for this workstream.

## Files / ownership / status

- Content owner: CurtainsUK owner for legal facts and adopted practices; legal/privacy reviewer for final wording.
- Technical source owner: shared `content/customer-trust` and builder; Liquid/app-proxy renderers generated from it.
- Shopify Admin owns global native policy records, page content/redirects, consent settings and notifications. These are not deployed by a theme push.
- README documents these boundaries. The local git commit is recorded in the completion response.
- **PREVIEW: local review available. LIVE: unchanged. PUBLICATION: blocked pending the listed confirmations and approval.**
