import { describe, it, expect } from 'vitest';
import { formatHalves, clampHalves, bananaRow, MAX_HALVES, QUICK_HALVES } from '../../src/lib/units.js';

describe('formatHalves', () => {
  it.each([[0, '0'], [1, '½'], [2, '1'], [3, '1½'], [4, '2'], [37, '18½']])('%i → %s', (h, s) => expect(formatHalves(h)).toBe(s));
});

describe('clampHalves', () => {
  it('rounds to a whole number of halves within 1..MAX', () => {
    expect(clampHalves(2.6)).toBe(3);
    expect(clampHalves(0)).toBe(1);
    expect(clampHalves(-4)).toBe(1);
    expect(clampHalves(MAX_HALVES + 5)).toBe(MAX_HALVES);
    expect(clampHalves('x')).toBe(1);
  });
});

it('quick-add amounts are ½ 1 1½ 2 3', () => expect(QUICK_HALVES.map(formatHalves)).toEqual(['½', '1', '1½', '2', '3']));

describe('bananaRow', () => {
  const fills = (row) => row.icons.map((i) => `${i.fill}${i.over ? '!' : ''}`).join(' ');

  it('without a target shows one icon per banana eaten', () => {
    expect(fills(bananaRow(5, null))).toBe('2 2 1');
    expect(bananaRow(0, null).icons).toEqual([]);
  });

  it('with a target shows the target, filled up to the total', () => {
    expect(fills(bananaRow(3, 8))).toBe('2 1 0 0');
  });

  it('marks bananas past the target as over', () => {
    expect(fills(bananaRow(11, 8))).toBe('2 2 2 2 2! 1!');
  });

  it('handles a half-banana target', () => {
    expect(fills(bananaRow(4, 5))).toBe('2 2 0');
  });

  it('caps the icons and reports the rest', () => {
    const row = bananaRow(100, null, 40);
    expect(row.icons).toHaveLength(40);
    expect(row.more).toBe(10);
  });
});
