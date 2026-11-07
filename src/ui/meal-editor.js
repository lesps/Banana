import { h, stepper, openDialog, closeDialog } from './dom.js';
import { createPlateView } from './plate-view.js';
import { formatHalves, MAX_HALVES } from '../lib/units.js';

const amountStepper = (value, min, cls, onChange) => stepper({
  value, label: 'bananas', format: formatHalves, cls, onChange,
  prev: (v) => (v > min ? v - 1 : null),
  next: (v) => (v < MAX_HALVES ? v + 1 : null),
});

// One part of the plate: its name and amount, or take it off. 0 leaves the part empty.
export function openPartEditor({ title, label, halves }, { onSave, onRemove }) {
  document.querySelector('dialog.part-editor')?.remove();
  const amount = amountStepper(halves, 0);
  const input = h('input', { id: 'part-label', type: 'text', value: label, maxlength: 200, placeholder: 'What is it? (optional)', autocomplete: 'off', enterkeyhint: 'done' });
  const save = () => {
    onSave({ halves: amount.value, label: input.value });
    closeDialog(dlg);
  };
  const dlg = h('dialog', { class: 'editor part-editor', 'aria-labelledby': 'part-title' },
    h('form', { onsubmit: (e) => { e.preventDefault(); save(); } },
      h('h2', { id: 'part-title' }, title),
      amount.el,
      h('label', { class: 'field' }, h('span', {}, 'What is it?'), input),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn danger', onclick: () => { closeDialog(dlg); onRemove(); } }, 'Remove'),
        h('span', { class: 'spacer' }),
        h('button', { type: 'button', class: 'btn', onclick: () => closeDialog(dlg) }, 'Cancel'),
        h('button', { type: 'button', class: 'btn primary', onclick: save }, 'Save'))));
  openDialog(dlg);
  return dlg;
}

// A logged meal: its plate, its name, each part's name and amount (or take a part out), and its
// day. The plate follows the edits; tapping a wedge points out its part's row. Nothing changes
// until Save.
export function openMealEditor({ name, day, parts }, { today, onSave, onDelete }) {
  document.querySelector('dialog.meal-editor')?.remove();
  const nameInput = h('input', { id: 'meal-name', type: 'text', value: name, maxlength: 200, placeholder: 'Meal', autocomplete: 'off' });
  const dayInput = h('input', { id: 'meal-day', type: 'date', value: day, max: today, required: true });
  let picked = null; // the row whose wedge is highlighted
  const live = () => rows.filter((r) => !r.removed);
  const plateOf = () => ({
    parts: live().map((r) => ({ id: r.n, label: r.input.value, amounts: [r.amount.value] })),
    active: live().indexOf(picked),
  });
  const refresh = () => {
    rows.forEach((r) => r.li.classList.toggle('active', r === picked));
    plate.update(plateOf());
  };
  const pick = (row) => {
    picked = row;
    refresh();
  };
  const rows = parts.map((p, i) => {
    const row = { id: p.id, n: i + 1, removed: false };
    row.amount = amountStepper(p.halves, 1, 'compact', () => pick(row));
    row.input = h('input', {
      type: 'text', value: p.label, maxlength: 200, placeholder: 'Food', autocomplete: 'off', 'aria-label': `Part ${i + 1}`,
      oninput: refresh,
    });
    row.remove = h('button', {
      type: 'button', class: 'icon-btn part-remove', 'aria-label': `Remove ${p.label || `part ${i + 1}`}`,
      onclick: () => {
        row.removed = true;
        row.li.remove();
        if (picked === row) picked = null;
        syncRemove();
        refresh();
      },
    }, '✕');
    row.li = h('li', { class: 'meal-part' }, row.input, row.amount.el, row.remove);
    return row;
  });
  const plate = createPlateView(plateOf(), { onSelect: (i) => pick(live()[i] ?? null) });
  const syncRemove = () => {
    const left = rows.filter((r) => !r.removed);
    left.forEach((r) => { r.remove.disabled = left.length === 1; });
  };
  syncRemove();

  const save = () => {
    onSave({
      name: nameInput.value,
      day: dayInput.value,
      parts: rows.map((r) => ({ id: r.id, halves: r.amount.value, label: r.input.value, removed: r.removed })),
    });
    closeDialog(dlg);
  };
  const dlg = h('dialog', { class: 'editor meal-editor', 'aria-labelledby': 'meal-title' },
    h('form', { onsubmit: (e) => { e.preventDefault(); save(); } },
      // Focus starts on the heading, so opening it doesn't pop up the keyboard.
      h('h2', { id: 'meal-title', tabindex: '-1', autofocus: true }, 'Edit meal'),
      plate.el,
      h('label', { class: 'field' }, h('span', {}, 'Name'), nameInput),
      h('div', { class: 'field' }, h('span', {}, 'Parts'), h('ul', { class: 'meal-parts' }, rows.map((r) => r.li))),
      h('label', { class: 'field' }, h('span', {}, 'Day'), dayInput),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn danger', onclick: () => { closeDialog(dlg); onDelete(); } }, 'Delete meal'),
        h('span', { class: 'spacer' }),
        h('button', { type: 'button', class: 'btn', onclick: () => closeDialog(dlg) }, 'Cancel'),
        h('button', { type: 'button', class: 'btn primary', onclick: save }, 'Save'))));
  dlg.addEventListener('close', plate.destroy);
  openDialog(dlg);
  return dlg;
}
