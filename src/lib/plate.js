// The plate: amounts added up before they're logged as one entry. Items are { halves, label? }.
import { formatHalves, MAX_HALVES } from './units.js';
import { cleanLabel } from './log.js';

const SHOWN = 5;

export const plateTotal = (plate) => plate.reduce((n, i) => n + i.halves, 0);

// Returns the new plate, or null when it would pass one entry's maximum.
export function addToPlate(plate, halves, label = '') {
  if (plateTotal(plate) + halves > MAX_HALVES) return null;
  const l = cleanLabel(label);
  return [...plate, l ? { halves, label: l } : { halves }];
}

export const undoPlate = (plate) => plate.slice(0, -1);

export function plateLabel(plate) {
  const seen = new Set();
  const labels = [];
  for (const { label } of plate) {
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    labels.push(label);
  }
  return cleanLabel(labels.join(' + '));
}

export function formatPlate(plate) {
  if (plate.length < 2) return plate.length ? formatHalves(plate[0].halves) : '';
  const parts = plate.slice(-SHOWN).map((i) => formatHalves(i.halves));
  if (plate.length > SHOWN) parts.unshift('…');
  return `${parts.join(' + ')} = ${formatHalves(plateTotal(plate))}`;
}

export function sanitizePlate(stored) {
  if (!Array.isArray(stored)) return [];
  let plate = [];
  for (const item of stored) {
    const halves = item?.halves;
    if (!Number.isInteger(halves) || halves < 1) continue;
    plate = addToPlate(plate, halves, typeof item.label === 'string' ? item.label : '') ?? plate;
  }
  return plate;
}
