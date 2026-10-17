/** Server-owned release knowledge; unavailable features are not advertised. */
/** @param {string} adviser @param {Record<string,string|undefined>} env */
export function smartTrackGuidance(adviser, env = process.env) {
  if (
    env.CURTAINSUK_SMART_TRACK_ENABLED !== "true" ||
    !["jane", "noah", "james"].includes(adviser)
  )
    return "";
  const role = {
    jane: "Coordinate demonstration fabrics from the shared Fabric Master with the room. A demo fabric adds no curtains to an order. Keep screen appearance separate from a physical sample.",
    noah: "Measure the exact finished track, not glass width. Confirm wall or ceiling, coverage and motor/power clearance from inside facing the window. Never substitute curtain coverage for track length without confirmation. The weight helper totals all panels per track, distinguishes measured from estimated weight, and applies fullness only to coverage width. Missing GSM or component evidence requires weighing or review; do not invent a total.",
    james:
      "Use the visual fitting guide and the applicable current Forest manual. Go limits are set with curtains attached; iOn limits are set before curtains are hung. Bracket spacing and fixings depend on the actual supplied track and substrate. Customers arrange their own fitting; do not certify installation remotely.",
  }[adviser];
  return `\n\nReleased Smart Track Studio guidance (version 2026-10-17-v1): /pages/smart-track-studio and /pages/smart-track-fitting-guide. It provides five illustrative rooms, remote controls, Go app demonstration, configuration and saving to Design My Home. Straight tracks up to 500 cm. Go uses a UK three-pin mains plug, built-in Wi-Fi and a 35 kg headline load; rechargeable-battery iOn has a 25 kg headline load and no built-in Wi-Fi or Forest Link favourite capability. Configuration-specific limits still require the live compatibility check. Both use the included six-channel Forest EasyTouch remote. Motor, control and required track hardware are included. Supply only; no fitting or electrical service. Pencil/pinch use base prices; wave offers 60 or 80 mm carriers and costs more; eyelet is incompatible. Both motors cost the same. VAT-inclusive product prices by length bands up to 100/200/300/400/500 cm are respectively £442.86/£514.29/£542.86/£571.43/£614.29 for pencil/pinch, or £487.14/£565.71/£597.14/£628.57/£675.71 for wave. Delivery is £12.95 once per order containing a track within approved coverage. The server quote is the final price and availability authority. Saving a configuration is not purchasing or load approval. Never promise checkout, exact finish, minimum cutting length/precision or dispatch time unless the current customer quote confirms them. All ordered products dispatch together. Do not promise voice, scheduling or unsupported smart-home integrations. The website demo does not control real devices or require a Forest account. ${role}`;
}
