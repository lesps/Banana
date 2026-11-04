import { describe, it, expect } from 'vitest';
import { buildFoods, cleanName, portionLabel } from '../../src/lib/foods-build.js';

let code = 10000000;
const food = (description, kcal, portions, category = 'Pizza') => ({
  description,
  foodCode: String(code++),
  wweiaFoodCategory: { wweiaFoodCategoryDescription: category },
  foodNutrients: kcal == null ? [] : [{ nutrient: { id: 1008, unitName: 'kcal' }, amount: kcal }],
  foodPortions: portions.map(([portionDescription, gramWeight]) => ({ portionDescription, gramWeight })),
});
const fndds = (...foods) => ({ SurveyFoods: foods });

describe('cleanName', () => {
  it('drops "not further specified" markers', () => {
    expect(cleanName('Yogurt, NFS')).toBe('Yogurt');
    expect(cleanName('Potato, french fries, NFS')).toBe('Potato, french fries');
    expect(cleanName('Coffee, NS as to type')).toBe('Coffee');
    expect(cleanName('Bacon, NS as to type of meat, cooked')).toBe('Bacon, cooked');
    expect(cleanName('Steak, NS as to type of meat, NS as to fat eaten')).toBe('Steak');
  });

  it('leaves the "NS as to" phrases that run past a comma alone', () => {
    const s = 'Pork bacon, NS as to fresh, smoked or cured, cooked';
    expect(cleanName(s)).toBe(s);
  });
});

describe('portionLabel', () => {
  it.each([
    ['1 cup', 'cup'],
    ['1 large', 'large'],
    ['1 cup, NFS', 'cup'],
    ['1 slice, any size', 'slice'],
    ['1 can or bottle (12 fl oz)', 'can or bottle (12 fl oz)'],
    ['12 fl oz', '12 fl oz'],
    ['1/2 slice', '1/2 slice'],
    ['Guideline amount per slice of bread/roll', 'per slice of bread/roll'],
  ])('%s → %s', (raw, label) => expect(portionLabel(raw)).toBe(label));
});

describe('buildFoods', () => {
  it('converts portions to half-bananas and marks the typical serving', () => {
    const { foods } = buildFoods(fndds(food('Bagel', 250, [['1 mini', 26], ['1 regular', 105], ['Quantity not specified', 105], ['1 large', 131]])));
    expect(foods).toEqual([[10000000, 'Bagel', [['mini', 1], ['regular', 5, 1], ['large', 7]]]]);
  });

  it('adds the typical serving as "serving" when no named portion matches it', () => {
    const [[, , portions]] = buildFoods(fndds(food('Sushi', 150, [['1 piece', 30], ['Quantity not specified', 160]]))).foods;
    expect(portions).toEqual([['piece', 1], ['serving', 5, 1]]);
  });

  it('drops units nobody estimates in, and zero portions other than the typical one', () => {
    const [[, , portions]] = buildFoods(fndds(food('Cake', 400, [
      ['1 cubic inch', 6], ['1 surface inch', 4], ['1 oz yields', 30], ['1 teaspoon', 4], ['1 fl oz', 30], ['1 oz', 28],
      ['1 crumb', 0.5], ['1 piece', 80], ['Quantity not specified', 80],
    ]))).foods;
    expect(portions).toEqual([['piece', 6, 1]]);
  });

  it('keeps a zero typical serving so the reference can say "under ½"', () => {
    const [[, , portions]] = buildFoods(fndds(food('Coffee, brewed', 1, [['1 cup', 237], ['Quantity not specified', 237]]))).foods;
    expect(portions).toEqual([['cup', 0, 1]]);
  });

  it('keeps the typical serving plus the three portions closest to it in size', () => {
    const sizes = [['1 bite', 10], ['1 mini', 30], ['1 small', 60], ['1 regular', 100], ['Quantity not specified', 100], ['1 large', 140], ['1 jumbo', 200], ['1 tray', 900]];
    const [[, , portions]] = buildFoods(fndds(food('Burrito', 200, sizes))).foods;
    expect(portions.map((p) => p[0])).toEqual(['mini', 'small', 'regular', 'large']);
  });

  it('removes duplicate portions', () => {
    const [[, , portions]] = buildFoods(fndds(food('Taco', 200, [['1 taco', 100], ['1 small/regular', 100], ['1 taco', 100], ['Quantity not specified', 100]]))).foods;
    expect(portions).toEqual([['taco', 4, 1], ['small/regular', 4]]);
  });

  it('skips baby food, formula, ingredient-only entries, water and foods without calories', () => {
    const { foods, skipped } = buildFoods(fndds(
      food('Baby Toddler cereal', 400, [['1 tablespoon', 4]], 'Baby food: cereals'),
      food('Infant formula', 70, [['1 fl oz', 30]], 'Formula, ready-to-feed'),
      food('Cheese as ingredient in sandwiches', 350, [['1 slice', 20]], 'Not included in a food category'),
      food('Water, tap', 0, [['1 cup', 237]], 'Tap water'),
      food('Mystery', null, [['1 cup', 100]]),
      food('Pizza, cheese', 270, [['1 slice', 110], ['Quantity not specified', 110]]),
    ));
    expect(foods.map((f) => f[1])).toEqual(['Pizza, cheese']);
    expect(skipped).toEqual({ category: 4, 'no calories': 1, 'no portions': 0, duplicate: 0 });
  });

  it('keeps the first of two foods whose cleaned names collide', () => {
    const { foods, skipped } = buildFoods(fndds(
      food('Yogurt, NFS', 80, [['1 container', 170], ['Quantity not specified', 170]], 'Yogurt, regular'),
      food('Yogurt, NS as to type of milk or flavor', 80, [['1 cup', 245], ['Quantity not specified', 170]], 'Yogurt, regular'),
    ));
    expect(foods.map((f) => f[1])).toEqual(['Yogurt']);
    expect(skipped.duplicate).toBe(1);
  });

  it('records the source', () => {
    expect(buildFoods(fndds()).source).toMatch(/USDA FoodData Central/);
  });
});
