import { describe, it, expect } from 'vitest';
import { ymd, isDay, dayOf, addDays, daysBetween, formatDay, shortDay, weekdayLetter, hourLabel } from '../../src/lib/day.js';

const at = (y, m, d, hh = 12, mm = 0) => new Date(y, m - 1, d, hh, mm).getTime();

describe('ymd / isDay', () => {
  it('formats local dates', () => expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05'));
  it('accepts only real YYYY-MM-DD dates', () => {
    expect(isDay('2026-11-03')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('2026-1-3')).toBe(false);
    expect(isDay(20261103)).toBe(false);
  });
});

describe('dayOf', () => {
  it('is the calendar day at or after the rollover hour', () => expect(dayOf(at(2026, 11, 3, 4, 0), 4)).toBe('2026-11-03'));
  it('counts the small hours toward the day before', () => expect(dayOf(at(2026, 11, 3, 1, 30), 4)).toBe('2026-11-02'));
  it('crosses month and year boundaries', () => expect(dayOf(at(2026, 1, 1, 2), 4)).toBe('2025-12-31'));
  it('with rollover 0 is the calendar day', () => expect(dayOf(at(2026, 11, 3, 0, 5), 0)).toBe('2026-11-03'));
  it('is unaffected by the DST change', () => {
    expect(dayOf(at(2026, 11, 1, 1, 30), 4)).toBe('2026-10-31');
    expect(dayOf(at(2026, 11, 1, 5), 4)).toBe('2026-11-01');
  });
});

describe('addDays / daysBetween', () => {
  it('steps across months and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('counts whole days', () => {
    expect(daysBetween('2026-10-30', '2026-11-03')).toBe(4);
    expect(daysBetween('2026-11-03', '2026-11-03')).toBe(0);
  });
});

describe('formatDay', () => {
  it('names today and yesterday', () => {
    expect(formatDay('2026-11-03', '2026-11-03')).toBe('Today');
    expect(formatDay('2026-11-02', '2026-11-03')).toBe('Yesterday');
  });
  it('uses weekday and date otherwise, with the year only when it differs', () => {
    expect(formatDay('2026-10-30', '2026-11-03')).toBe('Fri, Oct 30');
    expect(formatDay('2025-12-30', '2026-01-02')).toBe('Tue, Dec 30, 2025');
  });
});

it('hourLabel', () => {
  expect(hourLabel(0)).toBe('Midnight');
  expect(hourLabel(4)).toBe('4 a.m.');
  expect(hourLabel(11)).toBe('11 a.m.');
});

it('shortDay drops the weekday and shows the year only when it differs', () => {
  expect(shortDay('2026-10-01', '2026-11-03')).toBe('Oct 1');
  expect(shortDay('2025-03-03', '2026-11-03')).toBe('Mar 3, 2025');
});

it('weekdayLetter', () => expect(weekdayLetter('2026-11-03')).toBe('T'));
