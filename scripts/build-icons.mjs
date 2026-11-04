import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const svg = await readFile(`${root}assets/icon.svg`, 'utf8');
// Maskable icons need a full-bleed background and the glyph inside the 80% safe zone.
const maskable = svg
  .replace(/(<rect id="bg"[^>]*?) rx="\d+"/, '$1')
  .replace('translate(38 48) scale(6.4)', 'translate(79 87) scale(5.2)');

const out = [
  ['icon-192.png', svg, 192],
  ['icon-512.png', svg, 512],
  ['icon-maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', maskable, 180],
];
for (const [name, src, size] of out) {
  await sharp(Buffer.from(src), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(`${root}public/${name}`);
  console.log(`public/${name}`);
}
await writeFile(`${root}public/favicon.svg`, svg);
console.log('public/favicon.svg');
