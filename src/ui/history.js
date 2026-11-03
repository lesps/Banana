import { h } from './dom.js';
import { emptyState } from './today.js';
import { formatDay, weekdayLetter } from '../lib/day.js';
import { formatHalves, countEntries } from '../lib/units.js';
import { series, recentAverage, daySummaries } from '../lib/log.js';

const pct = (n, max) => `${Math.round((n / max) * 100)}%`;

export function renderHistory({ state, today, actions }) {
  const target = state.settings.targetHalves;
  const days = series(state.entries, today, 14);
  const max = Math.max(target ?? 0, ...days.map((d) => d.halves), 1);
  const avg = recentAverage(state.entries, today);
  const summaries = daySummaries(state.entries);
  const shown = summaries.slice(0, state.historyLimit);

  return [
    h('h1', {}, 'History'),
    h('section', { class: 'chart card' },
      h('div', { class: 'bars' },
        target != null && h('div', { class: 'target', style: `bottom:${pct(target, max)}`, 'aria-hidden': 'true' }),
        days.map((d) => h('button', {
          type: 'button',
          class: `bar${d.day === today ? ' today' : ''}${target != null && d.halves > target ? ' over' : ''}${d.halves ? '' : ' zero'}`,
          'aria-label': `${formatDay(d.day, today)}: ${formatHalves(d.halves)}`,
          onclick: () => actions.openDay(d.day),
        }, h('span', { class: 'fill', style: `height:${pct(d.halves, max)}` })))),
      h('div', { class: 'wds', 'aria-hidden': 'true' }, days.map((d) => h('span', {}, weekdayLetter(d.day)))),
      avg && h('p', { class: 'avg' },
        `Average ${formatHalves(avg.halves)} a day over ${avg.days} logged ${avg.days === 1 ? 'day' : 'days'} this past week`)),

    shown.length
      ? h('ol', { class: 'days' }, shown.map((s) => h('li', {},
        h('button', { type: 'button', class: 'day', onclick: () => actions.openDay(s.day) },
          h('span', { class: 'date' }, formatDay(s.day, today)),
          h('span', { class: 'count' }, countEntries(s.count)),
          h('span', { class: 'sum' }, formatHalves(s.halves))))))
      : emptyState('Nothing logged yet.'),
    summaries.length > shown.length && h('button', { type: 'button', class: 'btn more-days', onclick: actions.showMore }, 'Show more'),
  ];
}
