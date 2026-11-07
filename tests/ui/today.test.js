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

  it('uses the optional label, clears it, and offers it as a recent chip', () => {
    const t = mount();
    t.type('#label', '  Latte ');
    t.logNow('1');
    expect(t.entries()).toEqual([['Latte', '1']]);
    expect(t.$('#label').value).toBe('');
    expect(t.$('.recents button').textContent).toBe('Latte · 1');
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
    t.logNow('1');
    expect(t.$('.entries img')).toBeNull();
    expect(t.entries()[0][0]).toBe(nasty);
  });

  it('counts the small hours toward the previous day', () => {
    const t = mount({ time: at(2026, 11, 3, 1, 30) });
    t.logNow('1');
    expect(t.app.state().entries[0].day).toBe('2026-11-02');
    expect(t.heading()).toBe('Today');
  });

  it('steps back to earlier days and logs there', () => {
    const t = mount();
    t.logNow('2');
    t.$('.daynav .prev').click();
    expect(t.heading()).toBe('Yesterday');
    expect(t.total()).toBe('0');
    t.logNow('3');
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
    t.logNow('2');
    t.clock.set(at(2026, 11, 4, 5));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(t.heading()).toBe('Today');
    expect(t.total()).toBe('0');
  });

  it('shows banana icons and progress against a target', () => {
    const t = mount();
    t.app.actions.setTarget(8);
    t.logNow('1½');
    expect(t.$$('.row .b')).toHaveLength(4);
    expect(t.$('.status').textContent).toBe('of 4 · 2½ left');
    t.logNow('3', '1');
    expect(t.$('.status').textContent).toBe('of 4 · 1½ over');
    expect(t.$$('.row .b')).toHaveLength(6);
    expect(t.$$('.row .b.over')).toHaveLength(2);
  });

  it('says "banana" for one or less', () => {
    const t = mount();
    t.logNow('1');
    expect(t.$('.total .unit').textContent).toBe('banana');
    t.logNow('½');
    expect(t.$('.total .unit').textContent).toBe('bananas');
  });

  it('saves to storage and reloads', () => {
    const storage = memoryStorage();
    const t = mount({ storage });
    t.type('#label', 'Toast');
    t.logNow('2');
    const t2 = mount({ storage });
    expect(t2.entries()).toEqual([['Toast', '2']]);
  });

  it('warns when saving fails', () => {
    const storage = { get: (_k, fb) => fb, set: () => false, remove: () => {} };
    const t = mount({ storage });
    t.logNow('1');
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
    t.logNow('1');
    expect(t.$$('.row .b.pop')).toHaveLength(1);
    t.logNow('1½');
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
    t.logNow('½');
    t.logNow('½');
    expect(t.$$('.row .b.pop').map((b) => b.className)).toEqual(['b f2 pop']);
  });

  it('doesn’t pop when amounts only go on the plate', () => {
    const t = mount();
    t.quick('2').click();
    expect(t.$$('.row .b.pop')).toHaveLength(0);
    expect(t.$('.total .big').classList.contains('bump')).toBe(false);
  });

  it('doesn’t pop on undo', () => {
    const t = mount();
    t.logNow('2');
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
    t.logNow('1½');
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

describe('Today: the plate', () => {
  const sum = (t) => t.plate().querySelector('.plate-sum').textContent;
  const logBtn = (t) => t.plate().querySelector('.log');

  it('adds up tapped amounts without logging them', () => {
    const t = mount();
    expect(t.plate()).toBeNull();
    t.quick('1').click();
    t.quick('2').click();
    t.quick('½').click();
    expect(sum(t)).toBe('1 + 2 + ½ = 3½');
    expect(logBtn(t).textContent).toBe('Log 3½');
    expect(t.total()).toBe('0');
    expect(t.app.state().entries).toEqual([]);
    expect(t.quick('1½').getAttribute('aria-label')).toBe('Add 1½ bananas');
  });

  it('logs one entry for the total, clears the plate and label, and offers undo', () => {
    const t = mount();
    t.type('#label', 'Dinner');
    t.quick('2').click();
    t.quick('3').click();
    logBtn(t).click();
    expect(t.entries()).toEqual([['Dinner', '5']]);
    expect(t.plate()).toBeNull();
    expect(t.$('#label').value).toBe('');
    expect(t.toast().textContent).toMatch(/Logged 5 · Dinner/);
    t.button('Undo', t.toast()).click();
    expect(t.entries()).toEqual([]);
  });

  it('logs with Enter in the label field', () => {
    const t = mount();
    t.quick('1').click();
    t.type('#label', 'Snack');
    t.$('form.logger').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(t.entries()).toEqual([['Snack', '1']]);
  });

  it('removes the last amount, or clears the plate', () => {
    const t = mount();
    t.quick('1').click();
    t.quick('2').click();
    t.plate().querySelector('[aria-label="Remove last"]').click();
    expect(sum(t)).toBe('1');
    t.quick('3').click();
    t.plate().querySelector('[aria-label="Clear plate"]').click();
    expect(t.plate()).toBeNull();
    expect(t.app.state().entries).toEqual([]);
  });

  it('puts a recent chip on the plate as a part named after it', () => {
    const t = mount();
    t.type('#label', 'Croissant');
    t.logNow('1½');
    const chip = (name) => t.$$('.recents button').find((b) => b.textContent.startsWith(name));
    chip('Croissant').click();
    expect(sum(t)).toBe('1½');
    logBtn(t).click();
    expect(t.entries().at(-1)).toEqual(['Croissant', '1½']);
  });

  it('prefers a typed label over the chip names', () => {
    const t = mount();
    t.type('#label', 'Latte');
    t.logNow('1');
    t.$('.recents button').click();
    t.type('#label', 'Breakfast');
    logBtn(t).click();
    expect(t.entries().at(-1)).toEqual(['Breakfast', '1']);
  });

  it('previews where the plate lands against the target', () => {
    const t = mount();
    t.app.actions.setTarget(8);
    t.logNow('1');
    t.quick('2').click();
    expect(t.$('.status').textContent).toBe('of 4 · 1 left after this');
    expect(t.$$('.row .b.pending')).toHaveLength(2);
    expect(t.$$('.row .b:not(.pending)')).toHaveLength(2);
    t.quick('3').click();
    expect(t.$('.status').textContent).toBe('of 4 · 2 over after this');
  });

  it('shows pending bananas without a target too', () => {
    const t = mount();
    t.quick('1½').click();
    expect(t.$$('.row .b.pending').map((b) => b.className)).toEqual(['b f2 pending', 'b f1 pending']);
  });

  it('logs to the day showing when you tap Log', () => {
    const t = mount();
    t.quick('2').click();
    t.$('.daynav .prev').click();
    expect(sum(t)).toBe('2');
    logBtn(t).click();
    expect(t.app.state().entries[0].day).toBe('2026-11-02');
  });

  it('holds up to 100 bananas', () => {
    const t = mount();
    for (let i = 0; i < 34; i++) t.quick('3').click();
    expect(logBtn(t).textContent).toBe('Log 99');
    expect(t.toast().textContent).toBe('A plate holds up to 100 bananas.');
  });

  it('survives closing the app', () => {
    const storage = memoryStorage();
    const t = mount({ storage });
    t.quick('2').click();
    t.quick('½').click();
    const t2 = mount({ storage });
    expect(sum(t2)).toBe('2 + ½ = 2½');
  });

  it('picks up a plate saved by an older version', () => {
    const storage = memoryStorage();
    storage.set('banana:plate:v1', [{ halves: 2, label: 'Latte' }, { halves: 3, label: 'Croissant' }]);
    const t = mount({ storage });
    logBtn(t).click();
    expect(t.entries()).toEqual([['Latte + Croissant', '2½']]);
  });

  const pieces = (t) => t.$$('.plate-art .piece').map((g) => g.querySelector('use').getAttribute('href'));

  it('draws a banana on the plate for each whole one added, and a cut half for each ½', () => {
    const t = mount();
    t.quick('1½').click();
    t.quick('½').click();
    expect(pieces(t).sort()).toEqual(['#banana', '#banana-half', '#banana-half']);
    expect(t.$('.plate-art').getAttribute('aria-hidden')).toBe('true');
  });

  it('drops in only the newest bananas, once', () => {
    const t = mount();
    t.quick('1').click();
    expect(t.$$('.piece.drop')).toHaveLength(1);
    t.quick('1½').click();
    expect(t.$$('.piece')).toHaveLength(3);
    expect(t.$$('.piece.drop').map((g) => g.querySelector('use').getAttribute('href')).sort()).toEqual(['#banana', '#banana-half']);
    t.app.actions.setView('today');
    expect(t.$$('.piece.drop')).toHaveLength(0);
    t.plate().querySelector('[aria-label="Remove last"]').click();
    expect(t.$$('.piece.drop')).toHaveLength(0);
  });

  it('doesn’t drop the bananas already on the plate when the app opens', () => {
    const storage = memoryStorage();
    mount({ storage }).quick('2').click();
    const t = mount({ storage });
    expect(t.$$('.piece')).toHaveLength(2);
    expect(t.$$('.piece.drop')).toHaveLength(0);
  });

  it('keeps the same drawing across re-renders, so bananas in flight aren’t cut off', () => {
    const t = mount();
    t.quick('1').click();
    const art = t.$('.plate-art');
    t.quick('1').click();
    expect(t.$('.plate-art')).toBe(art);
  });

  it('draws up to 40 bananas and counts the rest', () => {
    const t = mount();
    for (let i = 0; i < 45; i++) t.quick('1').click();
    expect(t.$$('.piece')).toHaveLength(40);
    expect(t.$('.plate-more').textContent).toBe('+5');
  });
});
