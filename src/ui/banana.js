import { h } from './dom.js';

// One inline sprite holds every banana drawing. Colours come from CSS custom properties
// (--peel, --shade, --shine, --ridge, --neck, --stem, --stem-end, --spot, --flesh, --seeds),
// so the same art renders ripe, overripe, empty ("ghost") or one-colour.
export const SPRITE = `<svg id="banana-sprite" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <defs>
    <clipPath id="stem-half"><path d="M24.4 59.8 45.1 21.1V0H0v59.8Z"/></clipPath>
    <g id="banana-art">
    <path fill="var(--peel)" d="M15.8 17.2C10.2 31.6 14.6 47.8 30.6 54.4 40 58.3 50.4 56 57 48.8c1-1.1.4-2.6-1-2.6-9.4.6-19-2.6-25.4-9.8-5.2-5.8-9-12-9.8-19Z"/>
    <path fill="var(--shade)" d="M15.8 17.2C10.2 31.6 14.6 47.8 30.6 54.4 40 58.3 50.4 56 57 48.8c-8.2 4.6-18.8 4.4-26.8-.6-9.6-6-14.6-17.2-14.4-31Z"/>
    <path fill="none" stroke="var(--shine)" stroke-width="2.2" stroke-linecap="round" d="M22 21c.8 7.6 4.2 14 9.8 18.8 4.2 3.6 9.2 5.8 14.6 6.6"/>
    <path fill="none" stroke="var(--ridge)" stroke-width="1" stroke-linecap="round" d="M18.2 19.6c-1.4 11 2.8 21.8 11.8 27.8 5.8 3.8 12.6 5.2 19.4 4.2"/>
    <path fill="var(--neck)" d="M15.8 17.2c.6 2.6 4.6 2.6 5 .2Z"/>
    <path fill="var(--stem)" d="M16.6 18 16.1 10.2c-.1-1 .6-1.8 1.6-1.8h1.2c1 0 1.6.8 1.5 1.8l-.3 7.8Z"/>
    <path fill="var(--stem-end)" d="M15.6 9.6c0-.9.6-1.4 1.4-1.4h2.6c.9 0 1.5.5 1.4 1.4l-.1.5h-5.2Z"/>
    <path fill="var(--stem-end)" d="M57 48.8c1-1.1.4-2.6-1-2.6l-2.2.2c1 1 2 1.8 3.2 2.4Z"/>
    <g fill="var(--spot)">
    <ellipse cx="18.6" cy="30" rx="1.1" ry=".8" transform="rotate(70 18.6 30)"/>
    <ellipse cx="22" cy="41" rx="1.4" ry="1" transform="rotate(50 22 41)"/>
    <ellipse cx="31" cy="49.6" rx="1.2" ry=".9" transform="rotate(30 31 49.6)"/>
    <ellipse cx="42" cy="53" rx="1.5" ry="1" transform="rotate(10 42 53)"/>
    <ellipse cx="26.4" cy="37.8" rx=".8" ry=".6"/>
    <ellipse cx="49.6" cy="50.4" rx=".9" ry=".6"/>
    </g>
    </g>
    <symbol id="banana" viewBox="0 0 64 64"><use href="#banana-art"/></symbol>
    <symbol id="banana-half" viewBox="0 0 64 64">
    <g clip-path="url(#stem-half)"><use href="#banana-art"/></g>
    <ellipse cx="31.1" cy="47.7" rx="6.6" ry="2.3" transform="rotate(-62 31.1 47.7)" fill="var(--flesh)" stroke="var(--shade)" stroke-width=".9"/>
    <ellipse cx="31.1" cy="47.7" rx="2.2" ry=".75" transform="rotate(-62 31.1 47.7)" fill="var(--seeds)"/>
    </symbol>
    <symbol id="banana-face" viewBox="0 0 64 64">
    <use href="#banana-art"/>
    <g fill="#2b2418">
    <ellipse cx="20.6" cy="33.6" rx="1.5" ry="1.9" transform="rotate(-35 20.6 33.6)"/>
    <ellipse cx="27.6" cy="39.4" rx="1.5" ry="1.9" transform="rotate(-35 27.6 39.4)"/>
    </g>
    <g fill="#fff"><circle cx="21" cy="33" r=".5"/><circle cx="28" cy="38.8" r=".5"/></g>
    <path d="M20.4 40.6c1.6 2.6 4.4 3.6 6.8 3" fill="none" stroke="#2b2418" stroke-width="1.1" stroke-linecap="round"/>
    <g fill="#f08a6a" opacity=".55"><ellipse cx="17.8" cy="38.4" rx="1.8" ry="1.1" transform="rotate(55 17.8 38.4)"/><ellipse cx="30.8" cy="44.6" rx="1.8" ry="1.1" transform="rotate(20 30.8 44.6)"/></g>
    </symbol>
  </defs>
</svg>`;

// Outline of the whole banana including the stem, for masks and the background pattern.
export const SILHOUETTE = 'M15.8 17.2C10.2 31.6 14.6 47.8 30.6 54.4 40 58.3 50.4 56 57 48.8c1-1.1.4-2.6-1-2.6-9.4.6-19-2.6-25.4-9.8-5.2-5.8-9-12-9.8-19Z M16.6 18 16.1 10.2c-.1-1 .6-1.8 1.6-1.8h1.2c1 0 1.6.8 1.5 1.8l-.3 7.8Z M15.6 9.6c0-.9.6-1.4 1.4-1.4h2.6c.9 0 1.5.5 1.4 1.4l-.1.5h-5.2Z';

export function ensureSprite(doc = document) {
  if (doc.getElementById('banana-sprite')) return;
  const holder = doc.createElement('div');
  holder.innerHTML = SPRITE;
  doc.body.prepend(holder.firstElementChild);
}

const USES = {
  2: '<use href="#banana"/>',
  1: '<use class="ghost" href="#banana"/><use href="#banana-half"/>',
  0: '<use class="ghost" href="#banana"/>',
};

// fill: 0 empty, 1 half, 2 whole. pending: on the plate, not logged yet.
export function banana(fill, { over = false, pending = false, pop = false, i } = {}) {
  const el = h('span', { class: `b f${fill}${over ? ' over' : ''}${pending ? ' pending' : ''}${pop ? ' pop' : ''}`, style: pop ? `--i:${i}` : null });
  el.innerHTML = `<svg viewBox="0 0 64 64">${USES[fill]}</svg>`;
  return el;
}

export function bigBanana(cls = 'empty-banana') {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = '<svg viewBox="0 0 64 64"><use href="#banana-face"/></svg>';
  return el;
}
