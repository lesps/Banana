// iOS launch screens ("apple-touch-startup-image"): iOS shows plain white while a Home Screen web
// app starts unless there's an image for the exact screen. One per iPhone screen size (portrait),
// light and dark. Sizes in CSS points; images are width × ratio by height × ratio pixels.
// iOS reads these only when the app is added to the Home Screen.

export const SPLASH_DEVICES = [
  { width: 440, height: 956, ratio: 3, models: '17 Pro Max, 16 Pro Max' },
  { width: 420, height: 912, ratio: 3, models: 'Air' },
  { width: 402, height: 874, ratio: 3, models: '17, 17 Pro, 16 Pro' },
  { width: 430, height: 932, ratio: 3, models: '16 Plus, 15 Plus, 15 Pro Max, 14 Pro Max' },
  { width: 393, height: 852, ratio: 3, models: '16, 15, 15 Pro, 14 Pro' },
  { width: 428, height: 926, ratio: 3, models: '14 Plus, 13 Pro Max, 12 Pro Max' },
  { width: 390, height: 844, ratio: 3, models: '17e, 16e, 14, 13, 13 Pro, 12, 12 Pro' },
  { width: 375, height: 812, ratio: 3, models: '13 mini, 12 mini, 11 Pro, XS, X' },
  { width: 414, height: 896, ratio: 3, models: '11 Pro Max, XS Max' },
  { width: 414, height: 896, ratio: 2, models: '11, XR' },
  { width: 414, height: 736, ratio: 3, models: '8 Plus, 7 Plus, 6s Plus' },
  { width: 375, height: 667, ratio: 2, models: 'SE (2nd/3rd gen), 8, 7, 6s' },
  { width: 320, height: 568, ratio: 2, models: 'SE (1st gen)' },
  { width: 669, height: 951, ratio: 3, models: 'Duo (inner screen)' },
  { width: 466, height: 678, ratio: 3, models: 'Duo (outer screen)' },
];

export const THEMES = {
  light: { background: '#fbf6e9', stem: '#86682c', shadow: 'rgb(60 40 10 / 0.10)' },
  dark: { background: '#1c1a15', stem: '#9a7640', shadow: 'rgb(0 0 0 / 0.35)' },
};

export const splashFile = ({ width, height, ratio }, theme) => `splash/${width}x${height}-${ratio}x-${theme}.png`;

const media = ({ width, height, ratio }, theme) =>
  `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`
  + (theme === 'dark' ? ' and (prefers-color-scheme: dark)' : '');

// Tags for Vite's transformIndexHtml; light first, dark (more specific) after.
export function splashLinks(base) {
  return ['light', 'dark'].flatMap((theme) => SPLASH_DEVICES.map((d) => ({
    tag: 'link',
    attrs: { rel: 'apple-touch-startup-image', media: media(d, theme), href: `${base}${splashFile(d, theme)}` },
    injectTo: 'head',
  })));
}

// The launch screen: the smiling banana from the app's sprite, centred a little above the middle,
// on the app's background. `art` is the banana's SVG markup in its 64-unit box, colours resolved.
export function splashSvg({ width, height, ratio }, theme, art) {
  const W = width * ratio;
  const H = height * ratio;
  const t = THEMES[theme];
  const k = (Math.min(W, H) * 0.34) / 48; // the banana is ~48 units wide
  const cx = W / 2;
  const cy = H * 0.46;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="${t.background}"/>`
    + `<ellipse cx="${cx}" cy="${cy + 26 * k}" rx="${21 * k}" ry="${3.2 * k}" fill="${t.shadow}"/>`
    + `<g transform="translate(${cx - 34 * k} ${cy - 32.5 * k}) scale(${k})">${art.replaceAll('var(--stem)', t.stem)}</g>`
    + '</svg>';
}
