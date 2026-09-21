# Customer Trust V1 — Owner Decision Sheet

**Review only — do not publish.** Prepared 21 September 2026 for `carpetup.myshopify.com` / `www.curtainsuk.com`.

This sheet removes facts already settled by the owner or verified in the repository/Shopify. It contains only decisions still needed before the 21-page legal/customer-care layer becomes canonical. A safe default is a publication hold or qualified wording; no unsupported claim should be promoted to a policy.

## Already settled — no decision needed

- **Business/customer identity:** Apex Curtains Ltd trading as Curtains UK; customer address 36–44 Bolton Road, Blackburn, BB2 3FA.
- **Company number:** 15652466 (verified at Companies House). The registered office shown by Companies House is separately recorded below because it differs from the customer address.
- **Contacts:** support@curtainsuk.com; complaints@curtainsuk.com; media@curtainsuk.com; MTM order-change requests enquiries@curtainsuk.com.
- **MTM changes:** request within 2 hours; reviewed, not guaranteed.
- **MTM returns:** no ordinary change-of-mind return once made/production applies; statutory rights for faulty, misdescribed or non-conforming goods remain.
- **Colour/shade:** screen, lighting, texture and batch variation are explained; recommend a physical sample where appearance matters.
- **Drapesey:** remove legacy references from CurtainsUK customer-facing privacy, contact, policy and email surfaces.
- **Commerce boundary:** no changes to pricing, Fabric Master, stock, payment, PAID → REVIEW, workroom release or MTM cart immutability.

## 1. Company identity

| Current live fact | What code/Shopify currently says | Owner decision required | Proposed default if safe |
|---|---|---|---|
| Customer-facing address supplied: 36–44 Bolton Road, Blackburn, BB2 3FA. | Shopify contact/privacy policies and current site use BB2 3FA. Companies House lists registered office 36–44 Bolton Road, Blackburn, Lancashire, BB2 3PZ. | Is BB2 3FA the customer correspondence/returns address, and should the registered office (BB2 3PZ) also be published? | Publish the supplied customer address as “customer contact address” and separately label the Companies House registered office only if the owner confirms the distinction. Do not call either address a returns address until confirmed. |
| Company number is 15652466. | Verified from Companies House; draft already records it. | None. | Keep it in legal/contact content. |
| VAT details are not verified. | No authoritative VAT number is in the approved configuration. | Publish a VAT number? If yes, provide the verified number and legal name. | Omit VAT number until verified; do not infer it from prices or checkout tax. |

## 2. Returns and delivery

| Current live fact | What code/Shopify currently says | Owner decision required | Proposed default if safe |
|---|---|---|---|
| MTM change-of-mind position and statutory-rights distinction are settled. | Native Refund Policy is generic Shopify boilerplate: 30-day wording, unrelated perishable/hazardous categories, custom-product exception; contact is CurtainsUK. | For samples, confirm change-of-mind cancellation window, return postage allocation, return address/process and whether any voluntary offer exists. | State only the verified statutory treatment; hold sample-specific promises until the address/process and cancellation information are confirmed. |
| Customers should report damaged, faulty or incorrect goods, but no operational window was approved. | Existing boilerplate says “immediately”; old pages contain other short deadlines. | What evidence/photos are requested, where they go, and is there any operational reporting guidance? | “Contact support as soon as reasonably possible with your order number and useful photos; statutory rights are unaffected.” No hard deadline or SLA. |
| Actual delivery varies by order type and route. | Shipping Policy body is empty; Terms/old pages contain unverified or legacy delivery language. | Confirm delivery areas, current timescales/lead-time wording, charges, carriers/split deliveries and exclusions. | Publish only “delivery information shown before payment” plus support contact until operational terms are supplied. No invented dates or UK-wide promise. |

## 3. Privacy and AI

| Current live fact | What code/Shopify currently says | Owner decision required | Proposed default if safe |
|---|---|---|---|
| HCI is a Vercel gateway with Supabase-derived state and a separate image/recommendation service; raw-media rejection exists in code. | Shopify Privacy Policy claims raw images are deleted within 30 days/sooner, no raw archive and no training without explicit permission. The source does not prove the upstream provider contract. | Where is room-image data processed/stored? Which providers/subprocessors receive it? What are actual raw-image retention/deletion, logs and backups? | Remove precise retention/deletion/provider promises; say upload is optional, automated analysis occurs, derived records may be retained, and ask customers not to include people/documents. |
| Derived HCI palettes, answers/events and image hashes can be retained. | Policy says derived records may be retained for operation/improvement but has no schedule. | Is data used for model training, service improvement, evaluation or human review? Which uses require consent? | Do not claim training or non-training behaviour until confirmed. Use a purpose-qualified “service operation and support” statement only. |
| Shopify is the storefront/checkout; Vercel, Supabase and payment providers are visible implementation components. | Draft Privacy Policy says some providers may process outside the UK and asks customers to contact CurtainsUK; exact safeguards are unknown. | Confirm countries, transfer mechanism/safeguards, processor contracts and retention criteria. | Name only verified providers; describe other recipients by category until contracts and transfer details are confirmed. |

## 4. Cookies and consent

| Current live fact | What code/Shopify currently says | Owner decision required | Proposed default if safe |
|---|---|---|---|
| Shopify Admin Customer Privacy shows cookie banner **not visible in any region**; “show in checkout” unchecked. Saved privacy URL is `https://www.drapesey.com/policies/privacy-policy`. | Customer events lists Facebook & Instagram, Google & YouTube, Pinterest and TikTok; TikTok is Server + Web and Google/TikTok show Optimized access. | Why is the banner disabled? Should it be enabled for the UK/other applicable regions? Which pixels are intentional, and what data/consent modes are used? | Keep non-essential tracking off or consent-gated until verified. Replace the Drapesey destination with the canonical CurtainsUK Privacy Policy and test accept/reject/revoke in each served region before publication. |
| Footer review calls the real `window.privacyBanner.showPreferences()` when available and reports honestly when unavailable. | This is only a control integration; it does not create consent or fix Admin configuration. | Who will configure the banner, privacy URL and checkout setting, and verify pixel blocking/withdrawal? | Treat Cookie Information and Cookie Settings as BLOCKED until the Admin configuration and runtime test pass. |

## 5. Responsible business

| Current live fact | What code/Shopify currently says | Owner decision required | Proposed default if safe |
|---|---|---|---|
| No verified recycling or take-back evidence was found. | Drafts explicitly avoid claims about offcuts, packaging, hardware, samples or WEEE. | What actually happens to fabric offcuts, samples, cardboard/plastic, tracks/hardware and returned/replaced materials? Who handles each stream? | Do not publish a recycling/waste claim; keep a short “ask us about material-specific disposal” note only if wanted. |
| Supplier identity and stock data are governed, but sourcing practices are not a published policy. | No verified supplier audit, certification, training or chain-of-custody evidence. | Which supplier due diligence, questionnaires, certifications or escalation practices actually operate? | Publish product-specific supplier facts only with source/date/scope. No broad sustainable/ethical/eco claim. |
| Sustainability wording is unsubstantiated. | No approved sustainability page is created. | Are there any claims the owner can evidence now? | Default: no Sustainability page or environmental marketing claim. |
| Modern-slavery statement scope is unknown. | A voluntary policy draft says it is not a statutory statement. | Confirm group turnover, business scope, policy owner/adoption and whether Companies Act section 54 applies. | Keep any page clearly labelled policy, not statutory statement; publish nothing until scope and actual controls are confirmed. |

## 6. Guarantees

| Current live fact | What code/Shopify currently says | Owner decision required | Proposed default if safe |
|---|---|---|---|
| No separate CurtainsUK product/workmanship guarantee was verified. | Old/general pages contain no approved guarantee terms; draft content preserves statutory rights only. | Does CurtainsUK offer an explicit product, workmanship or installation guarantee? If yes, duration, scope, exclusions and claim route. | Do not publish a guarantee. Say statutory rights are unaffected and report faults to support. |

## 7. Customer communications and legacy references

| Current live fact | What code/Shopify currently says | Owner decision required | Proposed default if safe |
|---|---|---|---|
| Owner approved removal of all Drapesey references and supplied CurtainsUK inboxes. | Shopify Admin notification sender and order-confirmation preview still show `enquiries@drapesey.com`; the cookie banner saved URL still points to `www.drapesey.com`. Forty-one published Shopify pages contain Drapesey text/links. | Confirm the owner/admin who can replace the notification sender, generic confirmation footer and cookie destination, then verify sender authentication and monitoring. | Replace with support@curtainsuk.com for support, complaints@curtainsuk.com for complaints, media@curtainsuk.com for press, and enquiries@curtainsuk.com only for MTM changes. Remove/redirect legacy page content rather than blindly deleting it. |
| New MTM notice is drafted locally. | It is not in Shopify’s live notification template. | Approve the MTM-only notice for MTM-only, mixed and samples-only email previews. | Insert only after preview confirms the existing `_curtainsuk_mtm_locked` marker and does not alter sample emails or order/payment content. |

## Stop condition

Do not publish the footer, pages, native policies, aliases, consent configuration or email copy until the owner answers the unresolved rows above. After answers, update the canonical source once, rerun the audit and responsive/tests, then seek a separate publication approval.
