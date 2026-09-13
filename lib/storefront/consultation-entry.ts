/** Preserve only known consultation context through the existing staff sign-in. */
export function consultationResumePath(params: URLSearchParams): string | null {
  if (params.get("next") !== "/admin/curtain-consultation") return null;
  const query = new URLSearchParams();
  query.set("entry", params.get("entry") === "match" ? "match" : "guided");
  const windowType = params.get("window");
  if (windowType && /^[a-z-]{1,60}$/.test(windowType)) query.set("window", windowType);
  const session = params.get("session");
  if (session && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(session)) query.set("session", session);
  return `/admin/curtain-consultation?${query}`;
}
