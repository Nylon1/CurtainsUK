/** Preserve only known consultation context through the existing staff sign-in. */
export function consultationResumePath(params: URLSearchParams): string | null {
  if (params.get("next") !== "/admin/curtain-consultation") return null;
  const query = new URLSearchParams();
  query.set("entry", params.get("entry") === "match" ? "match" : "guided");
  const windowType = params.get("window");
  if (windowType && /^[a-z-]{1,60}$/.test(windowType)) query.set("window", windowType);
  return `/admin/curtain-consultation?${query}`;
}
