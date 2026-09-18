import { load } from "cheerio";
import type { PtStockRow } from "../pt-stock-reconciliation";

const ORIGIN = "https://www.prestigiousonline.co.uk";
const LOGIN = "/webtex/Content/Security/Default.aspx";
const STOCK = "/webtex/Content/StockEnquiry/Default.aspx";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

type QueryType = PtStockRow["queryType"];
export interface PtQueryResult { rows: PtStockRow[]; total: number; returned: number; observedAt: string }

/** First-party Webtex login and Stock Enquiry. Session cookies exist in memory for one run only. */
export class PtWebtexSession {
  private readonly cookies = new Map<string, string>();
  private authenticated = false;
  private sortOrder = "";
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  private async request(path: string, init: RequestInit = {}, redirectCount = 0): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("user-agent", USER_AGENT);
    if (this.cookies.size) headers.set("cookie", [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    const response = await this.fetcher(`${ORIGIN}${path}`, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(30_000) });
    for (const cookie of response.headers.getSetCookie()) {
      const first = cookie.split(";", 1)[0];
      const split = first.indexOf("=");
      if (split > 0) this.cookies.set(first.slice(0, split), first.slice(split + 1));
    }
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      if (redirectCount >= 3) throw new Error("PT_WEBTEX_REDIRECT_LOOP");
      const destination = new URL(response.headers.get("location")!, `${ORIGIN}${path}`);
      if (destination.origin !== ORIGIN) throw new Error("PT_WEBTEX_EXTERNAL_REDIRECT");
      return this.request(destination.pathname + destination.search, { method: "GET" }, redirectCount + 1);
    }
    if (!response.ok) throw new Error(`PT_WEBTEX_HTTP_${response.status}`);
    return response;
  }

  private async invoke(path: string, parameters: Record<string, string | number>): Promise<string> {
    const response = await this.request(path, {
      method: "POST", headers: { "content-type": "application/json; charset=utf-8", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify(parameters),
    });
    const envelope = await response.json() as { d?: unknown };
    if (typeof envelope.d !== "string") throw new Error("PT_WEBTEX_RESPONSE_INVALID");
    return envelope.d;
  }

  async login(username: string, password: string): Promise<void> {
    if (!username || !password) throw new Error("PT_WEBTEX_CREDENTIALS_REQUIRED");
    const page = await (await this.request(LOGIN)).text();
    if (!page.includes("txtUserName") || !page.includes("__VIEWSTATE")) throw new Error("PT_WEBTEX_LOGIN_PAGE_CHANGED");
    const response = await this.invoke(`${LOGIN}/callbackVerifyLogin`, { l_stPassUserName: username, l_stPassPassword: password });
    const xml = load(response, { xmlMode: true });
    if (xml("RETURNPACKET > STATUS").text().trim() !== "REDIRECT") throw new Error("PT_WEBTEX_LOGIN_FAILED");
    // The portal normally submits the ASP.NET form after the successful AJAX response.
    // Reproduce that first-party completion with the same short-lived session.
    const form = load(page);
    const fields = new URLSearchParams();
    form("form#aspnetForm input[name]").each((_, input) => {
      const name = form(input).attr("name");
      if (name) fields.set(name, form(input).attr("value") ?? "");
    });
    fields.set("txtUserName", username);
    fields.set("txtPassword", password);
    await this.request(LOGIN, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: fields });
    const stockPage = await (await this.request(STOCK)).text();
    if (!stockPage.includes("callbackSearchCollection") || !stockPage.includes("Stock Enquiry")) throw new Error("PT_WEBTEX_AUTH_NOT_ESTABLISHED");
    const stock = load(stockPage);
    const pageData = stock("#webtexPageLoadData").attr("value");
    if (pageData) {
      const initial = load(decodeURIComponent(pageData), { xmlMode: true });
      this.sortOrder = initial("DATA > COLUMNS").attr("InitialSortOrder") ?? "";
    }
    this.authenticated = true;
  }

  async search(queryType: QueryType, queryValue: string): Promise<PtQueryResult> {
    if (!this.authenticated) throw new Error("PT_WEBTEX_AUTH_REQUIRED");
    if (!queryValue.trim()) throw new Error("PT_WEBTEX_QUERY_REQUIRED");
    const method = queryType === "COLLECTION" ? "callbackSearchCollection" :
      queryType === "DESIGN_CODE" ? "callbackSearchDesignCode" : "callbackSearchProdCode";
    const argumentName = queryType === "COLLECTION" ? "l_stPassCollection" :
      queryType === "DESIGN_CODE" ? "l_stPassDesignCode" : "l_stPassProdCode";
    const base: Record<string, string | number> = {
      l_stPassSortOrder: this.sortOrder,
      l_stPassTag: `${queryType.replace("_", " ")}: ${queryValue.toUpperCase()}`,
      l_lnPassRowCount: 0,
      [argumentName]: queryValue,
      l_stPassProdGroupCode: "**NONE**",
    };
    if (queryType === "COLLECTION") base.l_lnPassCollectionCount = 20;
    const xmlText = await this.invoke(`${STOCK}/${method}`, base);
    const observedAt = new Date().toISOString();
    const xml = load(xmlText, { xmlMode: true });
    const status = xml("RETURNPACKET > STATUS").text().trim();
    if (status === "REDIRECT") throw new Error("PT_WEBTEX_AUTH_EXPIRED");
    if (status !== "OKAY") throw new Error("PT_WEBTEX_QUERY_FAILED");
    const total = Number(xml("RETURNPACKET > TOTALROWS").text());
    if (!Number.isInteger(total) || total < 0) throw new Error("PT_WEBTEX_TOTAL_INVALID");
    const rows: PtStockRow[] = [];
    xml("results > Detail > record").each((_, record) => {
      if (xml(record).attr("groupRow")?.toUpperCase() === "TRUE") return;
      const fields = new Map<string, string>();
      xml(record).children("fd").each((__, field) => {
        const id = xml(field).attr("id")?.toUpperCase();
        const raw = xml(field).attr("value") ?? "";
        if (id) fields.set(id, decodeURIComponent(raw));
      });
      const sku = fields.get("C2")?.trim() ?? "";
      if (sku) rows.push({ sku, stockText: fields.get("C4")?.trim() ?? "", indicator: fields.get("C1")?.trim() ?? "",
        observedAt, queryType, queryValue });
    });
    if (rows.length !== total) throw new Error("PT_WEBTEX_PAGINATION_OR_ROW_COUNT_MISMATCH");
    return { rows, total, returned: rows.length, observedAt };
  }
}
