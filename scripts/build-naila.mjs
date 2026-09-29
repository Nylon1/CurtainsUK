import { build } from 'esbuild';
import { resolve } from 'node:path';
await build({entryPoints:['components/naila-browse-entry.ts'],bundle:true,format:'iife',platform:'browser',target:['es2020'],minify:true,sourcemap:false,alias:{'@':resolve('.')},outfile:'shopify-theme/curtainsuk-dawn-16/assets/curtainsuk-naila.js'});
