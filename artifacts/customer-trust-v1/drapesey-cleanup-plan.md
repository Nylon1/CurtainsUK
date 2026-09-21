# Drapesey cleanup plan

**Prepared 21 September 2026. Review-only; no Shopify records changed.**

The live audit found 41 published Pages and 187 case-insensitive occurrences. The plan below is deliberately reversible: rewrite only the canonical CurtainsUK pages, create a redirect where an old URL has useful search intent, and unpublish unrelated or unsupported legacy content. No blind string replacement or hard delete is authorised.

| Handle | Classification | Proposed destination/action |
|---|---|---|
| `book-your-home-visit` | REDIRECT | `/pages/contact-us`; remove legacy visit promise |
| `curtain-tracks-and-poles-fitting-service` | REWRITE | Current CurtainsUK How to Fit/help route; remove legacy claims |
| `terms-and-conditions` | REDIRECT | `/policies/terms-of-service` |
| `curtain-heading-styles` | REDIRECT | `/pages/fabric-library?view=curtain-style` |
| `drapery-track-systems` | REDIRECT | `/pages/how-to-fit` |
| `curtain-poles` | REDIRECT | `/pages/how-to-fit` |
| `browse-pelmet-box-collection` | UNPUBLISH | Unsupported catalogue/legacy content |
| `areas-we-cover-local-advisors` | REDIRECT | `/pages/contact-us`; remove local-advisor claims |
| `browse-fabrics-order-samples` | REDIRECT | `/pages/fabric-library?view=browse-fabrics` |
| `apex-window-curtains` | UNPUBLISH | Apex/shaped-window scope excluded from V1 |
| `acoustic-wood-wall-panels` | UNPUBLISH | Unrelated legacy catalogue |
| `acoustic-wall-panels` | UNPUBLISH | Unrelated legacy catalogue |
| `contact-us` | REWRITE | Canonical support, complaints, media and MTM contacts |
| `about-us-1` | REWRITE | Canonical CurtainsUK About page |
| `curtains-for-a-bay-window` | REDIRECT | `/pages/solve-my-window`; preserve only verified Bay guidance |
| `curtains-for-a-patio-door` | REDIRECT | `/pages/solve-my-window` |
| `tab-top-curtains` | UNPUBLISH | Unsupported heading |
| `wave-pleat-curtains` | REDIRECT | `/pages/fabric-library?view=curtain-style` |
| `eyelet-curtains` | REDIRECT | `/pages/fabric-library?view=curtain-style` |
| `pinch-pleat-curtains` | REDIRECT | `/pages/fabric-library?view=curtain-style` |
| `childrens-bedroom-curtains` | UNPUBLISH | Legacy editorial page with unverified claims |
| `living-room-curtains` | UNPUBLISH | Legacy editorial page with unverified claims |
| `faq-1` | REWRITE | Current FAQ covering Guided Measure and MTM rules |
| `how-to-measure-for-curtains` | REDIRECT | `/pages/how-to-measure` |
| `curtain-services-in-bristol-expert-measuring-installation` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-london-bespoke-local-experts` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-birmingham-local-experts-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-manchester-local-experts-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-leeds-local-experts-amp-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-cambridge-bespoke-amp-local-experts` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-surrey-local-experts-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-milton-keynes-local-experts-amp-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-southampton-local-experts-amp-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-kent-local-experts-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-northampton-local-experts-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-nottingham-local-experts-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-leicester-local-experts-amp-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-lancashire-bespoke-local-experts` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-sheffield-local-experts-amp-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-cardiff-local-experts-amp-bespoke-design` | REDIRECT | `/pages/contact-us` |
| `curtain-services-in-newport-local-experts-bespoke-design` | REDIRECT | `/pages/contact-us` |

**Release gate:** execute this plan only as part of the coordinated publication after owner approval. Re-run the Shopify-wide search and require zero inappropriate customer-facing Drapesey references.
