import { load } from "cheerio";
import type { PtStockRow } from "../pt-stock-reconciliation";

const ORIGIN = "https://www.prestigiousonline.co.uk";
const LOGIN = "/webtex/Content/Security/Default.aspx";
const STOCK = "/webtex/Content/StockEnquiry/Default.aspx";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

type QueryType = PtStockRow["queryType"];
export interface PtQueryResult { rows: PtStockRow[]; total: number; returned: number; observedAt: string }
export interface PtProductDetailContract {
  exactSkuFound: boolean;
  scriptPaths: string[];
  navigationSnippets: string[];
}
export interface PtProductDetailPageContract {
  title: string;
  productCode: string;
  populatedFields: Record<string, string>;
  scriptPaths: string[];
  callbackSnippets: string[];
}
export interface PtProductDetailRawRead {
  sku: string;
  observedAt: string;
  status: string;
  fields: Record<string, string[]>;
}

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
    if (status !== "DATA") {
      const safeStatus = /^[A-Za-z0-9_-]{1,40}$/.test(status) ? status : "UNRECOGNISED";
      throw new Error(`PT_WEBTEX_QUERY_STATUS_${safeStatus}`);
    }
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

  /** Read-only discovery of the portal's own product-detail navigation contract. */
  async productDetailContract(sku: string): Promise<PtProductDetailContract> {
    if (!this.authenticated) throw new Error("PT_WEBTEX_AUTH_REQUIRED");
    if (!/^\d{4}\/\d{3}$/.test(sku)) throw new Error("PT_WEBTEX_PRODUCT_SKU_INVALID");
    const exact = await this.search("PRODUCT_CODE", sku);
    const page = await (await this.request(STOCK)).text();
    const document = load(page);
    const scriptPaths = document("script[src]").map((_, script) => document(script).attr("src") ?? "").get()
      .filter(path => path && !/^https?:/i.test(path));
    const navigationSnippets: string[] = [];
    for (const scriptPath of scriptPaths) {
      const absolute = new URL(scriptPath, `${ORIGIN}${STOCK}`);
      if (absolute.origin !== ORIGIN) continue;
      const source = await (await this.request(absolute.pathname + absolute.search)).text();
      for (const line of source.split(/\r?\n/)) {
        if (/ViewProductDetails|ifrModal|ProductDetails/i.test(line)) {
          navigationSnippets.push(line.trim().replace(/\s+/g, " ").slice(0, 1000));
        }
      }
    }
    return {
      exactSkuFound: exact.rows.filter(row => row.sku === sku).length === 1,
      scriptPaths: [...new Set(scriptPaths)],
      navigationSnippets: [...new Set(navigationSnippets)],
    };
  }

  /** Read-only inspection of one exact product-detail page and its own callbacks. */
  async productDetailPageContract(sku: string): Promise<PtProductDetailPageContract> {
    if (!this.authenticated) throw new Error("PT_WEBTEX_AUTH_REQUIRED");
    if (!/^\d{4}\/\d{3}$/.test(sku)) throw new Error("PT_WEBTEX_PRODUCT_SKU_INVALID");
    const path = `/webtex/Content/ViewProductDetails/Default.aspx?PRODUCT_CODE=${encodeURIComponent(sku)}`;
    const page = await (await this.request(path)).text();
    if (/Please enter your login details below/i.test(page)) throw new Error("PT_WEBTEX_AUTH_EXPIRED");
    const document = load(page);
    const populatedFields: Record<string, string> = {};
    document("[id]").each((_, element) => {
      const id = document(element).attr("id") ?? "";
      const value = (document(element).attr("value") ?? document(element).text()).replace(/\s+/g, " ").trim();
      if (id && value && value.length <= 500 && /product|price|stock|width|repeat|composition|weight|martindale|collection|colour|design|origin|care|usage|due/i.test(id)) {
        populatedFields[id] = value;
      }
    });
    const scriptPaths = document("script[src]").map((_, script) => document(script).attr("src") ?? "").get()
      .filter(scriptPath => scriptPath && !/^https?:/i.test(scriptPath));
    const callbackSnippets: string[] = [];
    for (const match of page.matchAll(/callbackGetProductDetails/gi)) {
      const index = match.index ?? 0;
      callbackSnippets.push(page.slice(Math.max(0, index - 600), index + 900).replace(/\s+/g, " ").trim());
    }
    for (const scriptPath of scriptPaths) {
      const absolute = new URL(scriptPath, `${ORIGIN}${path}`);
      if (absolute.origin !== ORIGIN) continue;
      const source = await (await this.request(absolute.pathname + absolute.search)).text();
      for (const line of source.split(/\r?\n/)) {
        if (/callback|productdesc|freestock|cutprice|greywidth|reportCriteria|imgProducts/i.test(line)) {
          callbackSnippets.push(line.trim().replace(/\s+/g, " ").slice(0, 1200));
        }
      }
    }
    return {
      title: document("title").text().replace(/\s+/g, " ").trim(),
      productCode: document("body").text().match(/Product Code:\s*(\d+\/\d+)/i)?.[1] ?? "",
      populatedFields,
      scriptPaths: [...new Set(scriptPaths)],
      callbackSnippets: [...new Set(callbackSnippets)],
    };
  }

  /** Exact product-detail PageMethod response, reduced to factual XML leaf fields. */
  async productDetailRaw(sku: string): Promise<PtProductDetailRawRead> {
    if (!this.authenticated) throw new Error("PT_WEBTEX_AUTH_REQUIRED");
    if (!/^\d{4}\/\d{3}$/.test(sku)) throw new Error("PT_WEBTEX_PRODUCT_SKU_INVALID");
    const path = "/webtex/Content/ViewProductDetails/Default.aspx/callbackGetProductDetails";
    const xmlText = await this.invoke(path, { l_stPassTag: sku, l_stPassProdCode: sku });
    const xml = load(xmlText, { xmlMode: true });
    const status = xml("RETURNPACKET > STATUS").text().trim();
    if (status === "REDIRECT") throw new Error("PT_WEBTEX_AUTH_EXPIRED");
    const fields: Record<string, string[]> = {};
    xml("fd").each((_, element) => {
      const id = (xml(element).attr("id") ?? "").toUpperCase();
      const raw = xml(element).attr("value") ?? "";
      let decoded = raw;
      try { decoded = decodeURIComponent(raw); } catch { /* A literal percent sign is valid supplier text. */ }
      const value = decoded.replace(/\s+/g, " ").trim();
      if (id && value && value.length <= 2000) (fields[id] ??= []).push(value);
    });
    xml("*").each((_, element) => {
      if (xml(element).children().length) return;
      const name = element.tagName?.toUpperCase() ?? "";
      const value = xml(element).text().replace(/\s+/g, " ").trim();
      if (!name || !value || value.length > 2000) return;
      (fields[name] ??= []).push(value);
    });
    return { sku, observedAt: new Date().toISOString(), status, fields };
  }
}
