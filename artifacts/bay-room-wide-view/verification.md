# Wider Bay Window room view

The Room camera now includes the complete reading chair, side table, round rug and footstool, with a lamp, planting and bookcase around the bay. The window seat has a lower cabinet base. The original four curtain panels, fabric width, rail coordinates, 120 cm drop and close-up cameras are retained. Fabrics with the existing verified 100 cm profile retain that profile.

The Armchair palette is part of the existing per-room colour state. Bay garden lighting follows Daylight, Evening and Fabric inspection, and the lamp uses the existing Lamps control.

## Checks

- Browser: all five rooms render, with no reported room error; Bay colours persist after visiting the original four rooms.
- All five Bay palette controls update the scene; Restore palette resets the Bay defaults.
- Room, Curtain and Full curtain views work; four panels retain the same curtain geometry across palette and view changes.
- Mellora Blush and Bergamot Multi/Linen both render on all four panels. Fabric selection preserves the room and its purchasing links.
- Open/close motion, Evening, Lamps and Fabric inspection were exercised. Inspection suppresses the warm lamp sources through the existing control behavior.
- Eight immutable-asset guard tests pass. The full hash guard verifies six packs, 3,653 files and 273,066,817 bytes.
- Compared with the prior pack, only `rooms/bay-room.mjs`, `rooms/environment/index.mjs` and `rooms/viewer.mjs` change; `rooms/environment/bay-furnishings.mjs` is added. Existing curtain modules, supplier textures, shared storefront integration and all four original room assets retain identical bytes.

Browser screenshots and state evidence are included alongside this note. Browser viewport checks do not establish physical-device performance or paid checkout completion.

- Packaged customer preview at 390 x 844: no horizontal overflow; fabric actions enabled; sticky room/open-close controls and Armchair palette remain usable. Asset base is /room-visualiser/5ee06952561616a69bb63ecd/.
