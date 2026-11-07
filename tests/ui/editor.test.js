// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from './helpers.js';

const setup = () => {
  const t = mount();
  t.type('#label', 'Toast');
  t.logNow('1');
  t.$('.entries .entry').click();
  return { ...t, dlg: t.$('dialog.editor') };
};

describe('editor', () => {
  it('opens with the entry’s values', () => {
    const { dlg } = setup();
    expect(dlg.hasAttribute('open')).toBe(true);
    expect(dlg.querySelector('.stepper output').textContent).toBe('1');
    expect(dlg.querySelector('#edit-label').value).toBe('Toast');
    expect(dlg.querySelector('#edit-day').value).toBe('2026-11-03');
    expect(dlg.querySelector('#edit-day').max).toBe('2026-11-03');
  });

  it('edits amount and label', () => {
    const t = setup();
    const plus = t.dlg.querySelector('.stepper .plus');
    plus.click();
    plus.click();
    expect(t.dlg.querySelector('.stepper output').textContent).toBe('2');
    t.type(t.dlg.querySelector('#edit-label'), 'Jam toast');
    t.button('Save', t.dlg).click();
    expect(t.$('dialog.editor')).toBeNull();
    expect(t.entries()).toEqual([['Jam toast', '2']]);
  });

  it('won’t go below ½', () => {
    const t = setup();
    const minus = t.dlg.querySelector('.stepper .minus');
    minus.click();
    expect(minus.disabled).toBe(true);
    expect(t.dlg.querySelector('.stepper output').textContent).toBe('½');
  });

  it('moves an entry to another day', () => {
    const t = setup();
    t.change(t.dlg.querySelector('#edit-day'), '2026-11-01');
    t.button('Save', t.dlg).click();
    expect(t.entries()).toEqual([]);
    expect(t.app.state().entries[0].day).toBe('2026-11-01');
  });

  it('ignores a future day', () => {
    const t = setup();
    t.change(t.dlg.querySelector('#edit-day'), '2026-11-09');
    t.button('Save', t.dlg).click();
    expect(t.app.state().entries[0].day).toBe('2026-11-03');
  });

  it('cancel discards changes', () => {
    const t = setup();
    t.dlg.querySelector('.stepper .plus').click();
    t.button('Cancel', t.dlg).click();
    expect(t.entries()).toEqual([['Toast', '1']]);
  });

  it('shows the entry on a plate that follows the amount', () => {
    const t = setup();
    const art = t.dlg.querySelector('.plate-art');
    expect(art.getAttribute('aria-hidden')).toBe('true');
    const pieces = () => [...art.querySelectorAll('.piece use')].map((u) => u.getAttribute('href'));
    expect(pieces()).toEqual(['#banana']);
    expect(art.querySelectorAll('.piece.drop')).toHaveLength(0); // already on the plate when it opens
    const plus = t.dlg.querySelector('.stepper .plus');
    plus.click();
    expect(pieces().sort()).toEqual(['#banana', '#banana-half']);
    expect([...art.querySelectorAll('.piece.drop use')].map((u) => u.getAttribute('href'))).toEqual(['#banana-half']);
    plus.click();
    expect(pieces()).toEqual(['#banana', '#banana']);
    t.dlg.querySelector('.stepper .minus').click();
    t.dlg.querySelector('.stepper .minus').click();
    t.dlg.querySelector('.stepper .minus').click();
    expect(pieces()).toEqual(['#banana-half']);
  });

  it('gives each plate drawing its own shadow, so two on screen don’t share one', () => {
    const t = setup();
    t.quick('1').click(); // the plate on Today
    t.$('.entries .entry').click();
    const ids = t.$$('filter').map((f) => f.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const art of t.$$('.plate-art')) {
      const id = art.querySelector('filter').id;
      expect([...art.querySelectorAll('.piece')].every((g) => g.getAttribute('filter') === `url(#${id})`)).toBe(true);
    }
  });

  it('deletes with undo', () => {
    const t = setup();
    t.button('Delete', t.dlg).click();
    expect(t.entries()).toEqual([]);
    expect(t.app.state().entries[0].deleted).toBe(true);
    expect(t.toast().textContent).toMatch(/Deleted/);
    t.button('Undo', t.toast()).click();
    expect(t.entries()).toEqual([['Toast', '1']]);
  });
});
