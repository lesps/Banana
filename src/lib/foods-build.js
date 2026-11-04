// Turns USDA FNDDS "survey foods" JSON into the compact reference list the Look up tab searches.
// Build-time only (scripts/build-foods.mjs); the app imports the output, src/data/foods.json.

export const SOURCE = 'USDA FoodData Central, FNDDS 2021–2023 (survey foods). Public domain.';

const ENERGY_KCAL = 1008;
const TYPICAL = 'Quantity not specified';
const EXCLUDE_CATEGORY = /^(Baby |Formula|Human milk|Not included|Tap water|Bottled water)/;
// Units people don't estimate a meal in.
const DROP_PORTION = /cubic inch|surface inch|oz yields|^1 teaspoon\b|^1 fl oz\b|^1 oz\b|^1 gram\b|^1 drop\b|^1 dash\b|^1 pinch\b/i;
const MAX_PORTIONS = 4;
const OPEN_ENDED_NS = /^(fresh|light)$/;

export function cleanName(desc) {
  return desc
    .replace(/,\s*NFS\b/g, '')
    // "NS as to …" (not specified) phrases end at the next comma, except two that run on past it
    // ("NS as to fresh, smoked or cured"), which stay.
    .replace(/,\s*NS as to ([^,]*)/g, (m, what) => (OPEN_ENDED_NS.test(what) ? m : ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function portionLabel(desc) {
  return desc
    .replace(/^1 (?=\S)/, '')
    .replace(/^Guideline amount /i, '')
    .replace(/,\s*(NFS|any size)\b/g, '')
    .trim();
}

const kcalPer100g = (f) => f.foodNutrients?.find((n) => n.nutrient?.id === ENERGY_KCAL)?.amount;

function portions(f, kcal) {
  const toHalves = (g) => Math.round((kcal * g) / 100 / 50);
  let typical = null;
  const named = [];
  for (const p of f.foodPortions ?? []) {
    const g = p.gramWeight;
    if (!(g > 0)) continue;
    if (p.portionDescription === TYPICAL) typical = g;
    else if (!DROP_PORTION.test(p.portionDescription)) named.push({ label: portionLabel(p.portionDescription), g });
  }
  named.sort((a, b) => a.g - b.g);
  // Fold the typical serving into a named portion of the same weight, else list it as "serving".
  let t = typical == null ? null : named.find((p) => Math.abs(p.g - typical) < 0.5);
  if (typical != null && !t) {
    t = { label: 'serving', g: typical };
    named.push(t);
    named.sort((a, b) => a.g - b.g);
  }
  const seen = new Set();
  const kept = [];
  for (const p of named) {
    const halves = toHalves(p.g);
    const key = `${p.label.toLowerCase()}|${halves}`;
    if (seen.has(key) || (halves === 0 && p !== t)) continue;
    seen.add(key);
    kept.push({ ...p, halves, typical: p === t });
  }
  let out = kept;
  if (kept.length > MAX_PORTIONS) {
    const ti = Math.max(0, kept.findIndex((p) => p.typical));
    const keep = new Set(kept.map((_, j) => j).sort((a, b) => (a === ti ? -1 : b === ti ? 1 : Math.abs(a - ti) - Math.abs(b - ti) || a - b)).slice(0, MAX_PORTIONS));
    out = kept.filter((_, j) => keep.has(j));
  }
  return out.map((p) => (p.typical ? [p.label, p.halves, 1] : [p.label, p.halves]));
}

// → { source, foods: [[foodCode, name, [[portion, halves, typical?], …]], …], skipped }
export function buildFoods(fndds) {
  const skipped = { category: 0, 'no calories': 0, 'no portions': 0, duplicate: 0 };
  const names = new Set();
  const foods = [];
  for (const f of fndds.SurveyFoods ?? []) {
    if (EXCLUDE_CATEGORY.test(f.wweiaFoodCategory?.wweiaFoodCategoryDescription ?? '')) { skipped.category += 1; continue; }
    const kcal = kcalPer100g(f);
    if (kcal == null) { skipped['no calories'] += 1; continue; }
    const ps = portions(f, kcal);
    if (!ps.length) { skipped['no portions'] += 1; continue; }
    const name = cleanName(f.description);
    const key = name.toLowerCase();
    if (names.has(key)) { skipped.duplicate += 1; continue; }
    names.add(key);
    foods.push([Number(f.foodCode), name, ps]);
  }
  return { source: SOURCE, foods, skipped };
}
