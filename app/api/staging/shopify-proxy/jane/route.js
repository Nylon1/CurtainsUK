import { createShopifyJaneGateway, janePreviewEnabled } from '@/lib/advisory/shopify-gateway';
import { createPgTransaction } from '@/lib/advisory/pg-transaction.mjs';
import { createPrivateAdvisoryRpc, createPrivateAdvisoryKnowledgeSearch } from '@/lib/advisory/private-rpc.mjs';
import { createSessionCipher } from '@/lib/advisory/session-cipher.mjs';
import { CloudSessionStore } from '@/lib/advisory/cloud-store.mjs';
import { createConsultationService } from '@/lib/advisory/service.mjs';
import { createCatalogue } from '@/lib/advisory/catalogue.mjs';
import { createMockProvider } from '@/lib/advisory/mock-provider.mjs';
import { createOpenAIProvider } from '@/lib/advisory/openai-provider.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const ref = 'hqysjumypgeapgmqkcrx';
// A manually packaged Build Output API preview embeds its reviewed Git SHA.
// Git-linked previews use Vercel's own commit SHA instead.
const compiledCommit = typeof __JANE_PREVIEW_SOURCE_COMMIT__ === 'undefined'
  ? process.env.VERCEL_GIT_COMMIT_SHA : __JANE_PREVIEW_SOURCE_COMMIT__;
let resources;
function decode(value) {
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw Error('JANE_KEY_REQUIRED');
  return Buffer.from(value, 'base64');
}
function buildResources() {
  const env = process.env;
  if (!janePreviewEnabled(env, compiledCommit) || env.ADVISORY_TEST_PROJECT_REF !== ref || env.ADVISORY_TEST_SCHEMA !== 'advisory'
    || env.ADVISORY_CATALOGUE_PROJECT_REF !== ref || !/^sb_secret_[A-Za-z0-9_-]{8,200}$/.test(env.ADVISORY_CATALOGUE_READ_KEY ?? '')) throw Error('JANE_PREVIEW_NOT_CONFIGURED');
  const keys = JSON.parse(env.ADVISORY_DATA_KEYS_JSON ?? '{}');
  if (!keys || typeof keys !== 'object' || Array.isArray(keys) || !env.ADVISORY_ACTIVE_DATA_KEY_ID) throw Error('JANE_KEY_REQUIRED');
  const cipher = createSessionCipher({ activeKeyId: env.ADVISORY_ACTIVE_DATA_KEY_ID, keys: Object.fromEntries(Object.entries(keys).map(([id, value]) => [id, decode(value)])) });
  const database = createPgTransaction({ env });
  const rpc = createPrivateAdvisoryRpc({ ...database, projectRef: ref });
  const searchIndex = createPrivateAdvisoryKnowledgeSearch({ ...database, projectRef: ref });
  const catalogue = createCatalogue({ url: `https://${ref}.supabase.co`, key: env.ADVISORY_CATALOGUE_READ_KEY, searchIndex });
  const model = env.ADVISORY_SHOPIFY_PROVIDER === 'openai';
  if (model && (!env.ADVISORY_SHOPIFY_PAID_APPROVAL_REFERENCE || !env.ADVISORY_OPENAI_API_KEY?.startsWith('sk-')
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(env.ADVISORY_SHOPIFY_EVALUATION_RUN_ID ?? ''))) throw Error('JANE_MODEL_NOT_APPROVED');
  if (!model && env.ADVISORY_SHOPIFY_PROVIDER !== 'mock') throw Error('JANE_PROVIDER_REQUIRED');
  return { rpc, cipher, catalogue, model, env };
}
async function handle(request) {
  // This static route never enters the shared commerce/Naila proxy operation.
  if (!janePreviewEnabled(process.env, compiledCommit)) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  try {
    resources ??= buildResources();
    const { rpc, cipher, catalogue, model, env } = resources;
    return createShopifyJaneGateway({
      env,
      compiledCommit,
      take: owner => new CloudSessionStore({ rpc, cipher, ownerId: owner }).take(),
      execute: async (owner, command) => {
        const store = new CloudSessionStore({ rpc, cipher, ownerId: owner });
        const provider = model
          ? { kind: 'openai', respond: async args => createOpenAIProvider({ apiKey: env.ADVISORY_OPENAI_API_KEY, allowPaidTest: true, budget: store.budget(env.ADVISORY_SHOPIFY_EVALUATION_RUN_ID, args.session.id) }).respond(args) }
          : createMockProvider();
        return createConsultationService({ store, provider, catalogue }).execute(owner, command);
      },
    })(request);
  } catch {
    return Response.json({ error: 'JANE_TEMPORARILY_UNAVAILABLE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export { handle as GET, handle as POST };
