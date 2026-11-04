import { describe, it, expect } from 'vitest';
import { normalize, prepareFoods, searchFoods } from '../../src/lib/foods.js';

const foods = [
  [1, 'Wine, nonalcoholic', [['glass', 0, 1]]],
  [2, 'Wine, red', [['glass', 3, 1]]],
  [3, 'Chicken nuggets, from fast food', [['nugget', 1], ['serving', 5, 1]]],
  [4, 'Chicken nuggets', [['serving', 5, 1]]],
  [5, 'Doughnut, glazed', [['doughnut', 5, 1]]],
  [6, 'Macaroni or noodles with cheese', [['cup', 7, 1]]],
  [7, 'Taco, beef', [['taco', 4, 1]]],
  [8, 'Stuffed jalapeño pepper', [['pepper', 1, 1]]],
  [9, 'Big Mac (McDonald’s)', [['sandwich', 11, 1]]],
  [10, 'Bread, Irish soda', [['slice', 4, 1]]],
  [11, 'Soft drink, cola', [['can', 3, 1]]],
  [12, 'Peanut butter and jelly sandwich', [['sandwich', 7, 1]]],
  [13, 'Eggplant, fried', [['cup', 3, 1]]],
];
const index = prepareFoods({ foods }, { aliases: { donut: 'doughnut', 'mac and cheese': 'macaroni cheese', soda: 'soft drink' }, pins: { wine: [2] } });
const names = (q, opts) => searchFoods(index, q, opts).results.map((f) => f.name);

describe('normalize', () => {
  it('lowercases, strips accents and apostrophes, and spells out &', () => {
    expect(normalize('Jalapeño')).toBe('jalapeno');
    expect(normalize('McDonald’s')).toBe('mcdonalds');
    expect(normalize("PB & J")).toBe('pb and j');
  });
});

describe('searchFoods', () => {
  it('needs every word, matched at the start of a word, in any order', () => {
    expect(names('nug chick')).toEqual(['Chicken nuggets', 'Chicken nuggets, from fast food']);
    expect(names('chicken pizza')).toEqual([]);
    expect(names('ugget')).toEqual([]);
  });

  it('ignores case, accents and apostrophes', () => {
    expect(names('JALAPENO')).toEqual(['Stuffed jalapeño pepper']);
    expect(names("mcdonald's")).toEqual(['Big Mac (McDonald’s)']);
  });

  it('matches simple plurals as whole words only', () => {
    expect(names('tacos')).toEqual(['Taco, beef']);
    expect(names('jellies')).toEqual(['Peanut butter and jelly sandwich']);
    expect(names('fries')).toEqual([]); // "frie" must not prefix-match "fried"
  });

  it('ignores filler words', () => {
    expect(names('peanut butter jelly')).toEqual(['Peanut butter and jelly sandwich']);
    expect(names('chicken and nuggets')).toHaveLength(2);
  });

  it('expands aliases, for single words and whole phrases', () => {
    expect(names('donut')).toEqual(['Doughnut, glazed']);
    expect(names('glazed donuts')).toEqual(['Doughnut, glazed']);
    expect(names('mac and cheese')).toEqual(['Macaroni or noodles with cheese']);
  });

  it('puts the matches its alias points to ahead of literal ones', () => {
    expect(names('soda')).toEqual(['Soft drink, cola', 'Bread, Irish soda']);
  });

  it('ranks pinned foods first, then names that start with the query, then shorter names', () => {
    expect(names('wine')).toEqual(['Wine, red', 'Wine, nonalcoholic']);
    expect(names('chicken')).toEqual(['Chicken nuggets', 'Chicken nuggets, from fast food']);
  });

  it('reports the total and caps the list', () => {
    const r = searchFoods(index, 'c', { limit: 2 });
    expect(r.results).toHaveLength(2);
    expect(r.total).toBeGreaterThan(2);
  });

  it('returns nothing for a blank query', () => {
    expect(searchFoods(index, '   ')).toEqual({ results: [], total: 0 });
  });

  it('exposes each food’s portions with the typical one flagged', () => {
    const [f] = searchFoods(index, 'big mac').results;
    expect(f).toMatchObject({ code: 9, name: 'Big Mac (McDonald’s)', portions: [{ label: 'sandwich', halves: 11, typical: true }] });
  });
});
