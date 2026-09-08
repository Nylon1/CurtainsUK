# CurtainsUK catalogue activation rule

Owner instruction applied on 8 September 2026. This supersedes the stricter browsing prerequisites in Phase 5F–5H. Historical reports remain unchanged.

BROWSE_READY requires usable canonical identity, genuine approved exact-identity Shopify-hosted imagery, and no known DISCONTINUED status. UNKNOWN and stale lifecycle observations are allowed. Missing price, stock, composition, sample confirmation, editorial approval or fresh supplier checks do not exclude browsing. Approved copy is retained; otherwise the page uses factual identity/specification text without inventing missing attributes. Unknown taxonomy remains UNKNOWN.

PRICE_READY is independent: an approved, validated supplier cut-price snapshot must still be current, in GBP, and positive. Verification flags alone do not authorize server pricing. ORDER_READY additionally requires current sufficient stock for the actual calculated curtain quantity. No catalogue-wide stock or commercial verification was performed. Catalogue activation changes neither commercial snapshots nor customer-approved prices.

Customers can start measurements for a browse-ready fabric before pricing is verified. The existing server pricing endpoint fails closed while verification is missing. Quantity-bound availability checks remain at checkout; staff-approved checkout also rechecks current price eligibility without changing the immutable approved customer amount. Live checkout remains disabled.

The existing search function and hydration gate apply the same browsing rule. The media mapping command activates newly mapped eligible records. The older canary command and catalogue-completion report use the same lifecycle policy. No new tables, catalogue architecture or supplier commercial verification was required.

The set-based activation covered all 9,938 records. All 258 Prestigious and seven SDG records are browsable. Eight additional Prestigious images were uploaded through the resumable content-hash importer, including genuine 300 × 300 Varini and Felice thumbnails. Larger paths return 404. These genuine images are accepted without upscaling; invalid images and images smaller than 32 pixels remain unusable. All eight mappings have stable exact SKU associations and Shopify CDN copies. No portal URLs reach the customer.

The 9,673 records without approved mapped imagery include the one explicitly discontinued fabric and the two previously withheld wrong-colourway image candidates. The mismatch count describes those two candidate results, not a claim that the underlying master identities are wrong. There are zero accepted media/master SKU mismatches. Counts therefore overlap.

Deployment uses Vercel Preview dpl_8CfHHjZkE29vXpT7oTF52ASxyUa7 and only the existing staging gateway alias. Dawn theme 182264234363 remains unpublished. Only its storefront JavaScript was pushed; live Minimal 79650455661 was not changed.

Validation: 28 Fabric Master tests and 103 storefront tests pass; TypeScript and changed-file lint pass. The public audit reads all 265 records in 12 bounded pages, exercises search/filters, verifies newly visible incomplete records and measurement selection, and denies discontinued/wrong-candidate detail requests. All image references are Shopify-hosted, and public responses contain no supplier commercial fields or credentials. Private tables have no anonymous/customer grants. Existing informational private-table RLS notices remain expected. The existing [leaked-password protection advisory](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) is unrelated to this catalogue change.

Machine-readable counts, added-media references and public audit results are under artifacts/catalogue-activation/. Screenshots are under docs/screenshots/catalogue-activation/.
