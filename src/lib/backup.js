import { isDay, ymd } from './day.js';
import { MAX_HALVES } from './units.js';
import { MAX_LABEL, live } from './log.js';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings.js';

export const FORMAT = 'banana-log';
export const VERSION = 1;

export function exportData(entries, settings, now) {
  return { format: FORMAT, version: VERSION, exported: new Date(now).toISOString(), settings, entries };
}

export const backupFilename = (now) => `banana-${ymd(new Date(now))}.json`;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

export function validEntry(e) {
  if (!e || typeof e !== 'object') return null;
  const { id, day, ts, halves, label = '', updatedAt, deleted } = e;
  if (typeof id !== 'string' || !id || id.length > 100) return null;
  if (!isDay(day) || !finite(ts) || !finite(updatedAt)) return null;
  if (!Number.isInteger(halves) || halves < 1 || halves > MAX_HALVES) return null;
  if (typeof label !== 'string') return null;
  const out = { id, day, ts, halves, label: label.trim().slice(0, MAX_LABEL), updatedAt };
  if (deleted === true) out.deleted = true;
  return out;
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON.' };
  }
  if (!data || data.format !== FORMAT) return { ok: false, error: 'This isn’t a Banana backup file.' };
  if (data.version !== VERSION) return { ok: false, error: `Unsupported backup version (${data.version}).` };
  if (!Array.isArray(data.entries)) return { ok: false, error: 'The backup has no entries list.' };

  const byId = new Map();
  let skipped = 0;
  for (const raw of data.entries) {
    const e = validEntry(raw);
    if (!e) skipped += 1;
    else if (!byId.has(e.id) || e.updatedAt > byId.get(e.id).updatedAt) byId.set(e.id, e);
  }
  const settings = data.settings === undefined ? { ...DEFAULT_SETTINGS } : sanitizeSettings(data.settings);
  return { ok: true, entries: [...byId.values()], settings, skipped };
}

// Last writer wins per id; ties keep the local copy, so merging is idempotent.
export function mergeBackup(local, incoming) {
  const byId = new Map(local.entries.map((e) => [e.id, e]));
  const report = { added: 0, updated: 0, removed: 0, unchanged: 0 };
  for (const e of incoming.entries) {
    const mine = byId.get(e.id);
    if (!mine) {
      byId.set(e.id, e);
      if (!e.deleted) report.added += 1;
    } else if (e.updatedAt > mine.updatedAt) {
      byId.set(e.id, e);
      if (e.deleted && !mine.deleted) report.removed += 1;
      else report.updated += 1;
    } else report.unchanged += 1;
  }
  const settings = incoming.settings.updatedAt > local.settings.updatedAt ? incoming.settings : local.settings;
  return { entries: [...byId.values()], settings, report };
}

export function summarize(entries) {
  const days = live(entries).map((e) => e.day).sort();
  return { count: days.length, first: days[0] ?? null, last: days.at(-1) ?? null };
}
