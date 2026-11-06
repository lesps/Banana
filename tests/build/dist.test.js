import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SPLASH_DEVICES } from '../../scripts/splash.js';

const dist = new URL('../../dist/', import.meta.url).pathname;
const base = process.env.BASE_PATH || '/';
const read = (f) => readFileSync(join(dist, f), 'utf8');
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

describe('dist/', () => {
  it('exists (run `npm run build` first)', () => expect(existsSync(join(dist, 'index.html'))).toBe(true));

  it('is small: under 1 MB in total, the food list included (launch screens aside)', () => {
    const bytes = walk(dist).filter((f) => !f.includes('/splash/')).reduce((n, f) => n + statSync(f).size, 0);
    expect(bytes).toBeLessThan(1024 * 1024);
  });

  it('keeps the food list out of the main bundle, in its own chunk', () => {
    const js = walk(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
    const main = js.find((f) => /index-[\w-]+\.js$/.test(f));
    expect(readFileSync(main, 'utf8')).not.toContain('Bagel, wheat');
    expect(js.filter((f) => readFileSync(f, 'utf8').includes('Bagel, wheat'))).toHaveLength(1);
  });

  it('bundles the running version and its release notes', () => {
    const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    const main = walk(join(dist, 'assets')).find((f) => /index-[\w-]+\.js$/.test(f));
    const js = readFileSync(main, 'utf8');
    expect(js).toMatch(new RegExp(`["'\`]${version.replaceAll('.', '\\.')}["'\`]`));
    expect(js).toContain(`## ${version} —`);
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

  it('only takes over early when asked (Restart now); never skips waiting on its own', () => {
    expect(sw).toMatch(/SKIP_WAITING/);
    expect(sw).not.toMatch(/self\.skipWaiting\(\)\s*[,;]\s*(\w+\.)?clientsClaim\(\)/);
    expect(sw.match(/skipWaiting\(\)/g)).toHaveLength(1);
  });

  it('precaches the food list chunk, so Look up works offline', () => {
    const chunk = walk(join(dist, 'assets')).find((f) => f.endsWith('.js') && readFileSync(f, 'utf8').includes('Bagel, wheat'));
    expect(sw).toContain(chunk.slice(dist.length));
  });
});

describe('iOS launch screens', () => {
  const html = read('index.html');
  const links = [...html.matchAll(/<link rel="apple-touch-startup-image"[^>]*>/g)].map(([tag]) => ({
    media: tag.match(/media="([^"]*)"/)[1],
    href: tag.match(/href="([^"]*)"/)[1],
  }));
  // Width and height straight from the PNG header.
  const pngSize = (file) => {
    const b = readFileSync(file);
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  };

  it('link a light and a dark image for every iPhone screen size', () => {
    expect(SPLASH_DEVICES.length).toBeGreaterThanOrEqual(15);
    expect(links).toHaveLength(SPLASH_DEVICES.length * 2);
    for (const { width, height, ratio } of SPLASH_DEVICES) {
      const media = `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;
      const light = links.find((l) => l.media === media);
      const dark = links.find((l) => l.media === `${media} and (prefers-color-scheme: dark)`);
      expect(light, media).toBeDefined();
      expect(dark, media).toBeDefined();
      for (const { href } of [light, dark]) {
        expect(href.startsWith(`${base}splash/`), href).toBe(true);
        expect(pngSize(join(dist, href.slice(base.length))), href).toEqual([width * ratio, height * ratio]);
      }
    }
  });

  it('cover the current line-up, iPhone 17, Air and 16e included', () => {
    const sizes = SPLASH_DEVICES.map((d) => `${d.width}x${d.height}@${d.ratio}`);
    expect(sizes).toEqual(expect.arrayContaining(['440x956@3', '402x874@3', '420x912@3', '390x844@3', '393x852@3', '430x932@3', '375x667@2']));
  });

  it('are left out of the offline download (iOS reads them only when the app is added)', () => {
    expect(read('sw.js')).not.toContain('splash/');
  });

  it('stay small', () => {
    const bytes = walk(join(dist, 'splash')).reduce((n, f) => n + statSync(f).size, 0);
    expect(bytes).toBeLessThan(1.5 * 1024 * 1024);
  });
});
