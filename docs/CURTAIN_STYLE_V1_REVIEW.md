# Curtain Style V1 — unpublished review

Candidate: **182339731835 — CurtainsUK - Curtain Style V1 review**.

Preview: https://www.curtainsuk.com/pages/fabric-library?view=curtain-style&preview_theme_id=182339731835

Source branch: `feature/curtain-style-v1`, isolated worktree `C:/Users/hamza/curtainsuk-style-v1`.

## Delivery scope

The candidate was duplicated directly from live theme **182336356731 — CurtainsUK - Browse Fabrics review**. Only five theme files were changed: new Curtain Style section, new image snippet, new alternate page template, the single prominent Samples navigation item, and additional namespaced English translations. All other candidate files match the live source by Shopify MD5. No live theme files changed, none were deleted, and no theme was published.

The review uses an alternate template on the existing fabric-library page. This does not replace its normal editorial or Browse templates. No shared Shopify page record, menu record, public route or redirect was created. The candidate navigation points to this working preview view. A dedicated page handle and its metadata can be agreed at the publication gate; this preview does not require that shared live change.

## Experience

Fabric → Fold → Presence → Length → Position → Return to Fabric.

- Fabric-first proposition and existing interior vocabulary.
- Full-size change-state comparisons for Wave, Pinch Pleat and Pencil Pleat; clean floor line / soft break; window-led / ceiling-led.
- Pattern × Fold and Texture × Fold use clearly labelled representative real photography.
- Presence × Fullness shows gathered real fabric and explains Softer / Balanced / Fuller as visual language only. There are no ratios, saved style selections, new manufacturing options or Builder parameters.
- Fabric Intelligence handoffs at pattern/activity, texture and presence, as well as fabric discovery and the ending. All use the existing same-origin premium entry, with no HCI changes.
- No product grid, Tyrone browsing, generated curtain imagery, simulations, measurements or calculators.
- Controlled same-fabric comparison remains Phase 2, pending suitable source evidence.
- Future Fabric Detail module remains unimplemented; Fabric Knowledge v1 is untouched.

## Governed links

All target `/pages/fabric-library?view=browse-fabrics` with one existing filter. No marketing collection or unsupported OR syntax.

| Customer link | Filter | Verified catalogue results |
| --- | --- | ---: |
| Explore lower-activity fabrics | activity=low | 1856 |
| Explore statement-activity fabrics | activity=statement | 32 |
| Explore abstract patterns | pattern=abstract | 1091 |
| Explore fabrics with a visible weave | texture=visible-weave | 3248 |
| Explore light-presence fabrics | presence=light | 1400 |
| Explore substantial-presence fabrics | presence=substantial | 249 |

Counts are observations, not hard-coded copy. Each active facet/value was checked, and all 24 records in each first result page matched the requested dimension. Finish is taught without inventing a Browse facet.

## Verification

- Shopify Liquid/schema/translation validator: all five files pass (final revision 3).
- JavaScript syntax, translation coverage, single H1, three comparison groups/seven panels, no commerce-state writes or product links: pass.
- Desktop 1440 CSS px and mobile 390 / 412 CSS px: no page horizontal overflow. Windows display scaling was accounted for and actual `innerWidth` checked.
- Mobile images remain full-width; tab controls change one large image rather than squeezing three thumbnails together.
- Fold changes by click and keyboard ArrowRight; selected state, focus and visible panel update together. Without JavaScript all examples remain readable in document order.
- Clean floor / soft break and window-led / ceiling-led change-state controls tested.
- Mobile Curtain Style navigation opens the new view; desktop navigation label also verified.
- Presence deep link opened Browse with Light selected and 1400 results. Existing exact-fabric detail, Fabric Knowledge, Order a sample and Make curtains actions render unchanged.
- `/pages/samples` remains accessible. Existing basket was inspected read-only: two pre-existing sample lines still show £2.50 each. No basket, order, stock or checkout mutation was performed.
- Pattern/activity's contextual handoff loaded the actual “Let us read your room” Fabric Intelligence screen; no consultation was submitted. Curtain Builder loaded its existing window-type list; no configuration was changed or calculated.
- All non-presentation files, including existing commerce and Curtain Builder files, remain byte-identical to live in the candidate.

The first burst of six parallel public catalogue probes returned transient 400 responses. Sequential checks of all six passed, as did the browser handoff. No catalogue/backend change was made.

## Review / publication gate

Stop at preview. Review image selection and copy, confirm supplier educational reuse rights, then separately approve publication and any dedicated page handle. Existing live usage is documented as the rights basis for supplier-image reuse, not represented as a fresh legal licence audit. See `CURTAIN_STYLE_V1_ASSET_REVIEW.md` for provenance and exclusions.

The candidate inherits Shopify's unpublished/staging safeguards and its preview banner. No attempt was made to enable live checkout in a draft theme. The live £2.50 sample commerce remains unchanged.

No publishing, merging, backend deployment, HCI redesign or catalogue migration is included in this delivery.
