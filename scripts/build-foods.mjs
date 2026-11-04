// Usage: npm run foods -- path/to/surveyDownload.json [out]
// Input: the FNDDS JSON from https://fdc.nal.usda.gov/download-datasets (Survey Foods, JSON).
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { buildFoods } from '../src/lib/foods-build.js';

const [src, out = fileURLToPath(new URL('../src/data/foods.json', import.meta.url))] = process.argv.slice(2);
if (!src) {
  console.error('Usage: npm run foods -- path/to/surveyDownload.json [out]');
  process.exit(1);
}
const { source, foods, skipped } = buildFoods(JSON.parse(await readFile(src, 'utf8')));
const text = JSON.stringify({ source, foods });
await writeFile(out, `${text}\n`);
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`${foods.length} foods, ${foods.reduce((n, f) => n + f[2].length, 0)} portions → ${out}`);
console.log(`skipped: ${JSON.stringify(skipped)}`);
console.log(`size: ${kb(Buffer.byteLength(text))} raw, ${kb(gzipSync(text).length)} gzipped`);
