import { h } from './dom.js';
import { banana } from './banana.js';
import { formatHalves, bananaRow, bananaWord } from '../lib/units.js';
import { searchFoods } from '../lib/foods.js';

export const LIMIT = 30;
const EXAMPLES = ['bagel', 'burrito', 'latte', 'pizza', 'beer', 'salad'];
const MINI_CAP = 10;

const amount = (halves) => (halves === 0 ? '<½' : formatHalves(halves));

// A portion with bananas is a button that puts them on the plate; one that rounds to nothing is just shown.
function portion(food, { label, halves, typical }, actions) {
  const { icons } = bananaRow(halves, null, MINI_CAP);
  const parts = [
    h('span', { class: 'p-label' }, label),
    typical && h('span', { class: 'tag' }, 'typical'),
    h('span', { class: 'p-mini', 'aria-hidden': 'true' }, icons.map(({ fill }) => banana(fill))),
    h('span', { class: 'p-amount', 'aria-label': halves === 0 ? 'under half a banana' : null }, amount(halves)),
  ];
  const row = halves === 0
    ? h('div', { class: 'portion-row' }, parts, h('span', { class: 'p-plus', 'aria-hidden': 'true' }))
    : h('button', {
      type: 'button', class: 'portion-row portion-add', onclick: () => actions.addFromLookup(halves),
      'aria-label': `Add ${formatHalves(halves)} ${bananaWord(halves)} to the plate (${food.name}, ${label})`,
    }, parts, h('span', { class: 'p-plus', 'aria-hidden': 'true' }, '+'));
  return h('li', { class: `portion${typical ? ' typical' : ''}` }, row);
}

function results(index, query, actions) {
  const { results: found, total } = searchFoods(index, query, { limit: LIMIT });
  if (!found.length) return h('p', { class: 'no-results' }, `No match for “${query.trim()}”. Try a simpler word.`);
  return [
    h('ol', { class: 'foods' }, found.map((f) => h('li', { class: 'food' },
      h('p', { class: 'food-name' }, f.name),
      h('ul', { class: 'portions' }, f.portions.map((p) => portion(f, p, actions)))))),
    total > found.length && h('p', { class: 'lookup-more' }, `Showing ${found.length} of ${total}. Add a word to narrow it down.`),
  ];
}

export function renderLookup({ state, foodIndex, actions }) {
  const { query, status } = state.lookup;
  let body;
  if (status === 'error') {
    body = h('div', { class: 'lookup-status', role: 'alert' },
      h('p', {}, 'Couldn’t load the food list.'),
      h('button', { type: 'button', class: 'btn', onclick: actions.loadFoods }, 'Try again'));
  } else if (status !== 'ready') {
    body = h('p', { class: 'lookup-status' }, 'Loading foods…');
  } else if (!query.trim()) {
    body = h('div', { class: 'lookup-idle' },
      h('p', { class: 'lookup-hint' }, 'Search a food to see about how many bananas it is. Tap a portion to put it on your plate.'),
      h('div', { class: 'examples' }, EXAMPLES.map((q) => h('button', { type: 'button', class: 'chip', onclick: () => actions.setLookupQuery(q) }, q))));
  } else {
    body = results(foodIndex, query, actions);
  }

  return [
    h('h1', {}, 'Look up'),
    h('form', { class: 'lookup-form', role: 'search', onsubmit: (e) => { e.preventDefault(); e.target.querySelector('input')?.blur(); } },
      h('label', { class: 'sr-only', for: 'lookup' }, 'Search foods'),
      h('input', {
        id: 'lookup', 'data-focus': 'lookup', type: 'search', value: query, placeholder: 'Search foods', autocomplete: 'off',
        autocapitalize: 'off', enterkeyhint: 'search', spellcheck: 'false', oninput: (e) => actions.setLookupQuery(e.target.value),
      })),
    h('section', { class: 'lookup-body', 'aria-live': 'polite' }, body),
    h('p', { class: 'credit' }, 'Estimates from USDA FoodData Central (FNDDS 2021–2023), rounded to the nearest ½ banana. Restaurant portions often run bigger.'),
  ];
}
