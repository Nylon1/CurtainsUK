# Homepage image markup repair — 15 September 2026

Only Shopify theme 182264136059 (Updated copy of Dawn, unpublished) was edited.
Only uploaded file: sections/curtainsuk-fabric-intelligence.liquid.

## Fault and repair

Line 27 ended in the exact fragment:

```html
<img src="https://cdn.shopify.com/s/files/1/0256
```

The unfinished src swallowed subsequent Shopify wrapper markup into the image URL. The source file also lacked closing tags for the image media, card, grid, wrapper, detail section and outer homepage section.

The existing sections/cukfi-card-fix.liquid explicitly identifies the intended fifth-card image as curtainsuk-card5-replacement.jpg?v=1789454219. The file was retrieved successfully (HTTP 200), visually inspected, and confirmed to show blue patterned curtains beside a window seat.

Completed line 27 with that same image URL, descriptive alt text and its actual 1536 × 1536 dimensions, then closed the existing containers on lines 27–29. No copy, stylesheet, colour, layout or other image changes. Existing background treatment remains unchanged.

## Verification

- Exact name/ID/unpublished role verified before edit and immediately before single-file upload.
- Liquid/HTML AST syntax parsing passes; the malformed-tag syntax failure is resolved.
- Full Theme Check still reports pre-existing missing image dimensions on other images and the old hardcoded collections route. These unrelated findings were not changed.
- Five existing card images load (naturalWidth > 0), including card 5 at 1536px. All five src values are well formed.
- Desktop card widths/heights and all homepage heading text exactly match the pre-repair measurements.
- Desktop and actual CSS widths 390/412: no page-level horizontal overflow; existing horizontally scrollable mobile card row preserved. Card 5 can be scrolled into view.
- Remote readback exactly matches the repaired file. Remote Three Ways snippet, homepage JSON template, and card-5 styling file remain byte-identical to the before snapshots.
- Live theme 182264234363 was never targeted. No publication operation performed.

Local evidence and before/after files: C:/Users/hamza/curtainsuk-image-repair-evidence.
