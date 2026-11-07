import { h } from './dom.js';
import { banana, bigBanana } from './banana.js';
import { attachSwipe } from './swipe.js';
import { formatDay, formatTime, dayOf } from '../lib/day.js';
import { formatHalves, bananaRow, bananaWord, QUICK_HALVES } from '../lib/units.js';
import { dayRows, recentLabels } from '../lib/log.js';
import { plateTotal, formatPlate, partHalves, partName, newPart } from '../lib/plate.js';

export const emptyState = (text) => h('div', { class: 'empty' }, bigBanana(), h('p', {}, text));

// plated: what's on the plate, previewed as "… after this".
export function statusText(total, target, plated = 0) {
  const diff = target - total - plated;
  const where = diff > 0 ? `${formatHalves(diff)} left` : diff === 0 ? 'right on target' : `${formatHalves(-diff)} over`;
  return `of ${formatHalves(target)} · ${where}${plated ? ' after this' : ''}`;
}

// The plate: the drawing (kept across renders by plateView), a chip per part (tap one to build it,
// tap the one you're building to rename, change or remove it), + Part, the sum, ↶, ✕ and Log.
function plateBar(plate, plateView, actions) {
  if (!plate.parts.length) return null;
  return h('div', { class: 'plate', role: 'group', 'aria-label': 'Plate' },
    plateView.el,
    h('div', { class: 'plate-parts', role: 'group', 'aria-label': 'Parts' },
      plate.parts.map((p, i) => h('button', {
        type: 'button', class: `part-chip${i === plate.active ? ' active' : ''}`, 'aria-pressed': String(i === plate.active),
        'data-focus': `part-${i}`, onclick: () => (i === plate.active ? actions.editPart(i) : actions.selectPart(i)),
      }, h('span', { class: 'part-name' }, partName(p, i)), h('span', { class: 'part-amount' }, formatHalves(partHalves(p))))),
      h('button', { type: 'button', class: 'part-add', 'aria-label': 'Add a part', 'data-focus': 'part-add', disabled: !newPart(plate), onclick: actions.newPart }, '+ Part')),
    h('div', { class: 'plate-foot' },
      h('span', { class: 'plate-sum', 'aria-live': 'polite' }, formatPlate(plate)),
      h('div', { class: 'plate-buttons' },
        h('button', { type: 'button', class: 'icon-btn plate-undo', 'aria-label': 'Remove last', 'data-focus': 'plate-undo', onclick: actions.undoPlate }, '↶'),
        h('button', { type: 'button', class: 'icon-btn plate-clear', 'aria-label': 'Clear plate', onclick: actions.clearPlate }, '✕'),
        h('button', { type: 'button', class: 'btn primary log', 'data-focus': 'plate-log', onclick: actions.logPlate }, `Log ${formatHalves(plateTotal(plate))}`))));
}

// Tap to edit; swipe left to delete, right to put it back on the plate. The swipe buttons are a
// touch shortcut only (hidden from screen readers and the tab order); the editor and the recent
// chips do the same jobs accessibly.
function swipeRow(row, { onTap, onDelete, onAgain }) {
  attachSwipe(row, { onTap, onDelete, onAgain });
  return h('li', { class: 'swipe' },
    h('div', { class: 'swipe-actions', 'aria-hidden': 'true' },
      h('button', { type: 'button', class: 'swipe-again', tabindex: '-1', onclick: onAgain }, 'Again'),
      h('button', { type: 'button', class: 'swipe-delete', tabindex: '-1', onclick: onDelete }, 'Delete')),
    row);
}

// The time only means something when the entry was logged on its own day.
const timeOf = (ts, day, rolloverHour) => h('span', { class: 'time' }, dayOf(ts, rolloverHour) === day ? formatTime(ts) : '');

function entryRow(e, rolloverHour, actions) {
  const row = h('button', { type: 'button', class: 'entry' },
    timeOf(e.ts, e.day, rolloverHour),
    h('span', { class: 'label' }, e.label || 'Food'),
    h('span', { class: 'amount' }, formatHalves(e.halves)));
  return swipeRow(row, { onTap: () => actions.edit(e.id), onDelete: () => actions.remove(e.id), onAgain: () => actions.addPart(e.halves, e.label) });
}

// A meal is one row: its name, its parts underneath, and its total. Swipes act on the whole meal.
function mealRow(m, rolloverHour, actions) {
  const row = h('button', { type: 'button', class: 'entry meal' },
    timeOf(m.ts, m.day, rolloverHour),
    h('span', { class: 'meal-text' },
      h('span', { class: 'label' }, m.name || 'Meal'),
      h('span', { class: 'parts' }, m.parts.map((p) => `${p.label || 'Food'} ${formatHalves(p.halves)}`).join(' · '))),
    h('span', { class: 'amount' }, formatHalves(m.halves)));
  return swipeRow(row, {
    onTap: () => actions.editMeal(m.id, m.day),
    onDelete: () => actions.removeMeal(m.id, m.day),
    onAgain: () => actions.againMeal(m.id, m.day),
  });
}

export function renderToday({ state, today, day, draft, setDraft, pop, plateView, actions }) {
  const { targetHalves: target, rolloverHour } = state.settings;
  const rows = dayRows(state.entries, day);
  const total = rows.reduce((n, r) => n + (r.type === 'meal' ? r.halves : r.entry.halves), 0);
  plateView.update(state.plate); // every render, so the drawing knows which bananas are new
  const asking = state.plate.parts.length > 1 ? 'Name this meal (optional)' : 'What was it? (optional)';
  const plated = plateTotal(state.plate);
  // The row shows logged bananas plus, in a lighter style, what's on the plate.
  const row = bananaRow(total + plated, target);
  const logged = bananaRow(total, target).icons;
  // Logged icons whose fill went up since just before the last log pop in, staggered by --i.
  const before = pop?.day === day ? pop.from : null;
  let popped = 0;
  const icon = (i, { fill, over }) => {
    const loggedFill = logged[i]?.fill ?? 0;
    const grew = before != null && loggedFill > Math.max(0, Math.min(2, before - 2 * i));
    return banana(fill, { over, pending: fill > loggedFill, pop: grew, i: grew ? popped++ : undefined });
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
      target != null && h('p', { class: 'status' }, statusText(total, target, plated))),

    h('form', {
      class: 'logger',
      onsubmit: (e) => {
        e.preventDefault();
        if (plated) actions.logPlate();
        else e.target.querySelector('input')?.blur();
      },
    },
      h('label', { class: 'sr-only', for: 'label' }, asking),
      h('input', {
        id: 'label', 'data-focus': 'label', type: 'text', value: draft, maxlength: 200, list: 'label-suggestions',
        placeholder: asking, autocomplete: 'off', enterkeyhint: 'done',
        oninput: (e) => setDraft(e.target.value),
      }),
      h('datalist', { id: 'label-suggestions' }, suggestions.map((s) => h('option', { value: s.label }))),
      h('div', { class: 'quick', role: 'group', 'aria-label': 'Add an amount' },
        QUICK_HALVES.map((q) => h('button', {
          type: 'button', 'aria-label': `Add ${formatHalves(q)} ${bananaWord(q)}`, onclick: () => actions.addToPlate(q),
        }, formatHalves(q), h('span', { class: 'mini', 'aria-hidden': 'true' },
          bananaRow(q, null).icons.map(({ fill }) => banana(fill)))))),
      // Below the buttons, so they don't move under your finger when the plate appears.
      plateBar(state.plate, plateView, actions)),

    recents.length > 0 && h('div', { class: 'recents', role: 'group', 'aria-label': 'Add again' },
      recents.map((r) => h('button', { type: 'button', class: 'chip', onclick: () => actions.addPart(r.halves, r.label) },
        `${r.label} · ${formatHalves(r.halves)}`))),

    rows.length
      ? h('ol', { class: 'entries' }, rows.map((r) => (r.type === 'meal' ? mealRow(r, rolloverHour, actions) : entryRow(r.entry, rolloverHour, actions))))
      : emptyState(day === today ? 'Nothing logged yet today.' : 'Nothing logged this day.'),
  ];
}
