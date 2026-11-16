# Fabric menu and welcome refinement

Follow-up to PR #412, based on protected source `979c169cd9270274e403637434a8f71428040bba`.

The colour menu now places each swatch beside its label, uses even padding and stable hover positions, and gives Browse all fabrics a full-width footer. Type choices use one column so longer names remain easy to scan. Navigation arrows use text presentation on mobile.

Shop by Price uses the existing fabric price bands: Under £30, £30–under £60, £60–under £100, £100–under £150, and £150+. The menu explicitly labels these as fabric price per metre. Links restore the existing `guidePrice` filter; no price calculation, browser controller, catalogue or checkout code changes.

The welcome popup now introduces the online shop and the owner's 15 years of experience, explains the available browsing tools, and thanks customers using their requested wording. The existing 5% signup offer, form, consent, sample offer and terms remain. Its grid row now stays inside the dialog height, allowing longer copy to scroll while the image caption and close button stay visible.

Release scope: six theme files (header CSS, welcome CSS, both snippets, English locale and settings schema), plus the composed production manifest. No theme settings values or backend release are needed. The current live theme was backed up and all 615 baseline files matched the protected source before changes.

Evidence directory: `C:/Users/hamza/outputs/neater-menus-welcome-20261116`. Release through the protected PR checks, upload only the six reviewed theme files, then read back the full theme and check the live menu and popup copy.
