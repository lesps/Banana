import { h } from './dom.js';
import { banana, bigBanana } from './banana.js';
import { formatDay, formatTime, dayOf } from '../lib/day.js';
import { formatHalves, bananaRow, bananaWord, QUICK_HALVES } from '../lib/units.js';
import { entriesForDay, recentLabels } from '../lib/log.js';

export const emptyState = (text) => h('div', { class: 'empty' }, bigBanana(), h('p', {}, text));

export function statusText(total, target) {
  const diff = target - total;
  const where = diff > 0 ? `${formatHalves(diff)} left` : diff === 0 ? 'right on target' : `${formatHalves(-diff)} over`;
  return `of ${formatHalves(target)} · ${where}`;
}

export function renderToday({ state, today, day, draft, setDraft, pop, actions }) {
  const { targetHalves: target, rolloverHour } = state.settings;
  const entries = entriesForDay(state.entries, day);
  const total = entries.reduce((n, e) => n + e.halves, 0);
  const row = bananaRow(total, target);
  // Icons whose fill went up since just before the last log pop in, staggered by --i.
  const before = pop?.day === day ? pop.from : null;
  let popped = 0;
  const icon = (i, { fill, over }) => {
    const grew = before != null && fill > Math.max(0, Math.min(2, before - 2 * i));
    return banana(fill, { over, pop: grew, i: grew ? popped++ : undefined });
  };
  const recents = recentLabels(state.entries);
  const suggestions = recentLabels(state.entries, 50);

  return [
    h('header', { class: 'daynav' },
      h('button', { type: 'button', class: 'prev icon-btn', 'aria-label': 'Previous day', 'data-focus': 'prev', onclick: () => actions.stepDay(-1) }, '‹'),
      h('h1', {}, formatDay(day, today)),
      h('button', { type: 'button', class: 'next icon-btn', 'aria-label': 'Next day', 'data-focus': 'next', disabled: day >= today, onclick: () => actions.stepDay(1) }, '›')),

    h('section', { class: 'total', 'aria-live': 'polite' },
      h('div', { class: `big${before != null ? ' bump' : ''}` }, formatHalves(total)),
      h('div', { class: 'unit' }, bananaWord(total)),
      row.icons.length > 0 && h('div', { class: 'row', 'aria-hidden': 'true' },
        row.icons.map((ic, i) => icon(i, ic)),
        row.more > 0 && h('span', { class: 'more' }, `+${row.more}`)),
      target != null && h('p', { class: 'status' }, statusText(total, target))),

    h('form', { class: 'logger', onsubmit: (e) => { e.preventDefault(); e.target.querySelector('input')?.blur(); } },
      h('label', { class: 'sr-only', for: 'label' }, 'What was it? (optional)'),
      h('input', {
        id: 'label', 'data-focus': 'label', type: 'text', value: draft, maxlength: 200, list: 'label-suggestions',
        placeholder: 'What was it? (optional)', autocomplete: 'off', enterkeyhint: 'done',
        oninput: (e) => setDraft(e.target.value),
      }),
      h('datalist', { id: 'label-suggestions' }, suggestions.map((s) => h('option', { value: s.label }))),
      h('div', { class: 'quick', role: 'group', 'aria-label': 'Log an amount' },
        QUICK_HALVES.map((q) => h('button', {
          type: 'button', 'aria-label': `Log ${formatHalves(q)} ${bananaWord(q)}`, onclick: () => actions.log(q),
        }, formatHalves(q), h('span', { class: 'mini', 'aria-hidden': 'true' },
          bananaRow(q, null).icons.map(({ fill }) => banana(fill))))))),

    recents.length > 0 && h('div', { class: 'recents', role: 'group', 'aria-label': 'Log again' },
      recents.map((r) => h('button', { type: 'button', class: 'chip', onclick: () => actions.log(r.halves, r.label) },
        `${r.label} · ${formatHalves(r.halves)}`))),

    entries.length
      ? h('ol', { class: 'entries' }, entries.map((e) => h('li', {},
        h('button', { type: 'button', class: 'entry', onclick: () => actions.edit(e.id) },
          // The time only means something when the entry was logged on its own day.
          h('span', { class: 'time' }, dayOf(e.ts, rolloverHour) === e.day ? formatTime(e.ts) : ''),
          h('span', { class: 'label' }, e.label || 'Food'),
          h('span', { class: 'amount' }, formatHalves(e.halves))))))
      : emptyState(day === today ? 'Nothing logged yet today.' : 'Nothing logged this day.'),
  ];
}
