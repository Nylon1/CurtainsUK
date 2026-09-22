# Calibration V2 gateway review

Base: b82731141e8e76f59b2116225fbf46c20cc21669. Paired HCI branch: feature/evidence-driven-calibration-v2.

Only the premium calibration integration changes. New sessions send authenticated policy brief-calibration-v2. On the final existing Taste answer the gateway reads current Fabric Master through the existing repository, uses the existing recommendation-eligibility policy, and sends the resulting exact IDs to HCI. No cost, stock quantities or supplier data are changed. Browser commands cannot supply this list.

Calibration cards are rechecked against current exact SKU/identity and approved imagery on response, resume and idempotent retry. Ineligible/missing/ambiguous identity fails closed. Existing sample/curtain purchase gates and final direction handoffs remain unchanged.

Old sessions retain their original policy. Deploy the paired HCI support before enabling the matching gateway; old service rejects unknown request fields. No Production deployment or UI rebuild is part of this review.

Verification: 195 storefront tests pass (including three new calibration tests); changed-file lint passes. Whole-repository lint has 42 existing errors/883 warnings. Typecheck and production build remain blocked by unchanged baseline errors in browse-experience.test.ts (missing exports and implicit types) and curtainsuk-prepare-scale-fixture.ts (supplierFacts). The affected files match b827311; they are outside this scope. No deployed Preview claim is made.

See the HCI CALIBRATION_SELECTION_V2_REVIEW.md for selector, real-fabric comparison and session/reaction evidence. Remaining release gate: authorised complete knowledge/eligibility validation plus paired Preview smoke, after gateway build blockers are resolved.
