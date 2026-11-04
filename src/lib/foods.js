import { ALIASES, PINS } from './food-aliases.js';

const STOP = new Set(['and', 'with', 'or', 'of', 'a', 'an', 'the', 'in', 'on']);

export function normalize(s) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const content = (words) => words.filter((w) => !STOP.has(w));
// Singular forms of a plural query word; these must match a whole word ("tacos" → "taco", not "fries" → "fried").
function singular(t) {
  if (t.length < 4 || !t.endsWith('s')) return [];
  if (t.endsWith('ies')) return [`${t.slice(0, -3)}y`];
  return t.endsWith('es') ? [t.slice(0, -1), t.slice(0, -2)] : [t.slice(0, -1)];
}

function normalizeKeys(map) {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [normalize(k), v]));
}

// data: the build output, { foods: [[code, name, [[label, halves, typical?], …]], …] }.
export function prepareFoods(data, { aliases = ALIASES, pins = PINS } = {}) {
  const foods = data.foods.map(([code, name, portions]) => {
    const words = normalize(name).split(' ');
    return {
      code,
      name,
      portions: portions.map(([label, halves, typical]) => ({ label, halves, typical: typical === 1 })),
      words,
      first: content(normalize(name.split(',')[0]).split(' ')).join(' '),
      segments: name.split(',').length,
    };
  });
  const aliasMap = Object.fromEntries(Object.entries(normalizeKeys(aliases)).map(([k, v]) => [k, normalize(v)]));
  return { foods, aliases: aliasMap, pins: normalizeKeys(pins) };
}

function tokenMatches(words, t) {
  const forms = singular(t);
  return words.some((w) => w.startsWith(t) || forms.includes(w));
}

function expand(q, aliases) {
  if (aliases[q]) return aliases[q];
  return q.split(' ').map((t) => aliases[t] ?? singular(t).map((s) => aliases[s]).find(Boolean) ?? t).join(' ');
}

function match(index, phrase, pinned, exclude) {
  const all = phrase.split(' ');
  const tokens = content(all).length ? content(all) : all;
  const joined = tokens.join(' ');
  const hits = [];
  for (const f of index.foods) {
    if (exclude.has(f) || !tokens.every((t) => tokenMatches(f.words, t))) continue;
    const pin = pinned.indexOf(f.code);
    const start = f.first === joined || singular(joined).includes(f.first) ? 0
      : f.first.startsWith(joined) ? 1
      : tokenMatches([f.words[0]], tokens[0]) ? 2 : 3;
    hits.push({ f, key: [pin === -1 ? Infinity : pin, start, f.segments, f.name.length] });
  }
  hits.sort((a, b) => {
    for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
    return 0;
  });
  return hits.map((h) => h.f);
}

// Matches the alias-expanded query first, then the literal one, so "soda" lists soft drinks before Irish soda bread.
export function searchFoods(index, query, { limit = 30 } = {}) {
  const q = normalize(query);
  if (!q) return { results: [], total: 0 };
  const expanded = expand(q, index.aliases);
  const pinned = index.pins[q] ?? index.pins[expanded] ?? [];
  const seen = new Set();
  const groups = [expanded, q].filter((p, i, a) => a.indexOf(p) === i).map((p) => {
    const g = match(index, p, pinned, seen);
    g.forEach((f) => seen.add(f));
    return g;
  });
  const all = groups.flat();
  return { results: all.slice(0, limit).map(({ code, name, portions }) => ({ code, name, portions })), total: all.length };
}
