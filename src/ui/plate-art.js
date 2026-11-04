import { h } from './dom.js';
import { platePieces } from '../lib/plate.js';

// Where bananas land on the plate (viewBox 160×100), in the order they're added: centre first, then
// outwards and back. Drawn back to front, so later ones in the front row overlap earlier ones behind.
export const SLOTS = [
  [80, 54, -8], [60, 50, 6], [100, 52, -14], [70, 62, 12], [92, 63, -4], [48, 58, -18], [112, 58, 10],
  [80, 44, 4], [56, 42, -10], [104, 42, 14], [40, 48, 8], [120, 47, -12], [66, 68, -6], [96, 70, 8],
];
const SIZE = 44;

// dropFrom: index of the first plate item added since the last render, whose bananas drop in.
export function plateArt(plate, dropFrom) {
  const pieces = platePieces(plate);
  const shown = pieces.slice(0, SLOTS.length);
  let d = 0;
  const drawn = shown
    .map((p, i) => ({ ...p, slot: SLOTS[i], drop: dropFrom != null && p.item >= dropFrom }))
    .map((p) => ({ ...p, d: p.drop ? d++ : 0 }))
    .sort((a, b) => a.slot[1] - b.slot[1]);
  // Numbers only: no user text goes into this markup.
  const markup = drawn.map(({ kind, slot: [x, y, r], drop, d: delay }) =>
    `<g class="piece${drop ? ' drop' : ''}" style="--d:${delay}" transform="translate(${x} ${y}) rotate(${r})">`
    + `<use href="#${kind === 'half' ? 'banana-half' : 'banana'}" x="${-SIZE / 2}" y="${-SIZE / 2}" width="${SIZE}" height="${SIZE}"/></g>`).join('');
  const el = h('span', { class: 'plate-art', 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="0 0 160 100">`
    + '<ellipse class="plate-shadow" cx="80" cy="63" rx="74" ry="30"/>'
    + '<ellipse class="plate-rim" cx="80" cy="56" rx="74" ry="32"/>'
    + '<ellipse class="plate-well" cx="80" cy="58" rx="52" ry="21"/>'
    + `${markup}</svg>`;
  if (pieces.length > shown.length) el.append(h('span', { class: 'plate-more' }, `+${pieces.length - shown.length}`));
  return el;
}
