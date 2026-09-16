/** Import-only guard for Webtex's asynchronously populated product panel. */
export interface WebtexProductRead {
  sku: string; description: string; fullWidth: string; standardPrice: string;
  freeStock: string; rawFields: string; imageSrc: string | null;
}
export interface WebtexExpectedProduct { sku: string; description: string }
export function inspectWebtexProduct(read: WebtexProductRead, expected: WebtexExpectedProduct) {
  const tidy = (value: string) => value.replace(/\s+/g,' ').trim();
  if ((tidy(read.sku) && tidy(read.sku) !== expected.sku) ||
      (tidy(read.description) && tidy(read.description) !== tidy(expected.description))) {
    throw new Error('WEBTEX_IDENTITY_MISMATCH');
  }
  const width = tidy(read.fullWidth), price = tidy(read.standardPrice), stock = tidy(read.freeStock);
  return tidy(read.sku) === expected.sku && Boolean(tidy(read.description)) &&
    /^\d+(?:\.\d+)? cm$/.test(width) && Number.parseFloat(width) > 0 &&
    /^\d+(?:\.\d+)? STERLING$/.test(price) && Number.parseFloat(price) > 0 &&
    /^\d+(?:\.\d+)? Metres$/.test(stock);
}

/** No fixed sleeps: the authorised browser driver waits on populated DOM fields.
 * Each attempt has one shared 12s deadline. Reopen at most twice; retain an
 * incomplete read as an exception, never as supplier commercial evidence. */
export async function captureReadyWebtexProduct(expected: WebtexExpectedProduct, driver: {
  waitForFields(timeoutMs: number): Promise<void>;
  read(): Promise<WebtexProductRead>;
  reopen(): Promise<void>;
}) {
  let last: WebtexProductRead | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await driver.reopen();
    try { await driver.waitForFields(12_000); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== 'WEBTEX_FIELDS_TIMEOUT') throw error;
    }
    last = await driver.read();
    if (inspectWebtexProduct(last,expected)) return {status:'READY' as const,read:last,attempts:attempt};
  }
  return {status:'EXCEPTION' as const,reason:'COMMERCIAL_FIELDS_INCOMPLETE' as const,attempts:3,last};
}
