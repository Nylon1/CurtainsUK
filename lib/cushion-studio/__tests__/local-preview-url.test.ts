import test from "node:test";
import assert from "node:assert/strict";
import { localCushionPreviewUrl } from "../local-preview-url";

test("both local preview hosts retain their browser origin for same-origin requests", () => {
  for (const host of ["localhost:4362", "127.0.0.1:4362"]) {
    const url = localCushionPreviewUrl(host, 4362, "/api/cushion-studio/designs");
    assert.equal(url.origin, `http://${host}`);
    assert.equal(url.pathname, "/api/cushion-studio/designs");
  }
});
test("preview host allowlist cannot be bypassed through host or absolute request target", () => {
  for (const host of [undefined, "evil.test:4362", "localhost:4363", "localhost.evil.test:4362", "user@localhost:4362"])
    assert.throws(() => localCushionPreviewUrl(host, 4362, "/"), /HOST_INVALID/);
  for (const target of ["https://evil.test/", "//evil.test/", "http://localhost:4363/", "http://127.0.0.1:4362/"])
    assert.throws(() => localCushionPreviewUrl("localhost:4362", 4362, target), /HOST_INVALID/);
});
