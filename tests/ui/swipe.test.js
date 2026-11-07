// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from './helpers.js';
import { swipeOutcome, REVEAL } from '../../src/ui/swipe.js';

describe('swipeOutcome', () => {
  it.each([
    [-20, 'close'],
    [-60, 'open-left'],
    [-160, 'delete'],
    [20, 'close'],
    [60, 'open-right'],
    [160, 'again'],
  ])('%i px on a 320 px row → %s', (dx, outcome) => expect(swipeOutcome(dx, 320)).toBe(outcome));

  it('needs a longer full swipe on a wider row, and copes with an unmeasured one', () => {
    expect(swipeOutcome(-160, 600)).toBe('open-left');
    expect(swipeOutcome(-160, 0)).toBe('delete');
  });
});

const pointer = (el, type, x, y = 0) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1, button: 0 }));
const swipe = (row, dx, dy = 0) => {
  pointer(row, 'pointerdown', 200, 100);
  pointer(row, 'pointermove', 200 + dx / 2, 100 + dy / 2);
  pointer(row, 'pointermove', 200 + dx, 100 + dy);
  pointer(row, 'pointerup', 200 + dx, 100 + dy);
  row.click(); // browsers may follow a drag with a click
};

const setup = () => {
  const t = mount();
  t.type('#label', 'Toast');
  t.logNow('1½');
  t.type('#label', 'Tea');
  t.logNow('½');
  const row = (label) => t.$$('.entries .entry').find((e) => e.querySelector('.label').textContent === label);
  return { ...t, row };
};

describe('swiping logged items', () => {
  it('a long swipe left deletes, with undo', () => {
    const t = setup();
    swipe(t.row('Toast'), -200);
    expect(t.entries()).toEqual([['Tea', '½']]);
    expect(t.$('dialog.editor')).toBeNull();
    t.button('Undo', t.toast()).click();
    expect(t.entries().map((e) => e[0])).toEqual(['Toast', 'Tea']);
  });

  it('a long swipe right puts the entry back on the plate without logging it', () => {
    const t = setup();
    swipe(t.row('Toast'), 200);
    expect(t.plate().querySelector('.plate-sum').textContent).toBe('1½');
    expect(t.app.state().plate).toEqual({ parts: [{ id: 1, label: 'Toast', amounts: [3] }], active: 0 });
    expect(t.entries()).toHaveLength(2);
  });

  it('a short swipe opens the row to show its button', () => {
    const t = setup();
    const toast = t.row('Toast');
    swipe(toast, -60);
    expect(toast.classList.contains('open-left')).toBe(true);
    expect(toast.style.transform).toBe(`translateX(${-REVEAL}px)`);
    expect(t.$('dialog.editor')).toBeNull();
    toast.closest('li').querySelector('.swipe-delete').click();
    expect(t.entries()).toEqual([['Tea', '½']]);
  });

  it('the Again button works the same as the long swipe', () => {
    const t = setup();
    const tea = t.row('Tea');
    swipe(tea, 60);
    expect(tea.classList.contains('open-right')).toBe(true);
    tea.closest('li').querySelector('.swipe-again').click();
    expect(t.app.state().plate).toEqual({ parts: [{ id: 1, label: 'Tea', amounts: [1] }], active: 0 });
  });

  it('tapping an open row closes it instead of opening the editor', () => {
    const t = setup();
    const toast = t.row('Toast');
    swipe(toast, -60);
    pointer(toast, 'pointerdown', 100);
    pointer(toast, 'pointerup', 100);
    toast.click();
    expect(toast.classList.contains('open-left')).toBe(false);
    expect(toast.style.transform).toBe('');
    expect(t.$('dialog.editor')).toBeNull();
  });

  it('opening one row closes another', () => {
    const t = setup();
    swipe(t.row('Toast'), -60);
    swipe(t.row('Tea'), 60);
    expect(t.row('Toast').classList.contains('open-left')).toBe(false);
    expect(t.row('Tea').classList.contains('open-right')).toBe(true);
  });

  it('a mostly vertical drag is a scroll, not a swipe', () => {
    const t = setup();
    const toast = t.row('Toast');
    swipe(toast, -30, 80);
    expect(toast.style.transform).toBe('');
    expect(t.entries()).toHaveLength(2);
  });

  it('a plain tap still opens the editor, also after an earlier swipe', () => {
    const t = setup();
    const toast = t.row('Toast');
    swipe(toast, -20);
    pointer(toast, 'pointerdown', 100);
    pointer(toast, 'pointerup', 100);
    toast.click();
    expect(t.$('dialog.editor')).not.toBeNull();
  });

  it('marks a swipe that will act on release', () => {
    const t = setup();
    const toast = t.row('Toast');
    pointer(toast, 'pointerdown', 300);
    pointer(toast, 'pointermove', 250);
    pointer(toast, 'pointermove', 100);
    expect(toast.closest('li').classList.contains('commit-left')).toBe(true);
    pointer(toast, 'pointermove', 250);
    expect(toast.closest('li').classList.contains('commit-left')).toBe(false);
  });

  it('keeps the swipe buttons out of the tab order and away from screen readers', () => {
    const t = setup();
    const actions = t.row('Toast').closest('li').querySelector('.swipe-actions');
    expect(actions.getAttribute('aria-hidden')).toBe('true');
    expect([...actions.querySelectorAll('button')].map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '-1']);
  });
});
