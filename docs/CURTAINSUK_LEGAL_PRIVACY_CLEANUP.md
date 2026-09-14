# Owner-confirmed legal/privacy cleanup

14 September 2026. Application/theme content commit: `8c49f64`.

Confirmed identity: Apex Curtains Ltd trading as Curtains UK, 36–44 Bolton Road, Blackburn, BB2 3FA. Contact: enquiries@curtainsuk.com.

Published only legal/privacy/contact content:

- Shopify privacy policy replaced with the Curtains UK notice in `docs/legal/privacy-policy.html`.
- Shopify terms and returns: obsolete business names/email replaced; confirmed contact block added. Text comparison confirms other commercial terms preserved.
- Shopify contact-information policy populated with the supplied details. Published readbacks retained in `docs/legal/`.
- Dawn contact section and shared footer show the confirmed identity/address/email.
- Existing same-origin room-image privacy page and gateway privacy notice updated consistently.

Raw reference images have a maximum 30-day retention limit; current implementation discards them after analysis, earlier than this limit. No image-storage or retention logic was changed. One optional image, private processing, earlier deletion requests, derived-record retention for operation/improvement and no image training without separate explicit permission are preserved. No company number, ICO registration number or DPO was invented or published.

Verification: all six checked live surfaces returned 200 with the confirmed identity, address and email, and no obsolete names or unfinished placeholders. Browser verification of the live privacy policy passed; 390px layout has no horizontal overflow. Existing privacy/proxy/theme tests: 22 passed. TypeScript, changed-file lint and deployment build passed.

Deployment: `curtainsuk-staging-6deoxoq01-hamzas-projects-4ef62f35.vercel.app`, assigned to the existing gateway alias. Only two legal/contact theme sections pushed to live Dawn 182264234363. Purchase controls, payment providers, ranking, pricing, stock, shipping and checkout were not changed; no order was placed. Minimal rollback remains untouched.

Privacy-notice structure was checked against the ICO's guidance on [the right to be informed](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/). This records the requested content cleanup and verification, not a certification of every wider legal or supplier-processing arrangement.
