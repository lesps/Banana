// The plate: what's being put together before it's logged. A plate is { parts, active }; each part is
// { id, label?, amounts } where amounts are the half-banana amounts tapped into it, in order. Quick
// amounts go into the active part; a named amount (a recent chip, Look up, Again) starts its own.
// One filled part logs as a plain entry; several log as a meal.
import { formatHalves, MAX_HALVES } from './units.js';
import { cleanLabel } from './log.js';

export const MAX_PARTS = 8;
export const EMPTY_PLATE = Object.freeze({ parts: Object.freeze([]), active: 0 });
const SHOWN = 3; // amounts shown in the sum before it starts with …

export const partHalves = (part) => part.amounts.reduce((n, a) => n + a, 0);
export const plateTotal = (plate) => plate.parts.reduce((n, p) => n + partHalves(p), 0);
export const partName = (part, i) => part.label || `Part ${i + 1}`;

const nextId = (parts) => parts.reduce((m, p) => Math.max(m, p.id), 0) + 1;
function makePart(id, label, amounts) {
  const l = cleanLabel(label);
  return l ? { id, label: l, amounts } : { id, amounts };
}
const replacePart = (plate, i, part) => ({ ...plate, parts: plate.parts.map((p, j) => (j === i ? part : p)) });
const fits = (plate, halves) => plateTotal(plate) + halves <= MAX_HALVES;

// Each function returns a new plate, or null when it would pass 100 bananas or MAX_PARTS parts.
export function addAmount(plate, halves) {
  if (!fits(plate, halves)) return null;
  if (!plate.parts.length) return { parts: [makePart(1, '', [halves])], active: 0 };
  const p = plate.parts[plate.active];
  return replacePart(plate, plate.active, { ...p, amounts: [...p.amounts, halves] });
}

export function addPart(plate, halves, label = '') {
  if (!fits(plate, halves)) return null;
  const a = plate.parts[plate.active];
  if (a && !a.amounts.length && !a.label) return replacePart(plate, plate.active, makePart(a.id, label, [halves]));
  if (plate.parts.length >= MAX_PARTS) return null;
  return { parts: [...plate.parts, makePart(nextId(plate.parts), label, [halves])], active: plate.parts.length };
}

export function newPart(plate) {
  const empty = plate.parts.findIndex((p) => !p.amounts.length);
  if (empty >= 0) return { ...plate, active: empty };
  if (plate.parts.length >= MAX_PARTS) return null;
  return { parts: [...plate.parts, makePart(nextId(plate.parts), '', [])], active: plate.parts.length };
}

export const selectPart = (plate, i) => (i >= 0 && i < plate.parts.length ? { ...plate, active: i } : plate);

export function removePart(plate, i) {
  if (!plate.parts[i]) return plate;
  const parts = plate.parts.filter((_, j) => j !== i);
  const active = i < plate.active ? plate.active - 1 : i === plate.active ? plate.active - 1 : plate.active;
  return { parts, active: Math.min(Math.max(0, active), Math.max(0, parts.length - 1)) };
}

export function undoPlate(plate) {
  const p = plate.parts[plate.active];
  if (!p) return EMPTY_PLATE;
  if (p.amounts.length > 1) return replacePart(plate, plate.active, { ...p, amounts: p.amounts.slice(0, -1) });
  const next = removePart(plate, plate.active);
  return next.parts.length ? next : EMPTY_PLATE;
}

// From the part dialog. Changing the amount replaces the part's taps with one amount (0 empties it).
export function updatePart(plate, i, patch) {
  const p = plate.parts[i];
  if (!p) return plate;
  const amounts = patch.halves == null || patch.halves === partHalves(p) ? p.amounts : patch.halves > 0 ? [patch.halves] : [];
  if (plateTotal(plate) - partHalves(p) + amounts.reduce((n, a) => n + a, 0) > MAX_HALVES) return null;
  return replacePart(plate, i, makePart(p.id, 'label' in patch ? patch.label : p.label, amounts));
}

export const filledParts = (plate) =>
  plate.parts.filter((p) => p.amounts.length).map((p) => ({ halves: partHalves(p), label: p.label ?? '' }));

// "1 + 2 + ½ = 3½": the taps of a lone part, or each part's total once there are several.
export function formatPlate(plate) {
  const filled = plate.parts.filter((p) => p.amounts.length);
  if (!filled.length) return '';
  const amounts = filled.length === 1 ? filled[0].amounts : filled.map(partHalves);
  if (amounts.length === 1) return formatHalves(amounts[0]);
  const shown = amounts.slice(-SHOWN).map(formatHalves);
  if (amounts.length > SHOWN) shown.unshift('…');
  return `${shown.join(' + ')} = ${formatHalves(plateTotal(plate))}`;
}

export function sanitizePlate(stored) {
  if (Array.isArray(stored)) return legacyPlate(stored);
  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.parts)) return EMPTY_PLATE;
  const parts = [];
  const ids = new Set();
  let total = 0;
  for (const raw of stored.parts) {
    if (parts.length === MAX_PARTS) break;
    if (!raw || !Array.isArray(raw.amounts)) continue;
    const amounts = [];
    for (const a of raw.amounts) {
      if (!Number.isInteger(a) || a < 1 || total + a > MAX_HALVES) continue;
      amounts.push(a);
      total += a;
    }
    const id = Number.isInteger(raw.id) && raw.id > 0 && !ids.has(raw.id) ? raw.id : Math.max(0, ...ids) + 1;
    ids.add(id);
    parts.push(makePart(id, typeof raw.label === 'string' ? raw.label : '', amounts));
  }
  const active = Number.isInteger(stored.active) && stored.active >= 0 && stored.active < parts.length ? stored.active : 0;
  return parts.length ? { parts, active } : EMPTY_PLATE;
}

// Before 1.10 the plate was a flat list of { halves, label? } logged as one entry labelled with the
// chip names: keep it as one part that logs the same way.
function legacyPlate(items) {
  const amounts = [];
  const labels = new Map();
  let total = 0;
  for (const item of items) {
    const a = item?.halves;
    if (!Number.isInteger(a) || a < 1 || total + a > MAX_HALVES) continue;
    amounts.push(a);
    total += a;
    const l = typeof item.label === 'string' ? cleanLabel(item.label) : '';
    if (l && !labels.has(l.toLowerCase())) labels.set(l.toLowerCase(), l);
  }
  return amounts.length ? { parts: [makePart(1, [...labels.values()].join(' + '), amounts)], active: 0 } : EMPTY_PLATE;
}

// What to draw: per tap, a whole banana per 2 halves and a cut half for an odd one. Keys stay the
// same while a piece stays on the plate, so the drawing can tell which ones just landed.
export function platePieces(plate) {
  return plate.parts.flatMap((p, part) => p.amounts.flatMap((a, j) => [
    ...Array.from({ length: Math.floor(a / 2) }, (_, k) => ({ key: `${p.id}.${j}.${k}`, kind: 'whole', part })),
    ...(a % 2 ? [{ key: `${p.id}.${j}.h`, kind: 'half', part }] : []),
  ]));
}
