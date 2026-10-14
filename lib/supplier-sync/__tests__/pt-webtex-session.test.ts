import test from "node:test";
import assert from "node:assert/strict";
import { PtWebtexSession } from "../adapters/pt-webtex-session";

const initial = '<html><input id="txtUserName"><input name="__VIEWSTATE" value="state"><form id="aspnetForm"><input name="__VIEWSTATE" value="state"></form></html>';
const stock = '<html><title>Stock Enquiry</title><script>callbackSearchCollection</script><input id="webtexPageLoadData" value="%3CRETURNPACKET%3E%3CDATA%3E%3CCOLUMNS%20InitialSortOrder%3D%22C2%22%2F%3E%3C%2FDATA%3E%3C%2FRETURNPACKET%3E"></html>';
const result = '<RETURNPACKET><STATUS>DATA</STATUS><TOTALROWS>2</TOTALROWS><results><Detail>' +
  '<record groupRow="FALSE"><fd id="C1" value=""/><fd id="C2" value="4262/770"/><fd id="C4" value="295 M"/></record>' +
  '<record groupRow="FALSE"><fd id="C1" value="L"/><fd id="C2" value="4264/162"/><fd id="C4" value="1 M"/></record>' +
  '</Detail></results></RETURNPACKET>';

test("first-party PT session uses short-lived cookies and parses exact stock rows", async () => {
  const requests: Array<{ url: string; body: string | undefined; cookie: string | null }> = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    requests.push({ url, body: typeof init.body === "string" ? init.body : undefined,
      cookie: new Headers(init.headers).get("cookie") });
    if (url.endsWith("/callbackVerifyLogin")) return new Response(JSON.stringify({ d: '<RETURNPACKET><STATUS>REDIRECT</STATUS></RETURNPACKET>' }),
      { headers: { "set-cookie": "ASP.NET_SessionId=private; HttpOnly" } });
    if (url.endsWith("/callbackSearchCollection")) return new Response(JSON.stringify({ d: result }));
    if (url.includes("/StockEnquiry/")) return new Response(stock);
    return new Response(initial);
  }) as typeof fetch;
  const session = new PtWebtexSession(fetcher);
  await session.login("trade-user", "secret-test-password");
  const searched = await session.search("COLLECTION", "Rustic Persian");
  assert.equal(searched.total, 2);
  assert.deepEqual(searched.rows.map((item) => [item.sku, item.stockText, item.indicator]),
    [["4262/770", "295 M", ""], ["4264/162", "1 M", "L"]]);
  assert.match(requests.at(-1)!.cookie ?? "", /ASP.NET_SessionId=private/);
  assert.equal(JSON.parse(requests.at(-1)!.body!).l_stPassCollection, "Rustic Persian");
});

test("Webtex authentication expiry cannot be mistaken for zero stock", async () => {
  const fetcher = (async (url: string) => {
    if (url.endsWith("/callbackVerifyLogin")) return new Response(JSON.stringify({ d: '<RETURNPACKET><STATUS>REDIRECT</STATUS></RETURNPACKET>' }));
    if (url.endsWith("/callbackSearchCollection")) return new Response(JSON.stringify({ d: '<RETURNPACKET><STATUS>REDIRECT</STATUS></RETURNPACKET>' }));
    if (url.includes("/StockEnquiry/")) return new Response(stock);
    return new Response(initial);
  }) as typeof fetch;
  const session = new PtWebtexSession(fetcher);
  await session.login("trade-user", "secret-test-password");
  await assert.rejects(session.search("COLLECTION", "Rustic Persian"), /PT_WEBTEX_AUTH_EXPIRED/);
});

test("PT stock search retries one transport timeout, but never replays login", async () => {
  let loginAttempts = 0, stockAttempts = 0;
  const delays: number[] = [];
  const fetcher = (async (url: string) => {
    if (url.endsWith("/callbackVerifyLogin")) {
      loginAttempts += 1;
      return new Response(JSON.stringify({ d: '<RETURNPACKET><STATUS>REDIRECT</STATUS></RETURNPACKET>' }));
    }
    if (url.endsWith("/callbackSearchCollection")) {
      stockAttempts += 1;
      if (stockAttempts === 1) {
        const error = new Error("private transport details must not appear");
        error.name = "TimeoutError";
        throw error;
      }
      return new Response(JSON.stringify({ d: result }));
    }
    if (url.includes("/StockEnquiry/")) return new Response(stock);
    return new Response(initial);
  }) as typeof fetch;
  const session = new PtWebtexSession(fetcher, async (ms) => { delays.push(ms); });
  await session.login("trade-user", "secret-test-password");
  const searched = await session.search("COLLECTION", "Rustic Persian");
  assert.equal(searched.returned, 2);
  assert.equal(stockAttempts, 2);
  assert.equal(loginAttempts, 1);
  assert.deepEqual(delays, [1000]);
});

test("PT stock search retries bounded 503 responses but stops on a third failure", async () => {
  let stockAttempts = 0;
  const delays: number[] = [];
  const fetcher = (async (url: string) => {
    if (url.endsWith("/callbackVerifyLogin")) return new Response(JSON.stringify({ d: '<RETURNPACKET><STATUS>REDIRECT</STATUS></RETURNPACKET>' }));
    if (url.endsWith("/callbackSearchCollection")) {
      stockAttempts += 1;
      return new Response("temporary service unavailable", { status: 503 });
    }
    if (url.includes("/StockEnquiry/")) return new Response(stock);
    return new Response(initial);
  }) as typeof fetch;
  const session = new PtWebtexSession(fetcher, async (ms) => { delays.push(ms); });
  await session.login("trade-user", "secret-test-password");
  await assert.rejects(session.search("COLLECTION", "Rustic Persian"), /PT_WEBTEX_HTTP_503/);
  assert.equal(stockAttempts, 3);
  assert.deepEqual(delays, [1000, 2000]);
});

test("Webtex invalid JSON is a hard failure, not missing stock or a retry", async () => {
  let stockAttempts = 0;
  const fetcher = (async (url: string) => {
    if (url.endsWith("/callbackVerifyLogin")) return new Response(JSON.stringify({ d: '<RETURNPACKET><STATUS>REDIRECT</STATUS></RETURNPACKET>' }));
    if (url.endsWith("/callbackSearchCollection")) {
      stockAttempts += 1;
      return new Response("<html>login page</html>", { headers: { "content-type": "text/html" } });
    }
    if (url.includes("/StockEnquiry/")) return new Response(stock);
    return new Response(initial);
  }) as typeof fetch;
  const session = new PtWebtexSession(fetcher, async () => { throw Error("unexpected backoff"); });
  await session.login("trade-user", "secret-test-password");
  await assert.rejects(session.search("COLLECTION", "Rustic Persian"), /PT_WEBTEX_RESPONSE_NOT_JSON/);
  assert.equal(stockAttempts, 1);
});
