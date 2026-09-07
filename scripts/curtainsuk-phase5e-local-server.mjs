import { loadEnvFile } from 'node:process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
loadEnvFile('.env.local');
loadEnvFile('.env.phase5e-preview');
if (process.env.SUPABASE_URL !== 'https://hqysjumypgeapgmqkcrx.supabase.co') throw new Error('STAGING_PROJECT_REQUIRED');
// Local test signing keys never replace deployed app secrets.
const secret = randomBytes(48).toString('hex');
writeFileSync('.env.phase5e-local', `PHASE5E_LOCAL_PROXY_SECRET=${secret}\n`, { mode: 0o600 });
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3205'], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, VERCEL_ENV: 'preview', CURTAINSUK_DEPLOYMENT_STAGE: 'STAGING',
    CURTAINSUK_SHOPIFY_APP_SECRET: secret, CURTAINSUK_STAGING_REVIEW_SIGNING_SECRET: secret,
    CURTAINSUK_EVIDENCE_ACCESS_SECRET: secret, CURTAINSUK_SHOPIFY_DRAFT_ORDER_MODE: 'DISABLED',
    CURTAINSUK_MALWARE_SCANNER_PROVIDER: 'UNCONFIGURED' },
});
child.on('exit', code => process.exit(code ?? 1));
