import { clampHalves } from './units.js';
import { isDay, addDays } from './day.js';

export const MAX_LABEL = 200;
const WEEK = 7 * 86_400_000;

export const cleanLabel = (s) => (typeof s === 'string' ? s.trim().slice(0, MAX_LABEL) : '');

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function createEntry({ halves, label = '', day, now, id = newId() }) {
  return { id, day, ts: now, halves: clampHalves(halves), label: cleanLabel(label), updatedAt: now };
}

export const addEntry = (entries, entry) => [...entries, entry];

const patchEntry = (entries, id, fn) => entries.map((e) => (e.id === id ? fn(e) : e));

export function updateEntry(entries, id, patch, now) {
  return patchEntry(entries, id, (e) => {
    const next = { ...e, updatedAt: now };
    if ('halves' in patch) next.halves = clampHalves(patch.halves);
    if ('label' in patch) next.label = cleanLabel(patch.label);
    if (isDay(patch.day)) next.day = patch.day;
    return next;
  });
}

export const deleteEntry = (entries, id, now) => patchEntry(entries, id, (e) => ({ ...e, deleted: true, updatedAt: now }));

export function restoreEntry(entries, id, now) {
  return patchEntry(entries, id, ({ deleted, ...e }) => ({ ...e, updatedAt: now }));
}

export const live = (entries) => entries.filter((e) => !e.deleted);

export const entriesForDay = (entries, day) => live(entries).filter((e) => e.day === day).sort((a, b) => a.ts - b.ts);

export const dayTotal = (entries, day) => entriesForDay(entries, day).reduce((n, e) => n + e.halves, 0);

export function daySummaries(entries) {
  const byDay = new Map();
  for (const e of live(entries)) {
    const s = byDay.get(e.day) ?? { day: e.day, halves: 0, count: 0 };
    s.halves += e.halves;
    s.count += 1;
    byDay.set(e.day, s);
  }
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
}

export function recentLabels(entries, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const e of live(entries).sort((a, b) => b.ts - a.ts)) {
    const key = e.label.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ label: e.label, halves: e.halves });
    if (out.length === limit) break;
  }
  return out;
}

export function series(entries, endDay, n) {
  const start = addDays(endDay, -(n - 1));
  const totals = new Map();
  for (const e of live(entries)) {
    if (e.day >= start && e.day <= endDay) totals.set(e.day, (totals.get(e.day) ?? 0) + e.halves);
  }
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(start, i);
    return { day, halves: totals.get(day) ?? 0 };
  });
}

// Average of the logged days among the 7 before today. Unlogged days are left out, not counted as zero.
export function recentAverage(entries, today) {
  const logged = series(entries, addDays(today, -1), 7).filter((d) => d.halves > 0);
  if (!logged.length) return null;
  return { halves: Math.round(logged.reduce((n, d) => n + d.halves, 0) / logged.length), days: logged.length };
}

export function backupDue(entries, lastExport, now) {
  if (!entries.length) return false;
  const since = lastExport ?? 0;
  if (!entries.some((e) => e.updatedAt > since)) return false;
  const from = lastExport ?? Math.min(...entries.map((e) => e.ts));
  return now - from >= WEEK;
}
