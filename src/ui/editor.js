import { h, stepper, openDialog, closeDialog } from './dom.js';
import { createPlateView } from './plate-view.js';
import { formatHalves, MAX_HALVES } from '../lib/units.js';

// The entry as a plate with one part, so the drawing follows the stepper.
const onePart = (halves) => ({ parts: [{ id: 1, amounts: [halves] }], active: 0 });

export function openEditor(entry, { today, onSave, onDelete }) {
  document.querySelector('dialog.editor')?.remove();
  const plate = createPlateView(onePart(entry.halves), { onSelect: () => {} });
  const amount = stepper({
    value: entry.halves,
    label: 'bananas',
    format: formatHalves,
    prev: (v) => (v > 1 ? v - 1 : null),
    next: (v) => (v < MAX_HALVES ? v + 1 : null),
    onChange: (v) => plate.update(onePart(v)),
  });
  const label = h('input', { id: 'edit-label', type: 'text', value: entry.label, maxlength: 200, placeholder: 'Food', autocomplete: 'off' });
  const day = h('input', { id: 'edit-day', type: 'date', value: entry.day, max: today, required: true });

  const save = () => {
    onSave({ halves: amount.value, label: label.value, day: day.value });
    closeDialog(dlg);
  };

  const dlg = h('dialog', { class: 'editor', 'aria-labelledby': 'editor-title' },
    h('form', { onsubmit: (e) => { e.preventDefault(); save(); } },
      h('h2', { id: 'editor-title' }, 'Edit entry'),
      plate.el,
      amount.el,
      h('label', { class: 'field' }, h('span', {}, 'What was it?'), label),
      h('label', { class: 'field' }, h('span', {}, 'Day'), day),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn danger', onclick: () => { closeDialog(dlg); onDelete(); } }, 'Delete'),
        h('span', { class: 'spacer' }),
        h('button', { type: 'button', class: 'btn', onclick: () => closeDialog(dlg) }, 'Cancel'),
        h('button', { type: 'button', class: 'btn primary', onclick: save }, 'Save'))));
  dlg.addEventListener('close', plate.destroy);
  openDialog(dlg);
  return dlg;
}
