// Restore published CRLF bytes when a Linux Git checkout normalises legacy text assets.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';

const root = resolve('public');
const manifest = JSON.parse(await readFile('lib/room-visualiser/released-assets.json', 'utf8'));
const fabrics = JSON.parse(await readFile('lib/room-visualiser/assets.json', 'utf8'));
const expected = new Map();
for (const pack of manifest.packs) {
  for (const file of pack.files) expected.set(pack.assetBase + file.path, file.sha256);
}
for (const fabric of fabrics.fabrics) expected.set(fabric.image, fabric.sha256);

let restored = 0;
for (const [url, hash] of expected) {
  const path = resolve(root, '.' + url);
  if (!url.startsWith('/room-visualiser/') || !path.startsWith(root + sep)) continue;
  let data;
  try { data = await readFile(path); } catch { continue; }
  if (createHash('sha256').update(data).digest('hex') === hash) continue;
  const exactPublishedBytes = Buffer.from(data.toString('latin1').replace(/(?<!\r)\n/g, '\r\n'), 'latin1');
  if (createHash('sha256').update(exactPublishedBytes).digest('hex') !== hash) continue;
  await writeFile(path, exactPublishedBytes);
  restored++;
}
console.log('Released Room Visualiser line endings restored:', restored);
