import { describe, it, expect } from 'vitest';
import { wedgeAngles, settle, bananaSize, pickShown, TAU, START, MIN_WEDGE } from '../../src/lib/heap.js';

const span = (w) => w.a1 - w.a0;
const close = (a, b) => Math.abs(a - b) < 1e-9;

describe('wedgeAngles', () => {
  it('a lone part gets the whole plate', () => {
    expect(wedgeAngles([5])).toEqual([{ a0: START, a1: START + TAU }]);
    expect(wedgeAngles([])).toEqual([]);
  });

  it('splits the plate in proportion, from the back, without gaps', () => {
    const w = wedgeAngles([4, 6, 2]);
    expect(w[0].a0).toBe(START);
    expect(close(w.at(-1).a1, START + TAU)).toBe(true);
    for (let i = 1; i < w.length; i++) expect(w[i].a0).toBe(w[i - 1].a1);
    expect(close(span(w[1]) / span(w[0]), 6 / 4)).toBe(true);
  });

  it('gives small and empty parts a minimum slice and shares the rest in proportion', () => {
    const w = wedgeAngles([12, 4, 3, 3, 1, 0]);
    expect(close(span(w[4]), MIN_WEDGE)).toBe(true);
    expect(close(span(w[5]), MIN_WEDGE)).toBe(true);
    expect(close(span(w[0]) / span(w[1]), 3)).toBe(true);
    expect(close(w.reduce((n, x) => n + span(x), 0), TAU)).toBe(true);
    expect(w.every((x) => span(x) >= MIN_WEDGE - 1e-9)).toBe(true);
  });

  it('shares equally when nothing is on the plate yet', () => {
    expect(wedgeAngles([0, 0]).map(span).every((s) => close(s, Math.PI))).toBe(true);
  });
});

describe('settle', () => {
  const pieces = (counts) => counts.flatMap((n, part) => Array.from({ length: n }, (_, i) => ({ key: `${part}.${i}`, kind: 'whole', part })));
  const angleIn = (x, y, { a0, a1 }) => {
    let a = Math.atan2(y, x);
    while (a < a0) a += TAU;
    while (a > a0 + TAU) a -= TAU;
    return a <= a1 + 1e-9;
  };

  it('keeps every banana in its own section and inside the well', () => {
    const counts = [6, 3, 1, 1, 0, 2];
    const wedges = wedgeAngles([12, 6, 1, 3, 0, 4]);
    const size = bananaSize(13);
    const out = settle(pieces(counts), wedges, size);
    expect(out).toHaveLength(13);
    for (const b of out) {
      expect(angleIn(b.x, b.y, wedges[Number(b.key.split('.')[0])])).toBe(true);
      expect(Math.hypot(b.x, b.y)).toBeLessThanOrEqual(1 - size * 0.3 + 1e-9);
      expect(b.z).toBeGreaterThanOrEqual(0);
    }
  });

  it('is the same every time for the same plate', () => {
    const w = wedgeAngles([8, 3]);
    expect(settle(pieces([4, 2]), w, 0.5)).toEqual(settle(pieces([4, 2]), w, 0.5));
  });

  it('heaps bananas up instead of spreading them flat', () => {
    const out = settle(pieces([10]), wedgeAngles([20]), bananaSize(10));
    expect(Math.max(...out.map((b) => b.z))).toBeGreaterThan(0);
    expect(new Set(out.map((b) => `${b.x.toFixed(3)},${b.y.toFixed(3)}`)).size).toBe(10);
  });

  it('leaves settled bananas where they are as more land on them', () => {
    const w = wedgeAngles([1]);
    const before = settle(pieces([5]), w, 0.5);
    const after = settle(pieces([6]), w, 0.5);
    expect(after.slice(0, 5)).toEqual(before);
  });

  it('lays bananas down, pointing either way', () => {
    const rots = settle(pieces([12]), wedgeAngles([1]), 0.4).map((b) => ((b.rot % 360) + 360) % 360);
    expect(rots.every((r) => (r >= 55 && r <= 125) || (r >= 235 && r <= 305))).toBe(true);
    expect(rots.some((r) => r < 180) && rots.some((r) => r > 180)).toBe(true);
  });
});

describe('bananaSize and pickShown', () => {
  it('shrinks the bananas as the plate fills', () => {
    const sizes = [1, 5, 10, 20, 40].map(bananaSize);
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
    expect(bananaSize(3)).toBe(bananaSize(4));
  });

  it('draws up to a limit, taking from every part in turn so none goes missing', () => {
    const ps = [30, 2, 20].flatMap((n, part) => Array.from({ length: n }, (_, i) => ({ key: `${part}.${i}`, part })));
    const shown = pickShown(ps, 40);
    expect(shown).toHaveLength(40);
    expect([0, 1, 2].map((p) => shown.filter((x) => x.part === p).length)).toEqual([19, 2, 19]);
    expect(shown.map((x) => ps.indexOf(x))).toEqual([...shown.map((x) => ps.indexOf(x))].sort((a, b) => a - b));
    expect(pickShown(ps.slice(0, 5), 40)).toEqual(ps.slice(0, 5));
  });
});
