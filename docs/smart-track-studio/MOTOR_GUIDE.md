# Forest motor guide: sources and artwork

The owner requested a separate visual, interactive motor page and use of the diagrams in the supplied `download_2421_FOREST_ShuttleSeries_EN_180626_WEB.pdf`. The original 16-page PDF was read and the relevant pages rendered for visual verification on 18 October 2026.

## Public page

`/pages/smart-track-motors`, with theme template `page.smart-track-motors.json`, uses the existing Smart Track section, asset server and release flag. It adds no service, catalogue or header navigation item. The motor-guide checkbox is additive; the fitting-guide template still uses its existing setting.

- Go/iOn buttons switch model descriptions, load, power and motor drawing without changing a saved order.
- Eight numbered buttons and a labelled key explain the original FMS cutaway. Both sets operate the same description and selected state. Keyboard access and an ARIA live region provide the same information outside the artwork.
- Charging advice expands in place. A button reveals the technical comparison. Without JavaScript, the main comparison and technical rows remain available.
- Page links from the configurator open separately so exploring the guide preserves the customer's unsaved choices.
- No connection to devices, account, remote purchase or order mutation occurs on this page.

## Manufacturer artwork

All four locally served WebP files are extracted from the owner-supplied PDF, not generated replacements. Original shape and content are retained. The page credits Forest Group and links to the brochure and current technical library.

| Runtime file | Original source | Processing |
| --- | --- | --- |
| `forest-track-cutaway.webp` | Page 9, first embedded image, 738 × 291 | Lossless conversion of original transparent FMS mechanism artwork. Numbered buttons are HTML overlays using the brochure's key. The motor is cropped by the original image boundary. |
| `forest-ion-battery.webp` | Page 4, second embedded image, 181 × 304 | Lossless conversion of removable battery illustration. |
| `forest-motor-go.webp` | Page 10, Shuttle Go vector drawing | PDF rendered at scale 6; only the motor drawing isolated, with no alteration to its shape. |
| `forest-motor-ion.webp` | Page 10, Shuttle iOn vector drawing | Same process for iOn. |

The combined artwork is approximately 53 KB. Fixed image dimensions reserve space, and secondary artwork loads lazily.

## Fact boundaries

- Pages 6–7: Go 35 kg / iOn 25 kg straight-track headline capacities; dimensions 7 × 5 × 29 / 7 × 5 × 32.5 cm; net motor weights 1,000 / 1,160 g; speed 12–16 / 14–17 cm/s; maximum power 24 / 30 W; IP20; Touch Control and emergency manual movement. The comparison was checked visually across the two-page table.
- Page 4: removable rechargeable iOn battery. Charging frequency varies with use; the brochure's maximum battery-life statement is not presented as a guarantee.
- Pages 5 and 7 and the current Go manual: Go built-in Wi-Fi, no separate dongle. iOn is not represented as having built-in app control.
- Page 9: eight FMS mechanism labels. This is a manufacturer example, not evidence of the precise supplier rail/carrier/bracket package. Motor clearances cannot be inferred from the drawing.
- Pages 10–11: Go/iOn drawings and EasyTouch six-channel controller. Other motors, Diamond Sense, dongles, wireless connectors and wall switches are not sold by this candidate.
- Go and iOn voltage descriptions differ between the brochure table and parts list. Raw electrical voltage claims are omitted rather than reproducing the inconsistency. Use the exact motor label and relevant installation manual.
- Manufacturer colour choices, curved configurations, track lengths over 5 m, warranty terms and accessory lists do not establish the CurtainsUK supplier package. The owner-approved range remains straight, 100–500 cm, supply only, equal motor prices and all fixtures/fittings included.

Published motor dimensions are not installation clearances. Whole-centimetre cutting, full-range configuration load limits and 4–5 calendar weeks to dispatch are now owner-confirmed. The exact supplied kit remains a separate purchase-release decision in `REVIEW.md`.
