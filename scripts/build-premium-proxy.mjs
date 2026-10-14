import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyReleasedVisualiserAssets } from './verify-released-visualiser-assets.mjs';

// Run before compilation: a sparse deploy must fail, not remove live assets.
console.log('Released Room Visualiser assets:', await verifyReleasedVisualiserAssets());

const destination = resolve('lib/storefront/hci/premium');
await mkdir(destination, { recursive: true });
await build({
  entryPoints: ['components/premium-proxy-entry.tsx'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  outdir: destination,
  entryNames: 'premium',
  loader: { '.module.css': 'local-css' },
  alias: { '@': resolve('.') },
  plugins: [{
    name: 'premium-proxy-existing-ui',
    setup(plugin) {
      plugin.onResolve({ filter: /^next\/link$/ }, () => ({ path: resolve('components/premium-proxy-link.tsx') }));
      plugin.onResolve({ filter: /^next\/image$/ }, () => ({ path: resolve('components/premium-proxy-image.tsx') }));
    },
  }],
});
await copyFile('public/reference-experience/living-room.jpg', resolve(destination, 'living-room.jpg'));
await import('./build-naila.mjs');
