// Hand-kept search helpers for the FNDDS food list (src/data/foods.json).
// ALIASES rewrite everyday words into FNDDS's vocabulary. A key is a whole query or a single word;
// the alias results come first and the literal query is still searched after ("spaghetti squash" still works).
// PINS put specific foods (FNDDS food codes) first for a whole query; a pinned food must also match the query.
// tests/lib/foods-data.test.js checks every pinned code exists and pins the expected top results.

export const ALIASES = {
  donut: 'doughnut',
  coke: 'soft drink cola',
  pepsi: 'soft drink cola',
  cola: 'soft drink cola',
  soda: 'soft drink',
  pop: 'soft drink',
  sprite: 'soft drink fruit flavored caffeine free',
  '7up': 'soft drink fruit flavored caffeine free',
  'dr pepper': 'soft drink pepper type',
  boba: 'tea bubble',
  'bubble tea': 'tea bubble',
  ipa: 'beer',
  lager: 'beer',
  'cold brew': 'iced coffee',
  frappuccino: 'frozen coffee drink',
  frappe: 'frozen coffee drink',
  milkshake: 'milk shake',
  'hot cocoa': 'hot chocolate',
  'mac and cheese': 'macaroni noodles cheese',
  'mac n cheese': 'macaroni noodles cheese',
  'macaroni and cheese': 'macaroni noodles cheese',
  'pb and j': 'peanut butter jelly sandwich',
  pbj: 'peanut butter jelly sandwich',
  blt: 'bacon lettuce tomato sandwich',
  oj: 'orange juice',
  fries: 'french fries',
  chips: 'potato chips',
  burger: 'hamburger',
  spaghetti: 'pasta tomato sauce',
  shawarma: 'gyro',
  kebab: 'shish kabob',
  kabob: 'shish kabob',
  'tikka masala': 'chicken curry',
  'chicken tikka masala': 'chicken curry',
  'fried chicken': 'chicken fried coated',
  'fried egg': 'egg whole fried',
  'hard boiled egg': 'egg boiled',
  'white rice': 'rice white cooked',
  'brown rice': 'rice brown cooked',
};

export const PINS = {
  wine: [93401010, 93401020], // red, white
  coffee: [92101000, 92101900], // brewed, latte
  tea: [92302000], // hot black tea
  soda: [92410310], // cola
  juice: [61210000], // orange juice
  egg: [31105005, 31103010, 32129990], // fried, boiled, scrambled
  eggs: [31105005, 31103010, 32129990],
  toast: [51000110], // bread, toasted
  salad: [75143000, 72116150], // lettuce salad, Caesar
  salmon: [26137110],
  pizza: [58106210, 58106540], // cheese, pepperoni (restaurant)
  rice: [56205001, 56205011, 58150310], // white, brown, fried
  chicken: [24123301, 24107070, 24198729], // grilled breast, fried, nuggets
  'chicken breast': [24123301],
  'fried chicken': [24107070],
  fries: [71401030, 71400990], // fast food, generic
  chips: [71200010], // potato chips
  burger: [27510521], // hamburger
  spaghetti: [58146221, 58146222], // pasta with tomato sauce, restaurant / home
};
