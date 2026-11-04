// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, FOODS } from './helpers.js';

const open = async (opts) => {
  const t = mount(opts);
  t.tab('lookup');
  await t.tick();
  return t;
};
const search = (t, q) => {
  const input = t.$('#lookup');
  input.focus();
  t.type(input, q);
};
const results = (t) => t.$$('.foods .food').map((f) => [
  f.querySelector('.food-name').textContent,
  [...f.querySelectorAll('.portion')].map((p) => `${p.querySelector('.p-label').textContent} ${p.querySelector('.p-amount').textContent}${p.classList.contains('typical') ? '*' : ''}`),
]);

describe('Look up', () => {
  it('is the second tab', () => {
    const t = mount();
    expect(t.$$('.tabs button').map((b) => b.dataset.view)).toEqual(['today', 'lookup', 'history', 'settings']);
  });

  it('loads the food list the first time it opens, and only once', async () => {
    const t = mount();
    expect(t.loads).toHaveLength(0);
    t.tab('lookup');
    expect(t.$('.lookup-status').textContent).toBe('Loading foods…');
    await t.tick();
    expect(t.$('.lookup-status')).toBeNull();
    t.tab('today');
    t.tab('lookup');
    expect(t.loads).toHaveLength(1);
  });

  it('shows each match with its portions in bananas, typical first-class', async () => {
    const t = await open();
    search(t, 'bagel');
    expect(results(t)).toEqual([
      ['Bagel', ['mini ½', 'regular 2½*', 'large 3½']],
      ['Bagel, with cream cheese', ['regular 3½*']],
    ]);
    expect(t.$('.portion.typical .tag').textContent).toBe('typical');
  });

  it('draws each portion as little bananas', async () => {
    const t = await open();
    search(t, 'bagel');
    const regular = t.$$('.portion')[1];
    expect([...regular.querySelectorAll('.p-mini .b')].map((b) => b.className)).toEqual(['b f2', 'b f2', 'b f1']);
  });

  it('says "under ½" for foods that barely count', async () => {
    const t = await open();
    search(t, 'coffee brewed');
    expect(results(t)).toEqual([['Coffee, brewed', ['cup <½*']]]);
  });

  it('keeps focus in the search box while typing', async () => {
    const t = await open();
    search(t, 'bur');
    expect(document.activeElement).toBe(t.$('#lookup'));
  });

  it('keeps the search when you switch tabs', async () => {
    const t = await open();
    search(t, 'latte');
    t.tab('today');
    t.tab('lookup');
    expect(t.$('#lookup').value).toBe('latte');
    expect(results(t)[0][0]).toBe('Coffee, Latte');
  });

  it('offers example searches before you type', async () => {
    const t = await open();
    expect(t.$('.lookup-hint').textContent).toMatch(/about how many bananas/);
    t.$$('.examples button').find((b) => b.textContent === 'burrito').click();
    expect(t.$('#lookup').value).toBe('burrito');
    expect(results(t)[0][0]).toBe('Burrito');
  });

  it('says when nothing matches', async () => {
    const t = await open();
    search(t, 'zzz');
    expect(t.$('.no-results').textContent).toBe('No match for “zzz”. Try a simpler word.');
  });

  it('is reference only: nothing in the results logs anything', async () => {
    const t = await open();
    search(t, 'bagel');
    expect(t.$$('.foods button')).toHaveLength(0);
    expect(t.app.state().entries).toEqual([]);
  });

  it('renders food names as text', async () => {
    const t = await open();
    search(t, 'img');
    expect(t.$('.foods img')).toBeNull();
    expect(results(t)[0][0]).toBe(FOODS.foods[5][1]);
  });

  it('says how many matches are not shown', async () => {
    const many = { foods: Array.from({ length: 45 }, (_, i) => [i, `Cookie ${i}`, [['cookie', 2, 1]]]) };
    const t = await open({ loadFoods: () => Promise.resolve(many) });
    search(t, 'cookie');
    expect(t.$$('.foods .food')).toHaveLength(30);
    expect(t.$('.lookup-more').textContent).toBe('Showing 30 of 45. Add a word to narrow it down.');
  });

  it('shows an error with a retry when the list can’t load', async () => {
    let fail = true;
    const t = await open({ loadFoods: () => (fail ? Promise.reject(new Error('offline')) : Promise.resolve(FOODS)) });
    expect(t.$('.lookup-status').textContent).toMatch(/Couldn’t load the food list/);
    fail = false;
    t.button('Try again').click();
    await t.tick();
    search(t, 'bagel');
    expect(results(t)).toHaveLength(2);
  });

  it('credits the data source', async () => {
    const t = await open();
    expect(t.$('.credit').textContent).toMatch(/USDA FoodData Central/);
  });
});
