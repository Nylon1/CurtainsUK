# CurtainsUK Hanging Studio

A private review build of an interactive curtain-hanging guide, from unpacking to the finishing touches. Four headings have Show me, Let me try and Help me hang mine modes.

## Run

```sh
cd tools/hanging-studio-tests
npm ci
npm test
```

The private review Site is https://curtainsuk-hanging-studio-h20261102.hmaliks924.chatgpt.site. `public/hanging-studio/` is a buildless static application with relative asset paths. There are no runtime npm dependencies. Progress is stored on the current browser only.

## Visual and instructional references

- [Evans Textiles D19, 76 mm woven-pocket tape](https://evans-textiles.com/d19-76mm-wvn-pkt-pencil-pleat-500mts-76323): actual three-row woven construction. The real product image is available on demand in the pocket lesson with attribution. This is a reference, not a statement about all CurtainsUK orders.
- [Dunelm pencil pleat demonstration](https://www.youtube.com/watch?v=uQ7ymc92pcI): reviewed actual frames covering cords, gathering, pockets and hanging. [Eyelet demonstration](https://www.youtube.com/watch?v=QBlDnfZX2GE) is also linked in the guide. Videos load from YouTube only after an explicit click.
- [John Lewis fitting guidance](https://www.johnlewis.com/buying-guides/curtains-buying-guide): hook-row height and outer eyelet position.
- [Silent Gliss Wave workroom guide](https://www.silentgliss.co.uk/fileadmin/redaktion/contentserv/Images/Web_Partner_Downloads/SGGB/Various_Documents/Wave_-_Curtain_Workroom_Guide.pdf): the sample uses standard 80 mm glider spacing, 160 mm hook spacing and seven empty pockets. Own-curtain fitting steps require the user to confirm this system matches. Other systems need their supplier's specification.
- [Blinds 2go finishing guidance](https://www.blinds-2go.co.uk/content/instructions/b2g-curtain.pdf): dressing and loose temporary bands. Steam remains optional and care-label dependent.

The ten photographic assets are original AI-created recreations, disclosed in the guide. The eyelet asset was corrected so exactly one outside eyelet lies between bracket and finial. Prompts and reference provenance are recorded in `tools/hanging-studio-tests/ASSET_PROVENANCE.json`. Third-party reference downloads are excluded from version control and deployment. Show me combines step captions, realistic stills and animated mechanical inspection views; it is not newly filmed footage. Runway video generation was unavailable because its connector required reauthentication.

## Verification and review limits

52 passing Node tests cover all four complete practice journeys through a jsdom DOM, error feedback, hook-row height, sequential wave fitting, optional steaming, loose bands, wave-system gating, replay retaining the current real-world action, scrubbing, keyboard focus and on-demand supplier content. Every local image is present; the preview responds with HTTP 200.

Images and rasterised SVG compositions were visually reviewed. Browser layout inspection was unavailable because local browser use is disabled in Work settings. Desktop, short-laptop and mobile layout rules are implemented but must receive browser visual review before integration into the live shop. External YouTube playback also requires a browser check.

The private Site is separate from CurtainsUK production. The repository integration bundle is prepared from protected source `12053b84`. No Shopify theme, live navigation, adviser routes, API aliases, checkout or feature switch is changed.

Integration route: the static entry is `/hanging-studio/index.html`. It is intentionally unlinked pending browser visual review and product approval. The bundle can also be hosted separately for a Shopify page embed.

The extended feature audit and prioritised improvements are recorded in [HANGING_STUDIO_QA.md](./HANGING_STUDIO_QA.md).
