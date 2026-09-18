/** Read-only authenticated SDG proof. No Supabase client, supplier order, or Shopify write. */
import { createInterface } from "node:readline/promises";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { readSdgPortalStock, type SdgStockIdentity, type SdgStockReadResult } from "../lib/supplier-sync/adapters/sanderson-design-group";
import { SdgPortalSession } from "../lib/supplier-sync/adapters/sdg-portal-session";

const PRIVATE_DIR = resolve("artifacts/sdg-portal-private");
const MANIFEST = resolve(PRIVATE_DIR, "current-sdg-identities-2026-09-18.json");
const BATCH_SIZE = 100;

async function promptCredentials(): Promise<{ email: string; password: string }> {
  if (!stdin.isTTY || !stdout.isTTY || !stdin.setRawMode) throw new Error("SDG_SECURE_TTY_REQUIRED");
  const rl = createInterface({ input: stdin, output: stdout });
  const email = (await rl.question("SDG trade-account email: ")).trim();
  rl.close();
  stdout.write("SDG password (hidden): ");
  const password = await new Promise<string>((resolvePassword, reject) => {
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolvePassword(value);
    };
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u0003") return finish(new Error("SDG_OPERATOR_CANCELLED"));
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else value += character;
      }
    };
    stdin.on("data", onData);
  });
  if (!email || !password) throw new Error("SDG_PORTAL_LOGIN_CREDENTIALS_REQUIRED");
  return { email, password };
}

function spread(identities: SdgStockIdentity[], count: number): SdgStockIdentity[] {
  if (count >= identities.length) return identities;
  if (count === 1) return [identities[0]];
  return Array.from({ length: count }, (_, index) => identities[Math.floor(index * (identities.length - 1) / (count - 1))]);
}

function summarize(result: SdgStockReadResult) {
  const reasons = Object.fromEntries([...new Set(result.exceptions.map((item) => item.reason))].map((reason) => [reason, result.exceptions.filter((item) => item.reason === reason).length]));
  const allOrders = result.details.flatMap((item) => item.purchaseOrders);
  return {
    expected: result.requested,
    exactSkuResolved: result.details.length,
    validMetreObservations: result.snapshots.length,
    availableNowPositive: result.details.filter((item) => item.primaryMetres !== null && item.primaryMetres > 0).length,
    availableNowAtLeast30m: result.details.filter((item) => item.primaryMetres !== null && item.primaryMetres >= 30).length,
    zeroAvailableNow: result.details.filter((item) => item.primaryMetres === 0).length,
    offsitePositive: result.details.filter((item) => item.offsiteMetres !== null && item.offsiteMetres > 0).length,
    futurePositive: result.details.filter((item) => item.futureMetres !== null && item.futureMetres > 0).length,
    futurePurchaseOrdersWithDueDate: allOrders.filter((item) => item.dueDate !== null).length,
    unresolved: result.exceptions.length,
    reasons,
    requests: result.batches.length,
    attempts: result.batches.reduce((total, item) => total + item.attempts, 0),
    retries: result.batches.reduce((total, item) => total + item.retries, 0),
    throttledResponses: result.batches.reduce((total, item) => total + item.throttled, 0),
    meanBatchElapsedMs: result.batches.length ? Math.round(result.batches.reduce((total, item) => total + item.latencyMs, 0) / result.batches.length) : null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const stagesOnly = args.includes("--stages-only");
  const startArg = args.find((arg) => arg.startsWith("--start-at="));
  if (args.some((arg) => arg !== "--stages-only" && arg !== startArg) || (stagesOnly && startArg)) {
    throw new Error("SDG_PROOF_USAGE: tsx scripts/curtainsuk-sdg-portal-stock-proof.ts [--stages-only | --start-at=CHECKPOINT]");
  }
  const startAt = startArg ? Number(startArg.slice("--start-at=".length)) : 0;
  const raw: unknown = JSON.parse(await readFile(MANIFEST, "utf8"));
  if (!Array.isArray(raw) || raw.length !== 8636 || !raw.every((item): item is SdgStockIdentity => item && typeof item.supplierSku === "string" && typeof item.brandId === "string")) {
    throw new Error("SDG_EXACT_IDENTITY_MANIFEST_REQUIRED");
  }
  const identities = raw;
  if (new Set(identities.map((item) => item.supplierSku)).size !== identities.length) throw new Error("SDG_DUPLICATE_MANIFEST_SKU");
  await mkdir(PRIVATE_DIR, { recursive: true });
  let resumedFrom: string | undefined;
  if (startAt !== 0) {
    if (!Number.isInteger(startAt) || startAt <= 0 || startAt >= identities.length || startAt % BATCH_SIZE !== 0) throw new Error("SDG_INVALID_RESUME_CHECKPOINT");
    const reports = (await readdir(PRIVATE_DIR)).filter((name) => /^dry-run-.*\.json$/.test(name)).sort().reverse();
    for (const name of reports) {
      const previous: unknown = JSON.parse(await readFile(resolve(PRIVATE_DIR, name), "utf8"));
      if (!previous || typeof previous !== "object") continue;
      const prior = previous as Record<string, unknown>;
      const full = prior.full as Record<string, unknown> | undefined;
      if (prior.complete !== false || prior.manifestCount !== identities.length || full?.completedSkus !== startAt || full?.requests !== startAt / BATCH_SIZE) continue;
      const details = full.details;
      const exceptions = full.exceptions;
      if (!Array.isArray(details) || !Array.isArray(exceptions) || details.length + exceptions.length !== startAt) continue;
      const expected = new Set(identities.slice(0, startAt).map((item) => item.supplierSku));
      const actual = [...details, ...exceptions].map((item) => item?.supplierSku);
      if (new Set(actual).size !== startAt || actual.some((sku) => !expected.has(sku))) continue;
      resumedFrom = name;
      break;
    }
    if (!resumedFrom) throw new Error("SDG_RESUME_CHECKPOINT_NOT_PROVEN");
  }
  const reportPath = resolve(PRIVATE_DIR, `dry-run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const credentials = await promptCredentials();
  const session = new SdgPortalSession({ ...credentials });
  credentials.password = "";
  const startedAt = new Date();
  const report: {
    startedAt: string; completedAt?: string; complete: boolean; errorCode?: string;
    source: string; manifestCount: number; rangeStart: number; rangeExpected: number; resumedFrom?: string; auth?: object;
    stages: Record<string, unknown>; full?: unknown;
  } = {
    startedAt: startedAt.toISOString(), complete: false,
    source: "SDG first-party customer/login → mertex/refreshToken → Product/detail; read-only",
    manifestCount: identities.length, rangeStart: startAt, rangeExpected: identities.length - startAt, resumedFrom, stages: {},
  };
  const save = async () => writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  let stage = "login";
  try {
    await session.login();
    for (const count of startAt ? [] : [1, 10, 100]) {
      stage = `stage-${count}`;
      const stageStarted = Date.now();
      const result = await readSdgPortalStock({ identities: spread(identities, count), getBearerToken: () => session.getBearerToken() });
      report.stages[String(count)] = { ...summarize(result), runtimeMs: Date.now() - stageStarted, details: result.details, exceptions: result.exceptions, batches: result.batches };
      report.auth = session.stats;
      await save();
      if (result.exceptions.some((item) => item.reason === "DUPLICATE_PORTAL_SKU")) throw new Error("SDG_PORTAL_AMBIGUOUS_IDENTITY");
      if (count === 1) {
        stage = "refresh-proof";
        await session.refresh();
      }
    }
    stage = "refresh-proof";
    await session.refresh();
    report.auth = session.stats;
    await save();
    if (!stagesOnly) {
      stage = "full-dry-run";
      const fullStarted = Date.now();
      const full: SdgStockReadResult = { requested: identities.length - startAt, snapshots: [], details: [], exceptions: [], batches: [] };
      for (let offset = startAt; offset < identities.length; offset += BATCH_SIZE) {
        const result = await readSdgPortalStock({ identities: identities.slice(offset, offset + BATCH_SIZE), getBearerToken: () => session.getBearerToken() });
        full.snapshots.push(...result.snapshots);
        full.details.push(...result.details);
        full.exceptions.push(...result.exceptions);
        full.batches.push(...result.batches);
        report.full = { ...summarize(full), completedSkus: Math.min(offset + BATCH_SIZE, identities.length), runtimeMs: Date.now() - fullStarted, details: full.details, exceptions: full.exceptions, batches: full.batches };
        report.auth = session.stats;
        await save();
        if (result.exceptions.some((item) => item.reason === "DUPLICATE_PORTAL_SKU")) throw new Error("SDG_PORTAL_AMBIGUOUS_IDENTITY");
      }
    }
    report.complete = true;
    report.completedAt = new Date().toISOString();
    report.auth = session.stats;
    await save();
    console.log(JSON.stringify({ complete: true, stages: Object.fromEntries(Object.entries(report.stages).map(([key, value]) => [key, { ...value as object, details: undefined, exceptions: undefined, batches: undefined }])), full: report.full ? { ...report.full as object, details: undefined, exceptions: undefined, batches: undefined } : null, auth: report.auth, reportPath }));
  } catch (error) {
    report.complete = false;
    report.completedAt = new Date().toISOString();
    report.errorCode = error instanceof Error && error.message.startsWith("SDG_") ? error.message : "SDG_PORTAL_PROOF_FAILED";
    report.auth = session.stats;
    await save();
    console.error(JSON.stringify({ stage, errorCode: report.errorCode, reportPath }));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error && error.message.startsWith("SDG_") ? error.message : "SDG_PORTAL_PROOF_FAILED");
  process.exitCode = 1;
});
