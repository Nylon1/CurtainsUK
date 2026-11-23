# Persistent Roman blind navigation

The Roman journey previously offered Shop now in a header that scrolled away. Its logo returned to the Roman landing page, and the Roman blinds link was hidden on mobile. The shared header now keeps Main menu, the Roman blinds section label and Shop Roman blinds available on all five pages. Main menu and the logo return to the CurtainsUK homepage. Visualiser, measuring and installation links remain immediately below.

On shop.html, Shop Roman blinds uses an in-page anchor to the configuration, retaining the current form and order_item query. Other pages open the existing Roman shop. Navigation does not write to saved designs. The measured header height offsets anchor scrolling, the sticky visualiser and the desktop shopping summary; the mobile visualiser leaves room for its controls below the header.

The latest active API deployment checked before editing was dpl_743KV2XCSoV8av1bSawoN5bzfpmu, serving protected source e214055e33645abc88470d7df6a07d63ac4d5c1a. The current protected branch was 2e2655aa618f34e63eb5c9868ee7550ca0f99a2d (PR #413). Eleven live Roman assets matched that branch; subsequent source changes since the active API are theme, monitoring-script and documentation changes. This release edits only journey.mjs and journey.css plus this record.

Verification before release: JavaScript syntax and CSS parsing passed. Executing the navigation module for each of the five page paths confirmed homepage exits, the shopping destination, retained shop-page edit query, zero writes to saved designs and the measured header offset. Interactive browser verification was stopped by a safety check because the current Windows browser URL could not be identified reliably; fresh visual/mobile tap checks remain unverified.

Release from the exact merged protected source after both required checks. Stage the production build, align the four existing production source-attestation values with the release, verify the served Roman assets and existing authenticated route boundaries, then promote. The prior deployment above is the immediate rollback target. No Shopify theme upload, database migration or commerce-rule change is needed.
