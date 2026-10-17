import "server-only";
import type {SmartTrackServices} from "../smart-track/checkout";
import { roomsFeatureEnabled } from "../storefront/rooms-server";
import { houseCheckoutConfigFromEnvironment, executePreparedHouseCheckout } from "../storefront/rooms-checkout-server";
import { confirmedCushionDispatch, OWNER_CONFIRMED_CURTAIN_DISPATCH } from "./dispatch";
import { createMixedServices, mixedEnabled } from "./mixed-server";
import type { CushionCheckoutServices } from "./checkout";
import type { MyHomeServices } from "./my-home";

/** Existing feature and production gates remain authoritative. Configuration is
 * server-only; a browser's asserted dispatch or release flag is never consumed. */
export function createMyHomeServices(cushion: CushionCheckoutServices, options: {cushionPurchasesEnabled?: boolean;tracks?:SmartTrackServices} = {}): MyHomeServices {
  let curtainDispatch: unknown = OWNER_CONFIRMED_CURTAIN_DISPATCH;
  const source = process.env.CURTAINSUK_MY_HOME_CURTAIN_DISPATCH_JSON;
  if (source) {
    try { curtainDispatch = confirmedCushionDispatch(JSON.parse(source)); }
    catch { curtainDispatch = null; }
  }
  let curtains = false;
  if (roomsFeatureEnabled()) {
    try { houseCheckoutConfigFromEnvironment(); curtains = true; }
    catch { /* Exploration remains possible while production gates are closed. */ }
  }
  return {
    tracks:options.tracks,
    mixed:createMixedServices(cushion),curtainDispatch,
    releases:{curtains,cushions:options.cushionPurchasesEnabled === true,mixed:mixedEnabled()},
    executeHouse:prepared=>executePreparedHouseCheckout(prepared,houseCheckoutConfigFromEnvironment()),
  };
}
