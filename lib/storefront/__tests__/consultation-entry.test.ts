import test from "node:test";
import assert from "node:assert/strict";
import { consultationResumePath } from "../consultation-entry";
test("sample return preserves the exact consultation through staff sign-in", () => {
  const session = "d8052224-4554-428c-9873-c94fefc665d4";
  assert.equal(consultationResumePath(new URLSearchParams({ next: "/admin/curtain-consultation", session })), `/admin/curtain-consultation?entry=guided&session=${session}`);
  assert.equal(consultationResumePath(new URLSearchParams({ next: "/admin/curtain-consultation", session: "invalid" })), "/admin/curtain-consultation?entry=guided");
});
test("staff login preserves the room-first Bay route without forwarding arbitrary parameters", () => {
  assert.equal(consultationResumePath(new URLSearchParams({next:"/admin/curtain-consultation",entry:"match",window:"bay-window",token:"untrusted"})), "/admin/curtain-consultation?entry=match&window=bay-window");
  assert.equal(consultationResumePath(new URLSearchParams({next:"/admin/curtain-consultation",entry:"guided"})), "/admin/curtain-consultation?entry=guided");
});
test("consultation resume cannot become an external or unrelated admin redirect", () => {
  for (const next of ["https://evil.example","//evil.example","/admin/reviews","/admin/curtain-consultation/../other"]) assert.equal(consultationResumePath(new URLSearchParams({next})),null);
  assert.equal(consultationResumePath(new URLSearchParams({next:"/admin/curtain-consultation",window:"https://evil.example"})),"/admin/curtain-consultation?entry=guided");
});
