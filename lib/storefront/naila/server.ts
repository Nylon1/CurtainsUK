import 'server-only';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createSupplierServiceClient } from '../../supabase/supplier-service';
import { projectConsultationState } from './memory';
import type { NailaView } from './types';
import { assertNailaRehearsalOwner } from './rehearsal-access';

export const nailaEnabled = () => process.env.CURTAINSUK_NAILA_ENABLED === 'true';

/** Rebuild the compact cache from authoritative committed state on every resume.
 * A memory failure must never turn a successful HCI write into an apparent failure. */
export async function attachNailaMemory<T>(owner: string, result: T): Promise<T> {
  const view = result as unknown as NailaView;
  assertNailaRehearsalOwner(owner, view.sessionId);
  try {
    const { data, error } = await createSupplierServiceClient().rpc('hci_staging_read', {
      p_owner: owner, p_session: view.sessionId, p_request: randomUUID(),
    });
    if (error || !data || data.revision !== view.revision) return result;
    const envelope = data.private_state;
    const encoded = envelope?.hciStateCompressed;
    if (encoded !== undefined && (typeof encoded !== 'string' || encoded.length > 1_500_000)) return result;
    const committed = encoded === undefined ? envelope : JSON.parse(gunzipSync(Buffer.from(encoded, 'base64'), { maxOutputLength: 4_000_000 }).toString('utf8'));
    return { ...result, naila: projectConsultationState(committed, view, envelope?.commerceEvents) };
  } catch { return result; }
}
