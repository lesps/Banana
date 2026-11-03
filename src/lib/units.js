// Amounts are whole half-bananas: 1 banana ≈ 100 kcal, ½ is the finest step.
export const MAX_HALVES = 200;
export const QUICK_HALVES = [1, 2, 3, 4, 6];

export function formatHalves(halves) {
  const whole = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  if (!whole && !half) return '0';
  return `${whole || ''}${half ? '½' : ''}`;
}

export function clampHalves(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_HALVES);
}

// One icon per banana: fill 0 (empty), 1 (half) or 2 (full); over = past the target.
export function bananaRow(total, target, cap = 40) {
  const count = Math.max(Math.ceil((target ?? 0) / 2), Math.ceil(total / 2));
  const icons = Array.from({ length: Math.min(count, cap) }, (_, i) => ({
    fill: Math.max(0, Math.min(2, total - 2 * i)),
    over: target != null && 2 * i >= target,
  }));
  return { icons, more: Math.max(0, count - cap) };
}

export const bananaWord = (halves) => (halves > 0 && halves <= 2 ? 'banana' : 'bananas');

export const countEntries = (n) => `${n} ${n === 1 ? 'entry' : 'entries'}`;
