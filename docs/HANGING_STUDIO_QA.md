> Historical audit of the superseded multi-heading guide. The active pencil-only walkthrough and its 12 checks are described in HANGING_STUDIO.md.

# Hanging Studio feature review — 2 November 2026

The expanded automated suite passes **52 tests**, including all 12 heading/mode journeys (25 lesson steps across three modes). Ten newly added regression cases initially failed; the corresponding defects were repaired. This is a functional review, not a browser or accessibility certification.

## Results

| Area | Result | Evidence and limits |
| --- | --- | --- |
| Pencil pleat, eyelet, Wave and pinch pleat | Pass | Every step completes in Show me, Let me try and Help me hang mine. Finish and restart work. |
| Gathering, pocket rows and hook placement | Pass | Cords must be secured first; excess cord is retained; all three rows change curtain height; cord/rail mistakes are explained. Upward drag and tap paths work in the DOM simulation. |
| Eyelet and Wave fitting | Pass | Outer eyelet position is checked; Wave connections/folds follow the sequence; all three own-curtain fitting stages require the matching system and re-lock when confirmation is removed. |
| Dressing, steam and settling | Functional pass; visual improvement needed | Completion, optional steaming and loose-band feedback work. Several interactions use static photographs with markers/text, so the material does not always visibly respond to the action. |
| Playback | Pass after fixes | Play, pause, resume, finish, restart, replay, half speed, scrubbing, hidden-page pause and reduced-motion replay are covered. |
| Controls and keyboard | Pass in DOM | Mode arrows, SVG Enter/Space, reset, view changes, ring selection, hook type selection and focus preservation are covered. Actual touch, assistive technology and browser rendering remain unverified. |
| Saved progress | Pass after fixes | Heading, step, mode and completed steps restore; reset clears them. Malformed state and unavailable storage no longer prevent use. The exact current sub-action is not yet saved. |
| Help, sources and media | Pass for controls and URLs | Dialogs open/close; iframe is removed on close; the correct video is selected; Evans imagery loads only on request. Video playback itself requires browser testing. |
| Published assets and links | HTTP pass | 15 hosted files and nine external reference endpoints responded with 200. Scripts, CSS and all ten images matched the published source byte for byte before fixes. Sites adds its own HTML markup, so the document body is also verified semantically on the updated publication. |
| Responsive layouts | Not verified | Local browser use is disabled in Work settings. CSS review cannot prove viewport fit, sticky behaviour or real touch accuracy. |

## Defects repaired

1. Replay while already playing could leave two animation loops running.
2. Hiding the page paused animation but left the control labelled Pause.
3. Playback rebuilt controls every frame, losing keyboard focus; it now updates the existing controls.
4. Switching visual views lost keyboard focus; replaced controls now restore focus.
5. Show me inspection exposed practice controls that did nothing; these no longer appear as interactive controls.
6. A sideways drag could count as hook insertion.
7. A rejected downward drag could become a successful insertion when followed by the browser's click event.
8. Choosing rings changed the drawing but left the glider heading/caption in place.
9. Saved JSON `null` could prevent the guide from starting.
10. An invalid saved heading such as `toString` could be accepted through inherited object properties and crash startup.

## Recommended improvements, in priority order

1. **Make the fabric visibly respond.** Use short sequential shots or animated layers for arranging folds, placing/removing bands and moving the steamer. Currently some actions only update feedback. This is the largest gap between a working tutorial and the intended premium visual experience.
2. **Add short, fitting-specific demonstrations.** Use close-up clips of the hook entering the actual pocket, the reverse of the heading and the hook entering a glider. Show a real pin-hook variant when that option is selected. Retain the supplier video links for context.
3. **Match the guide to the supplied system.** Offer an identification screen or order-specific configuration for tape, hook and Wave glider spacing. The current standard Silent Gliss 80/160 example is deliberately restricted; it is not a universal Wave lesson.
4. **Improve use beside the window.** Save the exact sub-action, add a full-screen close-up/zoom view, and use generous touch controls. [W3C's target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) explains why size and spacing matter; a full browser and touch review is still needed.

Before live-shop integration, review desktop 1440×900, short laptop 1366×650, phone 390×844 and narrow phone 320×568. Check sticky panels, overflow, slider/drag behaviour, keyboard focus, video playback and screen-reader feedback. Also verify that visual states accurately show each action, especially folds and temporary bands.

Automated results and HTTP evidence are reproducible with `npm test` and `scripts/check-live.mjs` in the Site source. The HTTP script takes the Sites service credential through hidden stdin and never writes it to a file or sends it to external reference sites. Audit artefacts contain no credentials.
