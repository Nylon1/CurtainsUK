// Next handles this compile-time marker itself. The standalone Node review
// loads the same server modules without changing shared node_modules.
import { registerHooks } from "node:module";
if (process.env.VERCEL || process.env.NODE_ENV === "production")
  throw new Error("CUSHION_LOCAL_PREVIEW_ONLY");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return {
        url: new URL("./cushion-preview-server-marker.cjs", import.meta.url)
          .href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
