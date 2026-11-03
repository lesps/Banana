// Days are local calendar dates as 'YYYY-MM-DD' strings, which sort chronologically.
const pad = (n) => String(n).padStart(2, '0');

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Noon avoids DST edge cases when stepping whole days.
const toDate = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export function isDay(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return ymd(toDate(s)) === s;
}

// The log day a moment belongs to: before the rollover hour it still counts as the previous day.
export function dayOf(ts, rolloverHour) {
  const d = new Date(ts);
  if (d.getHours() < rolloverHour) d.setDate(d.getDate() - 1);
  return ymd(d);
}

export function addDays(day, n) {
  const d = toDate(day);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86_400_000);

export function formatDay(day, today) {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return toDate(day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const hourLabel = (h) => (h === 0 ? 'Midnight' : h === 12 ? 'Noon' : `${h % 12} ${h < 12 ? 'a.m.' : 'p.m.'}`);

export function shortDay(day, today) {
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return toDate(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export const weekdayLetter = (day) => toDate(day).toLocaleDateString('en-US', { weekday: 'narrow' });
