import { describe, it, expect } from 'vitest';
import data from '../../src/data/foods.json';
import { prepareFoods, searchFoods } from '../../src/lib/foods.js';
import { PINS } from '../../src/lib/food-aliases.js';

const index = prepareFoods(data);
const top = (q) => searchFoods(index, q, { limit: 1 }).results[0]?.name;

describe('src/data/foods.json', () => {
  it('credits its source', () => expect(data.source).toMatch(/USDA FoodData Central.*FNDDS/));

  it('has thousands of foods, each with sane portions', () => {
    expect(data.foods.length).toBeGreaterThan(5000);
    for (const [code, name, portions] of data.foods) {
      expect(Number.isInteger(code), name).toBe(true);
      expect(portions.length, name).toBeGreaterThan(0);
      expect(portions.length, name).toBeLessThanOrEqual(4);
      expect(portions.filter((p) => p[2] === 1).length, name).toBeLessThanOrEqual(1);
      for (const [label, halves] of portions) {
        expect(label, name).toBeTruthy();
        expect(Number.isInteger(halves) && halves >= 0 && halves < 400, `${name}: ${label}`).toBe(true);
      }
    }
  });

  it('has unique names and codes', () => {
    expect(new Set(data.foods.map((f) => f[1].toLowerCase())).size).toBe(data.foods.length);
    expect(new Set(data.foods.map((f) => f[0])).size).toBe(data.foods.length);
  });
});

describe('pins and aliases against the real list', () => {
  it('every pinned food exists and comes up, in order, for its query', () => {
    for (const [q, codes] of Object.entries(PINS)) {
      const got = searchFoods(index, q, { limit: codes.length }).results.map((f) => f.code);
      expect(got, q).toEqual(codes);
    }
  });

  it.each([
    ['latte', 'Coffee, Latte'],
    ['bagel', 'Bagel'],
    ['burrito', 'Burrito'],
    ['big mac', 'Big Mac (McDonalds)'],
    ['banana', 'Banana, raw'],
    ['apple', 'Apple, raw'],
    ['beer', 'Beer'],
    ['ipa', 'Beer'],
    ['donut', 'Doughnut'],
    ['donuts', 'Doughnut'],
    ['coke', 'Soft drink, cola'],
    ['boba', 'Tea, bubble'],
    ['cold brew', 'Iced Coffee, brewed'],
    ['mac and cheese', 'Macaroni or noodles with cheese'],
    ['pb&j', 'Peanut butter and jelly sandwich'],
    ['french toast', 'French toast'],
    ['sweet potato fries', 'Sweet potato fries'],
    ['spaghetti squash', 'Spaghetti squash, cooked'],
    ['tacos', 'Taco'],
    ['hard boiled egg', 'Egg, whole, boiled or poached'],
    ['steak', 'Steak'],
    ['bacon', 'Bacon, cooked'],
  ])('%s → %s', (q, name) => expect(top(q)).toBe(name));
});
