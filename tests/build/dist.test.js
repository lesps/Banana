import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../../dist/', import.meta.url).pathname;
const base = process.env.BASE_PATH || '/';
const read = (f) => readFileSync(join(dist, f), 'utf8');
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

describe('dist/', () => {
  it('exists (run `npm run build` first)', () => expect(existsSync(join(dist, 'index.html'))).toBe(true));

  it('is small: under 300 KB in total', () => {
    const bytes = walk(dist).reduce((n, f) => n + statSync(f).size, 0);
    expect(bytes).toBeLessThan(300 * 1024);
  });

  it('ships the icons', () => {
    for (const f of ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
      expect(existsSync(join(dist, f)), f).toBe(true);
    }
  });

  it('prefixes asset URLs in index.html with BASE_PATH', () => {
    const html = read('index.html');
    expect(html).toContain(`href="${base}favicon.svg"`);
    expect(html).toMatch(new RegExp(`src="${base}assets/index-[\\w-]+\\.js"`));
  });
});

describe('manifest', () => {
  const m = JSON.parse(read('manifest.webmanifest'));

  it('has the required fields', () => {
    expect(m).toMatchObject({ name: 'Banana', short_name: 'Banana', display: 'standalone' });
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('scopes start_url and scope to BASE_PATH', () => {
    expect(m.start_url).toBe(base);
    expect(m.scope).toBe(base);
  });
});

describe('service worker', () => {
  const sw = read('sw.js');

  it('precaches the app shell, scripts, styles and fonts', () => {
    expect(sw).toContain('index.html');
    expect(sw).toMatch(/assets\/index-[\w-]+\.js/);
    expect(sw).toMatch(/assets\/index-[\w-]+\.css/);
    expect(sw).toMatch(/\.woff2/);
  });
});
