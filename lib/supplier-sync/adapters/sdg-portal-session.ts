/** SDG's observed first-party trade login and session-token refresh. No browser session is imported. */
export const SDG_PORTAL_ORIGIN = "https://trade.sandersondesigngroup.com";
export const SDG_PORTAL_LOGIN_URL = `${SDG_PORTAL_ORIGIN}/api/p/customer/login`;
export const SDG_PORTAL_REFRESH_URL = `${SDG_PORTAL_ORIGIN}/api/p/mertex/refreshToken`;

export interface SdgSessionStats {
  loginAt: string | null;
  refreshCount: number;
  tokenExpiresAt: string | null;
  initialTokenLifetimeSeconds: number | null;
}

type TokenResponse = { token?: unknown; payload?: { exp?: unknown } };

export class SdgPortalSession {
  private readonly cookies = new Map<string, string>();
  private token: string | null = null;
  private expiresAtMs = 0;
  private loginAt: string | null = null;
  private refreshCount = 0;
  private initialTokenLifetimeSeconds: number | null = null;

  constructor(private readonly input: {
    email: string;
    password: string;
    fetchImpl?: typeof fetch;
    clock?: () => Date;
  }) {
    if (!input.email.trim() || !input.password) throw new Error("SDG_PORTAL_LOGIN_CREDENTIALS_REQUIRED");
  }

  get stats(): SdgSessionStats {
    return {
      loginAt: this.loginAt,
      refreshCount: this.refreshCount,
      tokenExpiresAt: this.expiresAtMs ? new Date(this.expiresAtMs).toISOString() : null,
      initialTokenLifetimeSeconds: this.initialTokenLifetimeSeconds,
    };
  }

  private get fetchImpl(): typeof fetch { return this.input.fetchImpl ?? fetch; }
  private get now(): number { return (this.input.clock ?? (() => new Date()))().getTime(); }

  private acceptCookies(response: Response): void {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const values = headers.getSetCookie?.() ?? (headers.get("set-cookie") ? [headers.get("set-cookie")!] : []);
    for (const value of values) {
      const pair = value.split(";", 1)[0];
      const equals = pair.indexOf("=");
      if (equals < 1) continue;
      const name = pair.slice(0, equals).trim();
      const cookieValue = pair.slice(equals + 1);
      if (!/^[A-Za-z0-9_!#$%&'*+.^`|~-]+$/.test(name)) continue;
      if (cookieValue) this.cookies.set(name, cookieValue);
      else this.cookies.delete(name);
    }
  }

  private async firstParty(url: string, init: RequestInit): Promise<Response> {
    if (!url.startsWith(`${SDG_PORTAL_ORIGIN}/`)) throw new Error("SDG_PORTAL_FIRST_PARTY_ONLY");
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Origin: SDG_PORTAL_ORIGIN,
        Referer: `${SDG_PORTAL_ORIGIN}/login`,
        ...(this.cookies.size ? { Cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ") } : {}),
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    this.acceptCookies(response);
    if (response.status >= 300 && response.status < 400) throw new Error("SDG_PORTAL_AUTH_REDIRECT_REQUIRES_OPERATOR");
    return response;
  }

  async login(): Promise<void> {
    if (this.loginAt) return;
    try {
      const page = await this.firstParty(`${SDG_PORTAL_ORIGIN}/login`, { method: "GET" });
      if (!page.ok) throw new Error("SDG_PORTAL_LOGIN_PAGE_FAILED");
      const response = await this.firstParty(SDG_PORTAL_LOGIN_URL, {
        method: "POST",
        body: JSON.stringify({ email: this.input.email, password: this.input.password }),
      });
      if (response.status === 401 || response.status === 403) throw new Error("SDG_PORTAL_LOGIN_REJECTED");
      if (!response.ok) throw new Error("SDG_PORTAL_LOGIN_FAILED");
      const payload: unknown = await response.json();
      if (payload && typeof payload === "object" && "error" in payload && (payload as { error: unknown }).error) {
        throw new Error("SDG_PORTAL_LOGIN_REJECTED");
      }
      if (!this.cookies.size) throw new Error("SDG_PORTAL_SESSION_COOKIE_ABSENT");
      // The first-party refresh is the definitive proof that login established
      // an authorised trade session. A login 200 alone is insufficient.
      await this.refresh();
      this.loginAt = new Date(this.now).toISOString();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("SDG_")) throw error;
      throw new Error("SDG_PORTAL_LOGIN_FAILED");
    } finally {
      // No further password use is needed once the first-party session exists.
      this.input.password = "";
    }
  }

  async refresh(): Promise<void> {
    try {
      const response = await this.firstParty(SDG_PORTAL_REFRESH_URL, { method: "POST" });
      if (response.status === 401 || response.status === 403) throw new Error("SDG_PORTAL_SESSION_EXPIRED");
      if (!response.ok) throw new Error("SDG_PORTAL_REFRESH_FAILED");
      const payload: TokenResponse = await response.json();
      const exp = payload?.payload?.exp;
      if (typeof payload?.token !== "string" || !payload.token || typeof exp !== "number" || !Number.isFinite(exp) || exp * 1000 <= this.now + 10000) {
        throw new Error("SDG_PORTAL_REFRESH_SHAPE_CHANGED");
      }
      this.token = payload.token;
      this.expiresAtMs = exp * 1000;
      this.refreshCount += 1;
      this.initialTokenLifetimeSeconds ??= Math.floor((this.expiresAtMs - this.now) / 1000);
    } catch (error) {
      this.token = null;
      this.expiresAtMs = 0;
      if (error instanceof Error && error.message.startsWith("SDG_")) throw error;
      throw new Error("SDG_PORTAL_REFRESH_FAILED");
    }
  }

  async getBearerToken(): Promise<string> {
    if (!this.loginAt) await this.login();
    else if (!this.token || this.expiresAtMs - 10000 <= this.now) await this.refresh();
    if (!this.token) throw new Error("SDG_PORTAL_SESSION_EXPIRED");
    return this.token;
  }
}
