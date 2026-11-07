import { describe, it, expect } from 'vitest';
import {
  createEntry, addEntry, updateEntry, deleteEntry, restoreEntry, live, entriesForDay, dayTotal,
  recentLabels, series, recentAverage, daySummaries, backupDue, dayRows, mealParts,
} from '../../src/lib/log.js';

const DAY = 86_400_000;
let n = 0;
const mk = (day, halves, label = '', ts = Date.parse(`${day}T12:00:00Z`) + n++, extra = {}) =>
  ({ id: `e${n}`, day, ts, halves, label, updatedAt: ts, ...extra });

describe('createEntry', () => {
  it('builds a normalized entry', () => {
    const e = createEntry({ halves: 3, label: '  Latte ', day: '2026-11-03', now: 1000, id: 'a' });
    expect(e).toEqual({ id: 'a', day: '2026-11-03', ts: 1000, halves: 3, label: 'Latte', updatedAt: 1000 });
  });
  it('clamps the amount and caps the label', () => {
    const e = createEntry({ halves: 0, label: 'x'.repeat(300), day: '2026-11-03', now: 1, id: 'b' });
    expect(e.halves).toBe(1);
    expect(e.label).toHaveLength(200);
  });
  it('generates an id when none is given', () => {
    expect(createEntry({ halves: 2, day: '2026-11-03', now: 1 }).id).toMatch(/\w{8,}/);
  });
  it('can belong to a meal, whose name is cleaned like a label', () => {
    const e = createEntry({ halves: 4, label: 'Rice', day: '2026-11-03', now: 1, id: 'a', meal: { id: 'm1', name: '  Dinner ' } });
    expect(e.meal).toEqual({ id: 'm1', name: 'Dinner' });
    expect(createEntry({ halves: 4, day: '2026-11-03', now: 1, meal: { id: 'm1' } }).meal).toEqual({ id: 'm1', name: '' });
  });
});

describe('edit, delete, restore', () => {
  const base = [mk('2026-11-03', 2, 'Toast')];
  const id = base[0].id;

  it('addEntry appends without mutating', () => {
    const e = mk('2026-11-03', 1);
    const next = addEntry(base, e);
    expect(next).toHaveLength(2);
    expect(base).toHaveLength(1);
  });

  it('updateEntry changes amount, label and day and bumps updatedAt', () => {
    const [e] = updateEntry(base, id, { halves: 5, label: ' Jam toast ', day: '2026-11-01' }, 9e12);
    expect(e).toMatchObject({ halves: 5, label: 'Jam toast', day: '2026-11-01', updatedAt: 9e12, ts: base[0].ts });
  });

  it('updateEntry ignores invalid days and unknown fields', () => {
    const [e] = updateEntry(base, id, { day: 'nope', id: 'zzz', ts: 1 }, 9e12);
    expect(e).toMatchObject({ id, day: '2026-11-03', ts: base[0].ts });
  });

  it('deleteEntry leaves a marker that restoreEntry clears', () => {
    const deleted = deleteEntry(base, id, 9e12);
    expect(deleted[0]).toMatchObject({ deleted: true, updatedAt: 9e12 });
    expect(live(deleted)).toEqual([]);
    const restored = restoreEntry(deleted, id, 9e12 + 1);
    expect(restored[0].deleted).toBeUndefined();
    expect(restored[0].updatedAt).toBe(9e12 + 1);
    expect(live(restored)).toHaveLength(1);
  });

  it('unknown ids are a no-op', () => expect(updateEntry(base, 'missing', { halves: 9 }, 1)).toEqual(base));

  it('updateEntry renames the meal an entry belongs to, and leaves plain entries alone', () => {
    const parts = [mk('2026-11-03', 2, 'Rice', 1, { meal: { id: 'm', name: 'Dinner' } }), mk('2026-11-03', 2, 'Tea')];
    const [rice, tea] = parts.reduce((es, e) => updateEntry(es, e.id, { mealName: '  Supper ' }, 9e12), parts);
    expect(rice.meal).toEqual({ id: 'm', name: 'Supper' });
    expect(tea.meal).toBeUndefined();
  });
});

describe('day views', () => {
  const entries = [
    mk('2026-11-03', 2, 'B', 300),
    mk('2026-11-03', 3, 'A', 100),
    mk('2026-11-02', 4, 'C', 50),
    mk('2026-11-03', 6, 'Gone', 200, { deleted: true }),
  ];

  it('entriesForDay lists live entries oldest first', () => {
    expect(entriesForDay(entries, '2026-11-03').map((e) => e.label)).toEqual(['A', 'B']);
  });

  it('dayTotal skips deleted entries', () => {
    expect(dayTotal(entries, '2026-11-03')).toBe(5);
    expect(dayTotal(entries, '2026-11-01')).toBe(0);
  });

  it('daySummaries counts a meal once, however many parts it has', () => {
    const meal = { id: 'm', name: 'Dinner' };
    const withMeal = [...entries, mk('2026-11-02', 2, 'Rice', 60, { meal }), mk('2026-11-02', 3, 'Fish', 61, { meal })];
    expect(daySummaries(withMeal)[1]).toEqual({ day: '2026-11-02', halves: 9, count: 2 });
  });

  it('daySummaries lists days with entries, newest first', () => {
    expect(daySummaries(entries)).toEqual([
      { day: '2026-11-03', halves: 5, count: 2 },
      { day: '2026-11-02', halves: 4, count: 1 },
    ]);
  });
});

describe('meals', () => {
  const meal = (id, name, updatedAt) => ({ meal: { id, name }, updatedAt });
  const entries = [
    mk('2026-11-03', 2, 'Tea', 100),
    mk('2026-11-03', 4, 'Rice', 200, meal('m1', 'Dinner', 200)),
    mk('2026-11-03', 6, 'Chicken', 200, meal('m1', 'Supper', 300)), // renamed later elsewhere
    mk('2026-11-03', 2, 'Salad', 200, { ...meal('m1', 'Dinner', 250), deleted: true }),
    mk('2026-11-03', 1, 'Cookie', 150),
    mk('2026-11-02', 3, 'Soup', 50, meal('m2', '', 50)),
    mk('2026-11-03', 2, 'Gone', 400, { ...meal('m3', 'Lunch', 400), deleted: true }),
  ];

  it('dayRows lists plain entries and meals in the order they were logged, one row per meal', () => {
    const rows = dayRows(entries, '2026-11-03');
    expect(rows.map((r) => (r.type === 'meal' ? `${r.name}: ${r.parts.map((p) => p.label).join(', ')}` : r.entry.label)))
      .toEqual(['Tea', 'Cookie', 'Supper: Rice, Chicken']);
    expect(rows[2]).toMatchObject({ type: 'meal', id: 'm1', day: '2026-11-03', ts: 200, halves: 10 });
  });

  it('dayRows names a meal after its most recently changed part, and skips meals with nothing left', () => {
    expect(dayRows(entries, '2026-11-03').find((r) => r.type === 'meal').name).toBe('Supper');
    expect(dayRows(entries, '2026-11-02')).toMatchObject([{ type: 'meal', id: 'm2', name: '', halves: 3 }]);
  });

  it('mealParts lists a meal’s live parts on a day, in order', () => {
    expect(mealParts(entries, 'm1', '2026-11-03').map((e) => e.label)).toEqual(['Rice', 'Chicken']);
    expect(mealParts(entries, 'm1', '2026-11-02')).toEqual([]);
  });
});

describe('recentLabels', () => {
  it('returns distinct labels, most recent first, with the amount last used', () => {
    const entries = [
      mk('2026-11-01', 2, 'Latte', 100),
      mk('2026-11-02', 3, 'latte', 200),
      mk('2026-11-02', 4, 'Pizza slice', 150),
      mk('2026-11-03', 1, '', 300),
      mk('2026-11-03', 1, 'Old news', 400, { deleted: true }),
    ];
    expect(recentLabels(entries)).toEqual([
      { label: 'latte', halves: 3 },
      { label: 'Pizza slice', halves: 4 },
    ]);
  });

  it('caps the list', () => {
    const entries = Array.from({ length: 12 }, (_, i) => mk('2026-11-03', 2, `Food ${i}`, i));
    expect(recentLabels(entries, 8)).toHaveLength(8);
    expect(recentLabels(entries, 8)[0].label).toBe('Food 11');
  });
});

describe('series and recentAverage', () => {
  const entries = [mk('2026-11-03', 10), mk('2026-11-02', 30), mk('2026-11-02', 2), mk('2026-10-30', 20), mk('2026-10-20', 99)];

  it('series covers n days ending on endDay, zeros included, oldest first', () => {
    expect(series(entries, '2026-11-03', 5)).toEqual([
      { day: '2026-10-30', halves: 20 },
      { day: '2026-10-31', halves: 0 },
      { day: '2026-11-01', halves: 0 },
      { day: '2026-11-02', halves: 32 },
      { day: '2026-11-03', halves: 10 },
    ]);
  });

  it('recentAverage averages the logged days in the 7 days before today', () => {
    expect(recentAverage(entries, '2026-11-03')).toEqual({ halves: 26, days: 2 });
  });

  it('recentAverage is null with nothing logged', () => {
    expect(recentAverage([mk('2026-11-03', 4)], '2026-11-03')).toBeNull();
  });
});

describe('backupDue', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const e = (ts, extra) => mk('2026-11-01', 2, '', ts, extra);

  it('is false with no entries', () => expect(backupDue([], null, now)).toBe(false));
  it('is false when nothing changed since the last export', () => {
    expect(backupDue([e(now - 30 * DAY)], now - 20 * DAY, now)).toBe(false);
  });
  it('is true when there are changes and the last export is a week old', () => {
    expect(backupDue([e(now - DAY)], now - 7 * DAY, now)).toBe(true);
    expect(backupDue([e(now - DAY)], now - 6 * DAY, now)).toBe(false);
  });
  it('without an export, counts from the first entry', () => {
    expect(backupDue([e(now - 8 * DAY), e(now)], null, now)).toBe(true);
    expect(backupDue([e(now - 2 * DAY)], null, now)).toBe(false);
  });
  it('counts deletes as changes', () => {
    expect(backupDue([e(now - 30 * DAY, { deleted: true, updatedAt: now - DAY })], now - 10 * DAY, now)).toBe(true);
  });
});
