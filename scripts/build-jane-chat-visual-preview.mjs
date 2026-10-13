// Packages the exact private Shopify chat assets as a synthetic, protected
// Vercel Preview. It does not connect to Shopify, Supabase or OpenAI.
import { build } from 'esbuild';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw Error('SOURCE_COMMIT_REQUIRED');
const directory = join(homedir(), '.codex', 'tmp', `jane-chat-visual-${randomUUID()}`);
const root = join(directory, '.vercel');
const output = join(root, 'output');
const staticRoot = join(output, 'static');
const assetRoot = join(staticRoot, 'shopify-theme', 'curtainsuk-dawn-16', 'assets');
const functionRoot = join(output, 'functions', 'api', 'staging', 'shopify-proxy', 'jane.func');
await mkdir(assetRoot, { recursive: true });
await mkdir(functionRoot, { recursive: true });
await writeFile(join(root, 'project.json'), JSON.stringify({
  projectId: 'prj_vl2GLLlSf0AJAKqjs1Nk26ipKHBA',
  orgId: 'team_U8WXxsKS9LT2DmEllVkOpihz',
  projectName: 'curtainsuk-staging-api',
}));
const fixture = 'artifacts/jane-shopify-chat-20261013/private-theme-fixture.html';
await copyFile(fixture, join(staticRoot, 'index.html'));
for (const asset of ['curtainsuk-advisory-room.css', 'curtainsuk-jane-chat.js', 'curtainsuk-adviser-jane.webp']) {
  await copyFile(join('shopify-theme', 'curtainsuk-dawn-16', 'assets', asset), join(assetRoot, asset));
}
const adapter = `import { Readable } from 'node:stream';
import { GET, POST } from './app/api/staging/shopify-proxy/jane/route.js';
export default async function handler(req, res) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
    const request = new Request('https://' + process.env.VERCEL_URL + req.url, {
      method: req.method, headers,
      ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
    });
    const response = await (req.method === 'GET' ? GET(request) : POST(request));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    for await (const chunk of response.body ?? []) res.write(chunk);
    res.end();
  } catch {
    res.writeHead(503, { 'Cache-Control': 'no-store' });
    res.end('{"error":"JANE_TEMPORARILY_UNAVAILABLE"}');
  }
}`;
const result = await build({
  stdin: { contents: adapter, resolveDir: process.cwd(), sourcefile: 'jane-chat-preview-adapter.mjs' },
  bundle: true, platform: 'node', target: 'node24', format: 'cjs',
  outfile: join(functionRoot, 'index.cjs'), external: ['pg-native'], logLevel: 'silent',
});
if (result.warnings.length) throw Error('BUNDLE_WARNINGS');
await writeFile(join(functionRoot, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs24.x', handler: 'index.cjs', launcherType: 'Nodejs',
  shouldAddHelpers: false, maxDuration: 120, regions: ['fra1'],
}));
await writeFile(join(output, 'config.json'), JSON.stringify({
  version: 3,
  routes: [{ src: '/api/staging/shopify-proxy/jane', dest: '/api/staging/shopify-proxy/jane' }, { handle: 'filesystem' }],
}));
const digest = createHash('sha256').update(await readFile(join(functionRoot, 'index.cjs'))).digest('hex');
console.log(JSON.stringify({ directory, sourceCommit, bundleSha256: digest, classification: 'PROTECTED_SYNTHETIC_VISUAL_PREVIEW' }));
