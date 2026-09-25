export const preparedScopeReadChunkSize = 100;
export const maxDesignWorkerConcurrency = 3;

/** Split a reconciled explicit cohort without omitting or reordering any identity. */
export function chunkPreparedScopeIds(ids: readonly string[], size = preparedScopeReadChunkSize) {
  if (!Number.isInteger(size) || size < 1 || size > preparedScopeReadChunkSize) throw new Error("VISUAL_PREPARED_READ_CHUNK_INVALID");
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) chunks.push([...ids.slice(index, index + size)]);
  return chunks;
}

/** Default remains sequential; concurrent analysis is an explicit bounded opt-in. */
export function parseDesignWorkerConcurrency(value: string | undefined) {
  if (value === undefined) return 1;
  if (!/^\d+$/.test(value)) throw new Error("VISUAL_DESIGN_CONCURRENCY_INVALID");
  const concurrency = Number(value);
  if (concurrency < 1 || concurrency > maxDesignWorkerConcurrency) throw new Error("VISUAL_DESIGN_CONCURRENCY_INVALID");
  return concurrency;
}

type Prepared<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Analyze a bounded group concurrently, then surface results in input order.
 * Throwing from onPrepared stops before any later group starts. Callers that write
 * results must use createSerialWorkQueue for their database persistence.
 */
export async function runPreparedDesignBatches<T, R>(
  items: readonly T[],
  concurrency: number,
  analyze: (item: T, index: number) => Promise<R>,
  persist: (prepared: Prepared<R>, item: T, index: number) => Promise<void>,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > maxDesignWorkerConcurrency) throw new Error("VISUAL_DESIGN_CONCURRENCY_INVALID");
  for (let start = 0; start < items.length; start += concurrency) {
    const group = items.slice(start, start + concurrency);
    const prepared = await Promise.all(group.map(async (item, offset): Promise<Prepared<R>> => {
      try { return { ok: true, value: await analyze(item, start + offset) }; }
      catch (error) { return { ok: false, error }; }
    }));
    for (let offset = 0; offset < group.length; offset += 1) await persist(prepared[offset], group[offset], start + offset);
  }
}

export type SerialWorkQueue = <T>(operation: () => PromiseLike<T>) => Promise<T>;

/** Serialize database work without blocking independent remote analysis. */
export function createSerialWorkQueue(timing: { onQueueWait?: (milliseconds: number) => void; onWrite?: (milliseconds: number) => void } = {}): SerialWorkQueue {
  let tail: Promise<void> = Promise.resolve();
  return async <T>(operation: () => PromiseLike<T>) => {
    const queuedAt = performance.now();
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    timing.onQueueWait?.(performance.now() - queuedAt);
    const startedAt = performance.now();
    try { return await operation(); }
    finally { timing.onWrite?.(performance.now() - startedAt); release(); }
  };
}
