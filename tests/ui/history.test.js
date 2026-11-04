// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, at } from './helpers.js';

const logOn = (t, steps, label) => {
  for (let i = 0; i < steps; i++) t.$('.daynav .prev').click();
  t.logNow(label);
  t.tab('today');
};

describe('History', () => {
  it('shows 14 bars ending today, scaled to the biggest day', () => {
    const t = mount();
    logOn(t, 0, '3');
    logOn(t, 1, '1½');
    t.tab('history');
    const bars = t.$$('.bars .bar');
    expect(bars).toHaveLength(14);
    expect(bars.at(-1).getAttribute('aria-label')).toBe('Today: 3');
    expect(bars.at(-2).getAttribute('aria-label')).toBe('Yesterday: 1½');
    expect(bars.at(-1).querySelector('.fill').style.height).toBe('100%');
    expect(bars.at(-2).querySelector('.fill').style.height).toBe('50%');
    expect(t.$('.bars .target')).toBeNull();
  });

  it('draws the target line and scales to it when it is bigger', () => {
    const t = mount();
    t.app.actions.setTarget(12);
    logOn(t, 0, '3');
    t.tab('history');
    expect(t.$('.bars .target').style.bottom).toBe('100%');
    expect(t.$$('.bars .bar').at(-1).querySelector('.fill').style.height).toBe('50%');
  });

  it('averages the logged days before today', () => {
    const t = mount();
    t.tab('history');
    expect(t.$('.avg')).toBeNull();
    t.tab('today');
    logOn(t, 0, '3');
    logOn(t, 1, '2');
    logOn(t, 3, '3');
    t.tab('history');
    expect(t.$('.avg').textContent).toBe('Average 2½ a day over 2 logged days this past week');
  });

  it('lists days with entries, newest first, and opens one', () => {
    const t = mount();
    logOn(t, 2, '1');
    logOn(t, 0, '2');
    t.tab('history');
    const days = t.$$('.days .day');
    expect(days.map((d) => d.textContent)).toEqual(['Today1 entry2', 'Sun, Nov 11 entry1']);
    days[1].click();
    expect(t.$('.tabs button[data-view="today"]').getAttribute('aria-current')).toBe('page');
    expect(t.heading()).toBe('Sun, Nov 1');
  });

  it('pages the day list 30 at a time', () => {
    const t = mount({ time: at(2026, 11, 3, 12) });
    const entries = Array.from({ length: 35 }, (_, i) => {
      const ts = at(2026, 11, 3 - i, 12);
      const day = new Date(ts).toISOString().slice(0, 10);
      return { id: `e${i}`, day, ts, halves: 2, label: '', updatedAt: ts };
    });
    t.app.actions.importText(JSON.stringify({ format: 'banana-log', version: 1, entries }), 'x.json');
    t.app.actions.applyImport('merge');
    t.tab('history');
    expect(t.$$('.days .day')).toHaveLength(30);
    t.button('Show more').click();
    expect(t.$$('.days .day')).toHaveLength(35);
    expect(t.button('Show more')).toBeUndefined();
  });

  it('a bar opens its day', () => {
    const t = mount();
    t.tab('history');
    t.$$('.bars .bar').at(-3).click();
    expect(t.heading()).toBe('Sun, Nov 1');
  });

  it('marks empty days so their bars draw no stem', () => {
    const t = mount();
    t.logNow('1');
    t.tab('history');
    const bars = t.$$('.bars .bar');
    expect(bars.at(-1).classList.contains('zero')).toBe(false);
    expect(bars.at(-2).classList.contains('zero')).toBe(true);
  });

  it('shows a banana when nothing is logged', () => {
    const t = mount();
    t.tab('history');
    expect(t.$('.empty .empty-banana')).not.toBeNull();
    expect(t.$('.empty').textContent).toBe('Nothing logged yet.');
  });
});
