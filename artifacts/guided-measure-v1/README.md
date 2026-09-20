# Guided Measure V1 — unpublished review handoff

Candidate: **182339731835 — UNPUBLISHED**. Live theme **182336356731** was not modified. No publication, order, payment, production specification or measurement submission took place.

[Guided Measure Shopify preview](https://www.curtainsuk.com/pages/how-to-measure?preview_theme_id=182339731835)

[Curtain Anatomy in the same candidate](https://www.curtainsuk.com/pages/fabric-library?view=curtain-style&preview_theme_id=182339731835)

## Journey results

| Requested check | Result | Verified behaviour |
| --- | --- | --- |
| Track journey | PASS | Full fitted track width; top-of-track drop for Double Pinch/Pencil. |
| Wave track journey | PASS | Full fitted track width; bottom-of-track drop. Magnified anchor help. |
| Pole journey | PASS | Width excludes both finials; drop starts on the pole's bottom surface. |
| No-hardware handoff | PASS | Measurement stops, with fitting guidance and CurtainsUK email help. |
| Bay journey | PASS | Full fitted track route around bends, top-track drop, one reading, conservative workroom review. No angles/section dimensions. Pole/Bay and Wave/Bay do not continue. |
| Desired finish | PASS, bounded | Short/Floor proceed to a physical endpoint. Soft Break/Puddle retain intent and ask CurtainsUK to confirm the physical endpoint; no invented surplus or below-floor line. |
| I'm not sure | PASS | Contextual explanation/anchor detail followed by CurtainsUK help. Nothing submitted automatically. |
| Review | PASS | Exact raw width/drop over their measurement lines, setup/intent, Edit and Confirm. |
| Measurement Brief | PASS | Raw decimal strings, design intent, review state, rule version and immutable confirmed revisions; download verified. Workshop and production fields remain null. |
| Desktop / 390 / 412 | PASS | One visible numeric input, permanent cm unit, large actions, no horizontal overflow; Back/reload preserve readings. |
| Anatomy regression | PASS | All 30 approved states at all three widths; 834 unsupported combinations remain unavailable; failed-image handling unchanged. |
| Fabric Intelligence | PASS, entry smoke | Existing same-origin entry loads. No HCI submission, logic change or cold-start investigation. |
| Browse / Fabric Detail | PASS | Browse loads 24 cards; real Abeja Linen detail loads; correct exact Fabric Master ID retained. |
| Samples £2.50 | PASS | Real existing sample handoff to isolated cart, price 250p, quantity one, Fabric Master ID sdg-f1325-03 preserved. Test line removed; basket verified empty. No checkout. |
| Make Curtains | PASS, handoff smoke | Existing configurator loads with sdg-f1325-03 and standard-window selected. No price/order submission. |
| Staging leakage | PASS | No vercel.app request observed in tested storefront journeys. |
| Theme safety | PASS | Exactly ten Guided Measure/entry files added or changed in candidate. Live checksums unchanged; Anatomy files unchanged. |

## Customer custody and scope

Progress and confirmed briefs are stored in this browser only. The customer can download JSON, copy or print the brief. The experience clearly states that no measurements have been sent to CurtainsUK or added to an order. Customer confirmation is not manufacturing approval. A lost/cleared browser store is not a permanent server archive; customers are prompted to save their brief. No backend/Make Curtains integration is implied.

One raw drop is collected. Changing hardware, opening, heading or finish invalidates affected measurement confirmations without changing the entered numbers. The customer must recheck the relevant line. Earlier readings and confirmed revisions remain separate. Unknown hardware/heading and unusual endpoints route to help.

The existing `/pages/how-to-measure` hub is replaced only inside this candidate; its Measure & Fit and footer labels become Guided Measure. Detailed legacy measuring articles, fitting content, sample routes and commerce remain unchanged. No Shopify Page or menu resource was mutated.

## Files changed in candidate

New:

- `assets/curtainsuk-guided-measure.js`
- `assets/curtainsuk-guided-measure.css`
- `sections/curtainsuk-guided-measure.liquid`
- `snippets/curtainsuk-guided-measure-content.liquid`
- `templates/page.guided-measure.json`

Scoped updates:

- `locales/en.default.json` — only the Guided Measure namespace added this turn; existing Anatomy translations preserved.
- `sections/curtainsuk-guides.liquid` — Guided Measure at the existing hub handle.
- `sections/curtainsuk-measure-guide.liquid` — shared journey for existing measure aliases.
- `sections/curtainsuk-help-footer.liquid` — existing measurement link label.
- `snippets/curtainsuk-header-navigation.liquid` — existing measurement link label.

New verification scripts: `scripts/guided-measure-check.cjs` and `scripts/guided-measure-regression.cjs`.

## Evidence

- `preview-verification.json` — all journey branches at 1440, 390 and 412px, raw strings, download, Back/reload, input validation, no-JS help, storage failure and malformed resume.
- `local-verification.json` — matching local checks.
- `storefront-regression.json` — storefront/sample/Make handoffs and test-cart cleanup.
- `scoped-theme-diff.json` — exact ten-file candidate before/after MD5 diff; empty live diff.
- `theme-before.json`, `theme-after.json`, `candidate-scoped-backup.json` — local read-only audit snapshots and scoped pre-upload backup.
- `preview-390-track-drop.png`, `preview-390-track-anchor-help.png`, `preview-412-bay-check.png` — representative hosted screenshots. Fixed Shopify/header overlays in section captures are preview chrome, not part of the measurement diagram.
- `../anatomy-bounded-integration-v1/preview-verification.json` — preserved Anatomy regression results.

Shopify Liquid/schema/translation validator passed all ten integration files. The Shopify Liquid/Admin skills informed theme structure, locale handling, operation validation and the scoped unpublished-only upload.

The commit for this task is deliberately scoped to Guided Measure. Pre-existing uncommitted Anatomy work and its evidence remain intact and outside that commit; the candidate already contained that approved Anatomy work. This handoff is not a publication or a claim that the branch HEAD alone reproduces all earlier uncommitted candidate changes.

Stop for customer review. Do not publish.
