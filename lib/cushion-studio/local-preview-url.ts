/** Loopback review only. Preserve the allowlisted host for same-origin POSTs. */
export function localCushionPreviewUrl(host: string | undefined, port: number, target: string) {
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host ?? ""))
    throw new Error("CUSHION_PREVIEW_HOST_INVALID");
  const origin = `http://${host}`;
  const url = new URL(target, origin);
  if (url.origin !== origin) throw new Error("CUSHION_PREVIEW_HOST_INVALID");
  return url;
}
