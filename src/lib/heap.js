// Where bananas sit on the meal plate. Plate-plane coordinates: the well (the flat middle of the
// plate) is the unit circle, y points to the front. z is height above the plate, in the same units.
export const TAU = Math.PI * 2;
export const START = -Math.PI / 2; // the first part starts at the back and the rest go clockwise
export const MIN_WEDGE = 0.6; // radians (about 34°), so a ½ part is still big enough to tap

// One wedge per part, in proportion to its halves. Parts that would get less than MIN_WEDGE (empty
// ones included) get exactly that, and the rest share what's left in proportion.
export function wedgeAngles(halves) {
  if (halves.length <= 1) return halves.length ? [{ a0: START, a1: START + TAU }] : [];
  const fixed = new Set();
  let spans;
  for (;;) {
    const free = halves.map((h, i) => i).filter((i) => !fixed.has(i));
    const room = TAU - MIN_WEDGE * fixed.size;
    const total = free.reduce((n, i) => n + halves[i], 0);
    spans = halves.map((h, i) => (fixed.has(i) ? MIN_WEDGE : total ? (h / total) * room : room / free.length));
    const small = free.filter((i) => spans[i] < MIN_WEDGE);
    if (!small.length) break;
    small.forEach((i) => fixed.add(i));
  }
  let a0 = START;
  return spans.map((s) => {
    const w = { a0, a1: a0 + s };
    a0 = w.a1;
    return w;
  });
}

// Banana size (the sprite's box, in well radii): smaller as the plate fills, in steps so a tap
// doesn't nudge every banana.
export function bananaSize(count) {
  if (count <= 4) return 0.56;
  if (count <= 8) return 0.5;
  if (count <= 14) return 0.44;
  if (count <= 24) return 0.39;
  return 0.34;
}

// At most max pieces, taking one from each part in turn so every part shows; in plate order.
export function pickShown(pieces, max) {
  if (pieces.length <= max) return pieces;
  const byPart = new Map();
  for (const p of pieces) byPart.set(p.part, [...(byPart.get(p.part) ?? []), p]);
  const keep = new Set();
  for (let round = 0; keep.size < max; round++) {
    for (const list of byPart.values()) {
      if (list[round] && keep.size < max) keep.add(list[round]);
    }
  }
  return pieces.filter((p) => keep.has(p));
}

// A small seeded generator per banana, so a banana's spot depends only on its key and the plate.
function random(key) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CANDIDATES = 48;
const SPREAD = 0.5; // how much a banana prefers the middle of its section over the top of the heap

// Each banana, in plate order, tries spots in its wedge and takes the one where the heap is lowest,
// counting distance from the wedge's heart against it. So heaps grow up before they spread out.
// Returns { key, x, y, z, rot } per piece; rot (degrees) lays the banana down, pointing either way.
export function settle(pieces, wedges, size) {
  const rad = size * 0.3; // footprint radius
  const layer = size * 0.3; // how much one banana lifts the next
  const placed = [];
  for (const piece of pieces) {
    const { a0, a1 } = wedges[piece.part];
    const sweep = a1 - a0;
    const whole = sweep >= TAU - 1e-9;
    const mid = (a0 + a1) / 2;
    // The heap's heart: out in the wedge, so it reads as that part's; the middle for a lone part.
    const hr = whole ? 0 : sweep <= Math.PI ? 0.62 - 0.12 * (sweep / Math.PI) : Math.max(0.45, 0.5 * ((TAU - sweep) / Math.PI));
    const hx = hr * Math.cos(mid);
    const hy = hr * Math.sin(mid);
    const rnd = random(piece.key);
    let best = null;
    const inner = whole ? rad : Math.max(rad, 0.28); // off the point where the wedges meet
    for (let c = 0; c < CANDIDATES; c++) {
      const r = inner + (1 - rad - inner) * Math.sqrt(rnd());
      const pad = whole ? 0 : Math.asin(Math.min(1, (rad * 0.8) / r));
      const u = rnd();
      if (a0 + pad >= a1 - pad) continue;
      const a = a0 + pad + (sweep - 2 * pad) * u;
      const x = r * Math.cos(a);
      const y = r * Math.sin(a);
      let z = 0;
      for (const o of placed) {
        const d = Math.hypot(o.x - x, o.y - y);
        if (d < rad * 1.7) z = Math.max(z, o.z + layer * (1 - d / (rad * 2.4)));
      }
      const score = z + SPREAD * Math.hypot(x - hx, y - hy);
      if (!best || score < best.score) best = { x, y, z, score };
    }
    best ??= { x: hx, y: hy, z: 0 };
    const rot = 90 + (rnd() - 0.5) * 44 + (rnd() < 0.5 ? 0 : 180);
    placed.push({ key: piece.key, x: best.x, y: best.y, z: best.z, rot });
  }
  return placed;
}
