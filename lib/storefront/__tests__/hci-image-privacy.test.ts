import test from "node:test";
import assert from "node:assert/strict";
import {assertNoRawReferenceMedia} from "../hci-image-privacy";
test("immutable observations and confirmed palettes may be retained without raw media",()=>{
  assert.doesNotThrow(()=>assertNoRawReferenceMedia({palette:{originalObservation:{primaryColours:["cream"]},confirmedPalette:{primary:["beige"]},provenance:{imageHash:"sha256:abc",modelVersion:"v1"}},commands:[]}));
  assert.doesNotThrow(()=>assertNoRawReferenceMedia({initial:{strategies:[{candidates:[{binding:{imageUrl:'https://cdn.shopify.com/fabric.jpg'}}]}]}}));
});
test("raw image leakage fails closed before any HCI state is persisted",()=>{
  for(const payload of [{bytes:"abc"},{nested:{imageUrl:"https://example.com/private.png"}},{commands:[{value:"data:image/png;base64,abcdef"}]},{unexpected:"A".repeat(5000)}]) assert.throws(()=>assertNoRawReferenceMedia(payload),/RETENTION_REJECTED/);
});
