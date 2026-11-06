import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { SPRITE } from '../src/ui/banana.js';
import { SPLASH_DEVICES, splashFile, splashSvg } from './splash.js';
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

// Launch screens: the smiling banana (sprite art plus its face), colours resolved for a standalone file.
const COLOURS = {
  '--peel': '#f6c935', '--shade': '#e3a41f', '--shine': '#fde68a', '--ridge': '#d99a1a', '--neck': '#a9a23a',
  '--stem-end': '#5b4220', '--flesh': '#fdf3c8', '--seeds': '#e2c372',
};
const body = SPRITE.match(/<g id="banana-art">([\s\S]*?)\n\s*<\/g>\s*<symbol/)[1];
const face = SPRITE.match(/<symbol id="banana-face"[^>]*>\s*<use href="#banana-art"\/>([\s\S]*?)<\/symbol>/)[1];
let art = (body + face).replace(/<g fill="var\(--spot\)">[\s\S]*?<\/g>/, '');
for (const [name, value] of Object.entries(COLOURS)) art = art.replaceAll(`var(${name})`, value);

await mkdir(`${root}public/splash`, { recursive: true });
for (const device of SPLASH_DEVICES) {
  for (const theme of ['light', 'dark']) {
    const file = splashFile(device, theme);
    await sharp(Buffer.from(splashSvg(device, theme, art))).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(`${root}public/${file}`);
    console.log(`public/${file}`);
  }
}
