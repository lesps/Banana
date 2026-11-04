import { h, openDialog, closeDialog } from './dom.js';
import { bigBanana } from './banana.js';

function release(r, withHeading) {
  return h('section', {},
    withHeading && h('h3', {}, r.version),
    r.intro && h('p', { class: 'intro' }, r.intro),
    h('ul', {}, r.items.map((item) => h('li', {}, item))));
}

// releases: shown open, newest first (a heading per release when there's more than one);
// earlier: the rest of the history, folded away under "Earlier updates".
export function showWhatsNew({ title, releases, earlier = [] }) {
  document.querySelector('dialog.whats-new')?.remove();
  const dlg = h('dialog', { class: 'whats-new', 'aria-labelledby': 'whats-new-title' },
    // Pinned to the top corner while scrolling, so a long note closes in one tap.
    h('div', { class: 'whats-new-top' },
      h('button', { type: 'button', class: 'whats-new-close', 'aria-label': 'Close', onclick: () => closeDialog(dlg) }, '✕')),
    bigBanana('whats-new-banana'),
    // Focus the heading so a long note opens at the top, not scrolled down to "Got it".
    h('h2', { id: 'whats-new-title', tabindex: '-1', autofocus: true }, title),
    h('div', { class: 'notes' }, releases.map((r) => release(r, releases.length > 1))),
    earlier.length > 0 && h('details', { class: 'earlier' },
      h('summary', {}, 'Earlier updates'),
      earlier.map((r) => release(r, true))),
    h('form', { method: 'dialog' }, h('button', { type: 'submit', class: 'btn primary' }, 'Got it')));
  dlg.querySelector('form').addEventListener('submit', () => dlg.remove());
  openDialog(dlg);
  dlg.scrollTop = 0;
  return dlg;
}
