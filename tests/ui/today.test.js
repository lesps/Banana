// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, at, memoryStorage } from './helpers.js';

describe('Today', () => {
  it('starts empty on today', () => {
    const t = mount();
    expect(t.heading()).toBe('Today');
    expect(t.total()).toBe('0');
    expect(t.$('.empty')).not.toBeNull();
    expect(t.$('.daynav .next').disabled).toBe(true);
  });

  it('logs a quick amount with one tap and offers undo', () => {
    const t = mount();
    t.quick('1½').click();
    expect(t.total()).toBe('1½');
    expect(t.entries()).toEqual([['Food', '1½']]);
    expect(t.toast().textContent).toMatch(/Logged 1½/);
    t.button('Undo', t.toast()).click();
    expect(t.total()).toBe('0');
    expect(t.entries()).toEqual([]);
  });

  it('uses the optional label, clears it, and offers it as a recent chip', () => {
    const t = mount();
    t.type('#label', '  Latte ');
    t.quick('1').click();
    expect(t.entries()).toEqual([['Latte', '1']]);
    expect(t.$('#label').value).toBe('');
    const chip = t.$('.recents button');
    expect(chip.textContent).toBe('Latte · 1');
    chip.click();
    expect(t.entries()).toEqual([['Latte', '1'], ['Latte', '1']]);
    expect(t.total()).toBe('2');
  });

  it('keeps the label being typed across re-renders', () => {
    const t = mount();
    t.type('#label', 'Soup');
    t.app.actions.setView('today');
    expect(t.$('#label').value).toBe('Soup');
  });

  it('renders labels as text', () => {
    const t = mount();
    const nasty = '<img src=x onerror=alert(1)>';
    t.type('#label', nasty);
    t.quick('1').click();
    expect(t.$('.entries img')).toBeNull();
    expect(t.entries()[0][0]).toBe(nasty);
  });

  it('counts the small hours toward the previous day', () => {
    const t = mount({ time: at(2026, 11, 3, 1, 30) });
    t.quick('1').click();
    expect(t.app.state().entries[0].day).toBe('2026-11-02');
    expect(t.heading()).toBe('Today');
  });

  it('steps back to earlier days and logs there', () => {
    const t = mount();
    t.quick('2').click();
    t.$('.daynav .prev').click();
    expect(t.heading()).toBe('Yesterday');
    expect(t.total()).toBe('0');
    t.quick('3').click();
    expect(t.app.state().entries[1].day).toBe('2026-11-02');
    t.$('.daynav .prev').click();
    expect(t.heading()).toBe('Sun, Nov 1');
    t.$('.daynav .next').click();
    t.$('.daynav .next').click();
    expect(t.heading()).toBe('Today');
    expect(t.total()).toBe('2');
  });

  it('follows the day rollover while open', () => {
    const t = mount({ time: at(2026, 11, 3, 23) });
    t.quick('2').click();
    t.clock.set(at(2026, 11, 4, 5));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(t.heading()).toBe('Today');
    expect(t.total()).toBe('0');
  });

  it('shows banana icons and progress against a target', () => {
    const t = mount();
    t.app.actions.setTarget(8);
    t.quick('1½').click();
    expect(t.$$('.row .b')).toHaveLength(4);
    expect(t.$('.status').textContent).toBe('of 4 · 2½ left');
    t.quick('3').click();
    t.quick('1').click();
    expect(t.$('.status').textContent).toBe('of 4 · 1½ over');
    expect(t.$$('.row .b')).toHaveLength(6);
    expect(t.$$('.row .b.over')).toHaveLength(2);
  });

  it('says "banana" for one or less', () => {
    const t = mount();
    t.quick('1').click();
    expect(t.$('.total .unit').textContent).toBe('banana');
    t.quick('½').click();
    expect(t.$('.total .unit').textContent).toBe('bananas');
  });

  it('saves to storage and reloads', () => {
    const storage = memoryStorage();
    const t = mount({ storage });
    t.type('#label', 'Toast');
    t.quick('2').click();
    const t2 = mount({ storage });
    expect(t2.entries()).toEqual([['Toast', '2']]);
  });

  it('warns when saving fails', () => {
    const storage = { get: (_k, fb) => fb, set: () => false, remove: () => {} };
    const t = mount({ storage });
    t.quick('1').click();
    expect(t.toast().textContent).toMatch(/couldn’t save/i);
  });
});

describe('Today: bananas', () => {
  const fills = (els) => [...els].map((b) => b.className.match(/f(\d)/)[1]).join(' ');

  it('quick buttons show their amount as bananas', () => {
    const t = mount();
    expect(fills(t.quick('1½').querySelectorAll('.mini .b'))).toBe('2 1');
    expect(fills(t.quick('3').querySelectorAll('.mini .b'))).toBe('2 2 2');
    expect(t.quick('½').querySelector('.mini').getAttribute('aria-hidden')).toBe('true');
  });

  it('pops in the bananas that were just logged, once', () => {
    const t = mount();
    t.quick('1').click();
    expect(t.$$('.row .b.pop')).toHaveLength(1);
    t.quick('1½').click();
    const popped = t.$$('.row .b.pop');
    expect(popped.map((b) => t.$$('.row .b').indexOf(b))).toEqual([1, 2]);
    expect(popped.map((b) => b.style.getPropertyValue('--i'))).toEqual(['0', '1']);
    expect(t.$('.total .big').classList.contains('bump')).toBe(true);
    t.app.actions.setView('today');
    expect(t.$$('.row .b.pop')).toHaveLength(0);
    expect(t.$('.total .big').classList.contains('bump')).toBe(false);
  });

  it('pops a half banana finishing into a whole one', () => {
    const t = mount();
    t.quick('½').click();
    t.quick('½').click();
    expect(t.$$('.row .b.pop').map((b) => b.className)).toEqual(['b f2 pop']);
  });

  it('doesn’t pop on undo', () => {
    const t = mount();
    t.quick('2').click();
    t.button('Undo', t.toast()).click();
    expect(t.$$('.row .b.pop')).toHaveLength(0);
  });

  it('shows a smiling banana on an empty day, hidden from screen readers', () => {
    const t = mount();
    expect(t.$('.empty .empty-banana').getAttribute('aria-hidden')).toBe('true');
    expect(t.$('.empty .empty-banana use').getAttribute('href')).toBe('#banana-face');
    expect(t.$('.empty').textContent).toBe('Nothing logged yet today.');
  });

  it('draws whole, cut-in-half and empty bananas from one shared sprite', () => {
    const t = mount();
    t.app.actions.setTarget(6);
    t.quick('1½').click();
    const uses = (b) => [...b.querySelectorAll('use')].map((u) => `${u.getAttribute('href')}${u.classList.contains('ghost') ? ' ghost' : ''}`);
    const [whole, half, empty] = t.$$('.row .b');
    expect(uses(whole)).toEqual(['#banana']);
    expect(uses(half)).toEqual(['#banana ghost', '#banana-half']);
    expect(uses(empty)).toEqual(['#banana ghost']);
    expect(uses(t.quick('½').querySelector('.mini .b'))).toEqual(['#banana ghost', '#banana-half']);
    mount();
    expect(document.querySelectorAll('#banana-sprite')).toHaveLength(1);
    for (const id of ['banana', 'banana-half', 'banana-face']) expect(document.getElementById(id).tagName).toBe('symbol');
  });
});
