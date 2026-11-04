import { describe, it, expect } from 'vitest';
import { plateTotal, addToPlate, undoPlate, plateLabel, formatPlate, sanitizePlate } from '../../src/lib/plate.js';

const p = (...items) => items.map((x) => (Array.isArray(x) ? { halves: x[0], label: x[1] } : { halves: x }));

describe('plate', () => {
  it('adds up', () => {
    expect(plateTotal([])).toBe(0);
    expect(plateTotal(p(2, 4, 1))).toBe(7);
  });

  it('adds an item without mutating, keeping a label only when there is one', () => {
    const start = p(2);
    const next = addToPlate(start, 3, '  Croissant ');
    expect(next).toEqual([{ halves: 2 }, { halves: 3, label: 'Croissant' }]);
    expect(start).toHaveLength(1);
    expect(addToPlate([], 2, '')).toEqual([{ halves: 2 }]);
  });

  it('refuses to go past 100 bananas', () => {
    expect(addToPlate(p(196), 4)).toHaveLength(2);
    expect(addToPlate(p(196), 6)).toBeNull();
  });

  it('removes the last item', () => {
    expect(undoPlate(p(2, 4))).toEqual(p(2));
    expect(undoPlate([])).toEqual([]);
  });

  it('labels a meal from its chips, without repeats', () => {
    expect(plateLabel(p([2, 'Latte'], 1, [6, 'Croissant'], [2, 'latte']))).toBe('Latte + Croissant');
    expect(plateLabel(p(2, 4))).toBe('');
  });

  it('shows the sum', () => {
    expect(formatPlate([])).toBe('');
    expect(formatPlate(p(3))).toBe('1½');
    expect(formatPlate(p(2, 4, 1))).toBe('1 + 2 + ½ = 3½');
    expect(formatPlate(p(2, 2, 2, 2, 2, 2, 2))).toBe('… + 1 + 1 + 1 + 1 + 1 = 7');
  });

  it('reads back a stored plate, dropping anything invalid', () => {
    expect(sanitizePlate([{ halves: 2 }, { halves: 0 }, { halves: 2.5 }, null, { halves: 4, label: 'Soup' }, { halves: 1, label: 7 }]))
      .toEqual([{ halves: 2 }, { halves: 4, label: 'Soup' }, { halves: 1 }]);
    expect(sanitizePlate('nope')).toEqual([]);
    expect(sanitizePlate(p(150, 150))).toEqual(p(150));
  });
});
