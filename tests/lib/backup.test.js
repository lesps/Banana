import { describe, it, expect } from 'vitest';
import { exportData, backupFilename, parseBackup, mergeBackup, summarize, FORMAT, VERSION } from '../../src/lib/backup.js';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../../src/lib/settings.js';

const e = (id, updatedAt, extra = {}) => ({ id, day: '2026-11-02', ts: 1000, halves: 2, label: id, updatedAt, ...extra });
const settings = { targetHalves: 36, rolloverHour: 4, updatedAt: 500 };

describe('sanitizeSettings', () => {
  it('fills defaults and clamps', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ targetHalves: 0, rolloverHour: 30, updatedAt: 'x' })).toEqual({ targetHalves: null, rolloverHour: 4, updatedAt: 0 });
    expect(sanitizeSettings({ targetHalves: 37.4, rolloverHour: 0, updatedAt: 9 })).toEqual({ targetHalves: 37, rolloverHour: 0, updatedAt: 9 });
  });
});

describe('export', () => {
  const now = Date.parse('2026-11-03T13:00:00Z');

  it('wraps entries (deleted markers included) and settings', () => {
    const entries = [e('a', 1), e('b', 2, { deleted: true })];
    expect(exportData(entries, settings, now)).toEqual({
      format: FORMAT, version: VERSION, exported: '2026-11-03T13:00:00.000Z', settings, entries,
    });
  });

  it('names the file by local date', () => expect(backupFilename(new Date(2026, 10, 3, 23).getTime())).toBe('banana-2026-11-03.json'));

  it('round-trips through parseBackup', () => {
    const entries = [e('a', 1), e('b', 2, { deleted: true })];
    const parsed = parseBackup(JSON.stringify(exportData(entries, settings, now)));
    expect(parsed).toEqual({ ok: true, entries, settings, skipped: 0 });
  });
});

describe('parseBackup', () => {
  const file = (over) => JSON.stringify({ format: FORMAT, version: 1, exported: 'x', settings, entries: [e('a', 1)], ...over });

  it('rejects non-JSON, the wrong format and unknown versions', () => {
    expect(parseBackup('{oops')).toMatchObject({ ok: false, error: expect.stringMatching(/JSON/) });
    expect(parseBackup(file({ format: 'other' }))).toMatchObject({ ok: false, error: expect.stringMatching(/Banana backup/) });
    expect(parseBackup(file({ version: 2 }))).toMatchObject({ ok: false, error: expect.stringMatching(/version/) });
    expect(parseBackup(file({ entries: 'no' }))).toMatchObject({ ok: false });
  });

  it('skips invalid entries and counts them', () => {
    const bad = [
      { ...e('x', 1), day: '2026-13-01' },
      { ...e('y', 1), halves: 0 },
      { ...e('z', 1), id: '' },
      { ...e('w', 1), updatedAt: 'later' },
      null,
    ];
    const r = parseBackup(file({ entries: [e('a', 1), ...bad] }));
    expect(r.ok).toBe(true);
    expect(r.entries.map((x) => x.id)).toEqual(['a']);
    expect(r.skipped).toBe(5);
  });

  it('normalizes entries: trims labels, drops unknown fields and a false deleted flag', () => {
    const r = parseBackup(file({ entries: [{ ...e('a', 1), label: '  Soup ', extra: 1, deleted: false }] }));
    expect(r.entries[0]).toEqual({ ...e('a', 1), label: 'Soup' });
  });

  it('keeps the newest copy of an id repeated in the file', () => {
    const r = parseBackup(file({ entries: [e('a', 1), { ...e('a', 5), halves: 9 }, e('a', 3)] }));
    expect(r.entries).toEqual([{ ...e('a', 5), halves: 9 }]);
  });

  it('defaults missing settings', () => expect(parseBackup(file({ settings: undefined })).settings).toEqual(DEFAULT_SETTINGS));
});

describe('mergeBackup', () => {
  const local = { entries: [e('a', 10), e('b', 10), e('c', 10)], settings };

  it('keeps the newer copy of each id and reports what changed', () => {
    const incoming = {
      entries: [
        { ...e('a', 20), halves: 5 },        // newer: updated
        { ...e('b', 5), halves: 9 },         // older: unchanged
        { ...e('c', 20), deleted: true },    // newer deletion: removed
        e('d', 1),                           // new: added
        { ...e('z', 1), deleted: true },     // new marker: kept, not counted
      ],
      settings: { ...settings, targetHalves: 20, updatedAt: 100 },
    };
    const { entries, settings: s, report } = mergeBackup(local, incoming);
    expect(report).toEqual({ added: 1, updated: 1, removed: 1, unchanged: 1 });
    const byId = Object.fromEntries(entries.map((x) => [x.id, x]));
    expect(byId.a.halves).toBe(5);
    expect(byId.b.halves).toBe(2);
    expect(byId.c.deleted).toBe(true);
    expect(byId.d).toBeDefined();
    expect(byId.z.deleted).toBe(true);
    expect(s.targetHalves).toBe(36);
  });

  it('takes the file settings when they are newer, e.g. on a fresh install', () => {
    const fresh = { entries: [], settings: DEFAULT_SETTINGS };
    expect(mergeBackup(fresh, { entries: [], settings }).settings).toEqual(settings);
  });

  it('a newer deletion beats an older edit, and a newer restore beats an older deletion', () => {
    const l = { entries: [{ ...e('a', 10), deleted: true }], settings };
    const restored = mergeBackup(l, { entries: [e('a', 20)], settings }).entries[0];
    expect(restored.deleted).toBeUndefined();
  });

  it('ties keep the local copy', () => {
    const r = mergeBackup(local, { entries: [{ ...e('a', 10), halves: 99 }], settings });
    expect(r.entries.find((x) => x.id === 'a').halves).toBe(2);
    expect(r.report.unchanged).toBe(1);
  });

  it('is idempotent', () => {
    const incoming = { entries: [e('a', 20), e('d', 1)], settings };
    const once = mergeBackup(local, incoming);
    const twice = mergeBackup(once, incoming);
    expect(twice.entries).toEqual(once.entries);
    expect(twice.report).toEqual({ added: 0, updated: 0, removed: 0, unchanged: 2 });
  });
});

describe('summarize', () => {
  it('counts live entries and their date range', () => {
    const entries = [e('a', 1, { day: '2026-10-01' }), e('b', 1, { day: '2026-11-02' }), e('c', 1, { day: '2025-01-01', deleted: true })];
    expect(summarize(entries)).toEqual({ count: 2, first: '2026-10-01', last: '2026-11-02' });
    expect(summarize([])).toEqual({ count: 0, first: null, last: null });
  });
});
