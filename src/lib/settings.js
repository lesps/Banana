import { MAX_HALVES } from './units.js';

export const DEFAULT_SETTINGS = Object.freeze({ targetHalves: null, rolloverHour: 4, updatedAt: 0 });
export const MAX_ROLLOVER = 11;

export function sanitizeSettings(s) {
  const src = s && typeof s === 'object' ? s : {};
  const t = Math.round(Number(src.targetHalves));
  const r = Number(src.rolloverHour);
  const u = Number(src.updatedAt);
  return {
    targetHalves: Number.isFinite(t) && t >= 1 ? Math.min(t, MAX_HALVES) : null,
    rolloverHour: Number.isInteger(r) && r >= 0 && r <= MAX_ROLLOVER ? r : DEFAULT_SETTINGS.rolloverHour,
    updatedAt: Number.isFinite(u) && u >= 0 ? u : 0,
  };
}
