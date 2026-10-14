import { createHash, randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import type { CushionDesign, CushionSpec } from "./domain";
import type { ShopifyDraftOrderExecutionContract } from "../storefront/shopify-draft-order-core";

export interface SavedCushionDesign {
  design: CushionDesign;
  revision: number;
  updatedAt: string;
}

/** Separate from editable scene state and from the curtain manufacturing snapshot. */
export interface CushionOrderSnapshot {
  version: 1;
  productType: "CUSHION";
  id: string;
  designId: string;
  createdAt: string;
  spec: CushionSpec;
  specSha256: string;
  fabricIdentity: { id: string; brand: string; design: string; colour: string };
  rulesVersion: string;
  price: { currency: "GBP"; goodsGrossMinor: number; goodsVatMinor: number };
  manufacturing: Record<string, unknown>;
  /** Private commercial evidence, excluded from the workroom/customer packet. */
  commercial?: Record<string, unknown>;
  revalidatedAt: string;
}

export function specDigest(spec: CushionSpec) {
  // Canonicalise recursively: client object key order is not manufacturing identity.
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, child]) => [key, canonical(child)]),
          )
        : value;
  return createHash("sha256")
    .update(JSON.stringify(canonical(spec)))
    .digest("hex");
}

function checkedId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(id)) throw new Error("CUSHION_ID_INVALID");
  return id;
}

async function createImmutableJson(target: string, value: unknown) {
  const temporary = `${target}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(JSON.stringify(value));
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, target);
  } finally {
    await unlink(temporary);
  }
}

/** Local preview persistence only. Hosted activation needs the reviewed SQL repository. */
export function createLocalCushionRepository(directory: string) {
  const root = path.resolve(directory);
  async function withLock<T>(key: string, work: () => Promise<T>): Promise<T> {
    await mkdir(root, { recursive: true });
    const lockPath = path.join(root, `${checkedId(key)}.lock`);
    let lock;
    try {
      lock = await open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new Error("CUSHION_SAVE_BUSY");
      throw error;
    }
    try {
      return await work();
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
  async function load(id: string): Promise<SavedCushionDesign | null> {
    try {
      return JSON.parse(
        await readFile(path.join(root, `design-${checkedId(id)}.json`), "utf8"),
      ) as SavedCushionDesign;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  return {
    load,
    async list() {
      await mkdir(root, { recursive: true });
      const files = (await readdir(root)).filter((file) =>
        /^design-[a-zA-Z0-9_-]+\.json$/.test(file),
      );
      const rows = await Promise.all(
        files.map((file) => load(file.slice(7, -5))),
      );
      return rows
        .filter((row): row is SavedCushionDesign => row !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async save(
      design: CushionDesign,
      expectedRevision: number,
    ): Promise<SavedCushionDesign> {
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
        throw new Error("CUSHION_REVISION_REQUIRED");
      return withLock(`design-${checkedId(design.id)}`, async () => {
        const current = await load(design.id);
        if ((current?.revision ?? 0) !== expectedRevision)
          throw new Error("CUSHION_REVISION_CONFLICT");
        const result = {
          design: structuredClone(design),
          revision: expectedRevision + 1,
          updatedAt: new Date().toISOString(),
        };
        const target = path.join(root, `design-${design.id}.json`);
        const temporary = `${target}.${randomUUID()}.tmp`;
        const handle = await open(temporary, "wx");
        try {
          await handle.writeFile(JSON.stringify(result));
          await handle.sync();
        } finally {
          await handle.close();
        }
        await rename(temporary, target);
        return result;
      });
    },
    async appendSnapshot(snapshot: CushionOrderSnapshot) {
      if (
        snapshot.version !== 1 ||
        snapshot.productType !== "CUSHION" ||
        snapshot.specSha256 !== specDigest(snapshot.spec)
      )
        throw new Error("CUSHION_SNAPSHOT_INVALID");
      await mkdir(root, { recursive: true });
      const target = path.join(root, `snapshot-${checkedId(snapshot.id)}.json`);
      // Atomic link publishes a fully synced file, with exclusive target identity.
      await createImmutableJson(target, snapshot);
      return structuredClone(snapshot);
    },
    async appendCheckout(input: {
      key: string;
      snapshots: CushionOrderSnapshot[];
      contract: ShopifyDraftOrderExecutionContract;
    }) {
      if (
        !input.snapshots.length ||
        input.snapshots.some(
          (snapshot) =>
            snapshot.productType !== "CUSHION" ||
            snapshot.specSha256 !== specDigest(snapshot.spec),
        )
      )
        throw new Error("CUSHION_SNAPSHOT_INVALID");
      await mkdir(root, { recursive: true });
      // All immutable snapshots and their shared-price contract are one durable
      // unit. Duplicate claims cannot create a second group or draft order.
      await createImmutableJson(
        path.join(root, `checkout-${checkedId(input.key)}.json`),
        input,
      );
    },
    async checkout(key: string): Promise<{
      snapshots: CushionOrderSnapshot[];
      contract: ShopifyDraftOrderExecutionContract;
    } | null> {
      try {
        return JSON.parse(
          await readFile(
            path.join(root, `checkout-${checkedId(key)}.json`),
            "utf8",
          ),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async snapshot(id: string): Promise<CushionOrderSnapshot | null> {
      checkedId(id);
      await mkdir(root, { recursive: true });
      for (const file of (await readdir(root)).filter((file) =>
        /^checkout-[A-Za-z0-9_-]+\.json$/.test(file),
      )) {
        const group = JSON.parse(
          await readFile(path.join(root, file), "utf8"),
        ) as { snapshots: CushionOrderSnapshot[] };
        const snapshot = group.snapshots.find((snapshot) => snapshot.id === id);
        if (snapshot) return snapshot;
      }
      try {
        return JSON.parse(
          await readFile(path.join(root, `snapshot-${id}.json`), "utf8"),
        ) as CushionOrderSnapshot;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async recordPaidManifest(
      orderId: string,
      manifest: Record<string, unknown>,
    ) {
      const key = checkedId(orderId.replace("gid://shopify/Order/", ""));
      return withLock(`paid-${key}`, async () => {
        const target = path.join(root, `paid-${key}.json`);
        try {
          const existing = JSON.parse(await readFile(target, "utf8"));
          if (JSON.stringify(existing) !== JSON.stringify(manifest))
            throw new Error("CUSHION_PAID_IDENTITY_CONFLICT");
          return { duplicate: true };
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        await createImmutableJson(target, manifest);
        return { duplicate: false };
      });
    },
  };
}
