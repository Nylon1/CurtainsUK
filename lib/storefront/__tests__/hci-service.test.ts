import test from "node:test";
import assert from "node:assert/strict";
import { HCI_HOSTED_RELEASE } from "../hci-release";
import {
  hciHostedEnabled,
  hciServiceCommand,
  requestHostedHci,
} from "../hci-service-core";

const id = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const release = {
  ...HCI_HOSTED_RELEASE,
  humanQuality: "READY" as const,
  serviceContractReady: true,
};
const env = {
  CURTAINSUK_HCI_MODE: "STAGING_INTERNAL",
  CURTAINSUK_DEPLOYMENT_STAGE: "STAGING",
  VERCEL_ENV: "preview",
  CURTAINSUK_HCI_SERVICE_URL: "https://hci.example.test/consultation",
  CURTAINSUK_HCI_SERVICE_TOKEN: "test-only-service-token-000000000000000",
};
const command = {
  sessionId: id,
  requestId,
  revision: 3,
  action: { type: "answer", answerId: "blue" },
};
const view = () => ({
  version: "curtainsuk-hci-presentation-v1",
  sourceCommit: release.sourceCommit,
  sessionId: id,
  revision: 4,
  phase: "complete",
  profileSummary: "A calm room.",
  question: null,
  stimulusId: null,
  windowSlug: "bay-window",
  shortlist: [
    {
      fabricMasterId: "sdg-exact",
      supplierSku: "EXACT",
      reactionId: "hci-exact",
      rank: 1,
      explanation: ["Calm pattern"],
      unknowns: [],
    },
  ],
});
const response = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

test("service credential rotation retains session ownership and browser owner overrides are ignored", async () => {
  const owners: string[] = [];
  for (const token of [
    env.CURTAINSUK_HCI_SERVICE_TOKEN,
    "rotated-test-token-000000000000000000000",
  ]) {
    await requestHostedHci({
      env: { ...env, CURTAINSUK_HCI_SERVICE_TOKEN: token },
      release,
      staffId: id,
      command: { ...command, owner: "browser-owner" },
      fetchImpl: async (_url, init) => {
        owners.push(JSON.parse(String(init?.body)).owner);
        return response(view());
      },
    });
  }
  assert.equal(owners[0], owners[1]);
  assert.notEqual(owners[0], "browser-owner");
});

test("current quality gate blocks all service calls even when an environment flag requests HCI", async () => {
  assert.equal(hciHostedEnabled(env, HCI_HOSTED_RELEASE), false);
  for (const config of [
    {},
    { ...env, CURTAINSUK_HCI_MODE: "DISABLED" },
    { ...env, VERCEL_ENV: "production" },
    { ...env, CURTAINSUK_DEPLOYMENT_STAGE: "PRODUCTION" },
  ]) {
    await assert.rejects(
      requestHostedHci({
        env: config,
        release,
        staffId: id,
        command,
        fetchImpl: async () => assert.fail("must not call HCI"),
      }),
      /HCI_DISABLED/,
    );
  }
  await assert.rejects(
    requestHostedHci({
      env,
      release: HCI_HOSTED_RELEASE,
      staffId: id,
      command,
      fetchImpl: async () => assert.fail("no human READY"),
    }),
    /HCI_DISABLED/,
  );
});
test("hosted boundary owns identity, preserves idempotency and strips privileged request/response fields", async () => {
  const requests: string[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      `Bearer ${env.CURTAINSUK_HCI_SERVICE_TOKEN}`,
    );
    const body = JSON.parse(String(init?.body));
    requests.push(String(init?.body));
    assert.equal(body.requestId, requestId);
    assert.equal(body.revision, 3);
    assert.notEqual(body.owner, id);
    assert.match(body.owner, /^[a-f0-9]{64}$/);
    assert.equal(body.commandLog, undefined);
    assert.equal(body.action.debug, undefined);
    return response({
      ...view(),
      aggregate: { secret: true },
      internalRanking: [100],
      credentials: "private",
      catalogue: ["privileged"],
      shortlist: view().shortlist.map((card) => ({
        ...card,
        cost: 123,
        imageUrl: "private",
      })),
    });
  };
  for (let i = 0; i < 2; i++) {
    const result = await requestHostedHci({
      env,
      release,
      staffId: id,
      command: {
        ...command,
        owner: "attacker",
        commandLog: ["forged"],
        action: { ...command.action, debug: true },
      },
      fetchImpl,
    });
    assert.equal(result.shortlist[0].fabricMasterId, "sdg-exact");
    assert.doesNotMatch(
      JSON.stringify(result),
      /secret|aggregate|internalRanking|credentials|catalogue|cost|imageUrl|service-token/,
    );
  }
  assert.equal(
    requests[0],
    requests[1],
    "retry retains the exact upstream request identity",
  );
});
test("service failures never become fabricated recommendations and are never automatically retried", async () => {
  for (const fetchImpl of [
    async () => {
      throw new Error("private upstream failure");
    },
    async () => new Response("secret", { status: 500 }),
    async () => response({ ...view(), sessionId: requestId }),
    async () => response({ ...view(), sourceCommit: "wrong" }),
    async () =>
      response({
        ...view(),
        shortlist: [...view().shortlist, ...view().shortlist],
      }),
    async () => response({ ...view(), private: "x".repeat(33_000) }),
  ]) {
    let calls = 0;
    await assert.rejects(
      requestHostedHci({
        env,
        release,
        staffId: id,
        command,
        fetchImpl: async () => {
          calls++;
          return fetchImpl();
        },
      }),
      /HCI_(SERVICE_UNAVAILABLE|CONTRACT_INVALID)/,
    );
    assert.equal(calls, 1);
  }
});
test("invalid commands and unsafe endpoint configuration fail before transport", async () => {
  assert.throws(
    () =>
      hciServiceCommand({ ...command, action: { type: "replace-history" } }),
    /INVALID/,
  );
  assert.throws(
    () => hciServiceCommand({ ...command, revision: undefined }),
    /INVALID/,
  );
  for (const url of [
    "http://hci.example.test",
    "https://user:password@hci.example.test",
    "https://hci.example.test?token=private",
  ]) {
    await assert.rejects(
      requestHostedHci({
        env: { ...env, CURTAINSUK_HCI_SERVICE_URL: url },
        release,
        staffId: id,
        command,
        fetchImpl: async () => assert.fail("unsafe endpoint"),
      }),
      /HCI_CONFIGURATION_INVALID/,
    );
  }
});
