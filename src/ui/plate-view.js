// The meal plate, drawn tilted: a wedge per part, and the bananas heaped in their wedge. It's made
// once per app and kept across re-renders, so bananas still falling aren't cut off. New bananas drop
// from above, bounce and settle; the ones they land on give a little; when the wedges change, the
// bananas slide to their new spots, and ones left hanging (a part taken off) fall back down.
import { h } from './dom.js';
import { platePieces, partHalves, partName } from '../lib/plate.js';
import { wedgeAngles, settle, bananaSize, pickShown, TAU } from '../lib/heap.js';

const NS = 'http://www.w3.org/2000/svg';
const CX = 160; // the plate's centre in the 320 × 196 viewBox
const CY = 98;
const S = 102; // px per well radius
const RIM = 1.25; // rim radius, in well radii
const K = 0.56; // how much the tilt flattens the plate
const DEPTH = 7; // the plate's edge, px
export const MAX_SHOWN = 40;
const LABEL_MAX = 14;

const G = 14; // gravity, well radii per s²
const BOUNCE = 0.32;
const DROP = 1.25; // how far above its spot a new banana starts
const STIFF = 150;
const DAMP = 15; // a little under critical, so things overshoot a touch and wobble

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}
const project = (x, y, z = 0) => [CX + x * S, CY + y * S * K - z * S];
const round = (n) => Math.round(n * 10) / 10;

function wedgePath({ a0, a1 }) {
  if (a1 - a0 >= TAU - 1e-6) return `M${CX - S} ${CY}a${S} ${S * K} 0 1 0 ${2 * S} 0a${S} ${S * K} 0 1 0 ${-2 * S} 0Z`;
  const [x0, y0] = project(Math.cos(a0), Math.sin(a0));
  const [x1, y1] = project(Math.cos(a1), Math.sin(a1));
  return `M${CX} ${CY}L${round(x0)} ${round(y0)}A${S} ${round(S * K)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${round(x1)} ${round(y1)}Z`;
}

const labelText = (part, i) => {
  const t = partName(part, i).toLocaleUpperCase();
  return t.length > LABEL_MAX ? `${t.slice(0, LABEL_MAX - 1).trimEnd()}…` : t;
};

const canAnimate = () => typeof requestAnimationFrame === 'function' && typeof matchMedia === 'function'
  && !matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createPlateView(initial, { onSelect }) {
  const wedgeLayer = svg('g', { class: 'wedges' });
  const dividerLayer = svg('g', { class: 'dividers' });
  const pieceLayer = svg('g', { class: 'pieces' });
  const labelLayer = svg('g', { class: 'labels' });
  const base = [
    svg('defs', {}, svg('filter', { id: 'piece-shadow', x: '-30%', y: '-30%', width: '160%', height: '160%' },
      svg('feDropShadow', { class: 'piece-shadow', dx: '0.5', dy: '1.5', stdDeviation: '1.1' }))),
    svg('ellipse', { class: 'plate-shadow', cx: CX, cy: CY + DEPTH + 4, rx: RIM * S + 3, ry: (RIM * S + 3) * K }),
    svg('ellipse', { class: 'plate-edge', cx: CX, cy: CY + DEPTH, rx: RIM * S, ry: RIM * S * K }),
    svg('ellipse', { class: 'plate-rim', cx: CX, cy: CY, rx: RIM * S, ry: RIM * S * K }),
    svg('ellipse', { class: 'plate-well', cx: CX, cy: CY, rx: S, ry: S * K }),
  ];
  const root = svg('svg', { viewBox: '0 0 320 196' }, ...base, wedgeLayer, dividerLayer, pieceLayer, labelLayer);
  const more = h('span', { class: 'plate-more', hidden: true });
  const el = h('span', { class: 'plate-art', 'aria-hidden': 'true' }, root, more);
  // Wedges and bananas carry their part's index; tapping one picks that part.
  root.addEventListener('click', (e) => {
    const hit = e.target.closest?.('[data-part]');
    if (hit) onSelect(Number(hit.dataset.part));
  });

  const bodies = new Map(); // piece key → body
  let wedges = []; // what's drawn now
  let wedgeTargets = [];
  let parts = [];
  let active = 0;
  let footprint = 0.15;
  let raf = 0;
  let last = 0;
  let reorder = true;

  function makeBody(piece) {
    const use = svg('use', { href: `#${piece.kind === 'half' ? 'banana-half' : 'banana'}` });
    const g = svg('g', { class: 'piece', filter: 'url(#piece-shadow)' }, use);
    return { key: piece.key, g, use, x: 0, y: 0, z: 0, rot: 0, size: 0, vx: 0, vy: 0, vz: 0, vrot: 0, falling: false, dropOrder: 0, drawnSize: 0 };
  }

  function update(plate, { first = false } = {}) {
    const pieces = platePieces(plate);
    const shown = pickShown(pieces, MAX_SHOWN);
    const size = bananaSize(shown.length);
    footprint = size * 0.3;
    wedgeTargets = wedgeAngles(plate.parts.map(partHalves));
    if (wedgeTargets.length !== wedges.length || first) wedges = wedgeTargets.map((w) => ({ ...w }));
    parts = plate.parts;
    active = plate.active;
    const spots = settle(shown, wedgeTargets, size);

    for (const b of bodies.values()) b.g.classList.remove('drop');
    const seen = new Set();
    let dropped = 0;
    spots.forEach((spot, i) => {
      const piece = shown[i];
      seen.add(piece.key);
      let b = bodies.get(piece.key);
      const isNew = !b;
      if (isNew) {
        b = makeBody(piece);
        bodies.set(piece.key, b);
        pieceLayer.append(b.g);
      }
      Object.assign(b, { tx: spot.x, ty: spot.y, tz: spot.z, trot: spot.rot, tsize: size, part: piece.part });
      b.g.dataset.part = piece.part;
      if (isNew) {
        Object.assign(b, { x: spot.x, y: spot.y, z: spot.z, rot: spot.rot, size });
        if (!first) {
          b.g.classList.add('drop');
          b.z = spot.z + DROP + dropped * 0.3; // a handful lands one after another
          b.rot = spot.rot - 35;
          b.falling = true;
          b.dropOrder = dropped++;
        }
      }
    });
    for (const [key, b] of bodies) {
      if (!seen.has(key)) {
        b.g.remove();
        bodies.delete(key);
      }
    }
    more.hidden = pieces.length <= shown.length;
    more.textContent = `+${pieces.length - shown.length}`;
    reorder = true;
    drawWedges();
    if (canAnimate()) start();
    else settleNow();
  }

  function settleNow() {
    for (const b of bodies.values()) Object.assign(b, { x: b.tx, y: b.ty, z: b.tz, rot: b.trot, size: b.tsize, vx: 0, vy: 0, vz: 0, vrot: 0, falling: false });
    wedges = wedgeTargets.map((w) => ({ ...w }));
    drawWedges();
    drawBodies();
  }

  function drawWedges() {
    const several = wedges.length > 1;
    wedgeLayer.replaceChildren(...wedges.map((w, i) =>
      svg('path', { class: `wedge${several && i === active ? ' active' : ''}`, 'data-part': i, d: wedgePath(w) })));
    dividerLayer.replaceChildren(...(several ? wedges.map(({ a0 }) => {
      const [x, y] = project(RIM * 0.97 * Math.cos(a0), RIM * 0.97 * Math.sin(a0));
      return svg('line', { class: 'divider', x1: CX, y1: CY, x2: round(x), y2: round(y) });
    }) : []));
    labelLayer.replaceChildren(...(several ? wedges.map((w, i) => {
      const m = (w.a0 + w.a1) / 2;
      const [x, y] = project(((1 + RIM) / 2) * Math.cos(m), ((1 + RIM) / 2) * Math.sin(m));
      const t = svg('text', { class: `wedge-label${i === active ? ' active' : ''}`, 'data-part': i, x: round(x), y: round(y), 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = parts[i] ? labelText(parts[i], i) : '';
      return t;
    }) : []));
  }

  // Back to front: further back and lower first; anything still falling on top.
  const depth = (b) => (b.falling ? 100 + b.dropOrder : b.ty * K + b.tz * 1.4);
  function drawBodies() {
    for (const b of bodies.values()) {
      const [sx, sy] = project(b.x, b.y, b.z);
      const px = Math.round(b.size * S);
      if (px !== b.drawnSize) {
        b.drawnSize = px;
        for (const [k, v] of [['x', -px / 2], ['y', -px / 2], ['width', px], ['height', px]]) b.use.setAttribute(k, v);
      }
      b.g.setAttribute('transform', `translate(${round(sx)} ${round(sy)}) rotate(${round(b.rot)})`);
    }
    if (!reorder) return;
    reorder = false;
    const sorted = [...bodies.values()].sort((a, b) => depth(a) - depth(b));
    if (sorted.some((b, i) => pieceLayer.children[i] !== b.g)) pieceLayer.append(...sorted.map((b) => b.g));
  }

  const spring = (b, p, v, target, dt, k = STIFF, c = DAMP) => {
    b[v] += (k * (target - b[p]) - c * b[v]) * dt;
    b[p] += b[v] * dt;
    return Math.abs(target - b[p]) > 1e-3 || Math.abs(b[v]) > 1e-2;
  };

  // A banana landing presses down on the ones under it, which spring back.
  function land(b, speed) {
    for (const o of bodies.values()) {
      if (o === b || o.falling || o.tz >= b.tz) continue;
      if (Math.hypot(o.tx - b.tx, o.ty - b.ty) < footprint * 2) {
        o.vz -= speed * 0.08;
        o.vrot += (o.key < b.key ? 1 : -1) * speed * 8;
      }
    }
  }

  function step(dt) {
    let moving = false;
    for (const b of bodies.values()) {
      moving = spring(b, 'x', 'vx', b.tx, dt) | moving;
      moving = spring(b, 'y', 'vy', b.ty, dt) | moving;
      moving = spring(b, 'rot', 'vrot', b.trot, dt, 90, 11) | moving;
      b.size += (b.tsize - b.size) * Math.min(1, dt * 10);
      if (Math.abs(b.tsize - b.size) > 1e-3) moving = true;
      if (!b.falling && b.z - b.tz > 0.12) b.falling = true; // what held it up is gone
      if (b.falling) {
        moving = true;
        b.vz -= G * dt;
        b.z += b.vz * dt;
        if (b.z <= b.tz && b.vz < 0) {
          b.z = b.tz;
          if (b.vz < -0.9) {
            land(b, -b.vz);
            b.vz *= -BOUNCE;
          } else {
            b.vz = 0;
            b.falling = false;
            reorder = true;
          }
        }
      } else moving = spring(b, 'z', 'vz', b.tz, dt) | moving;
    }
    let turning = false;
    wedges.forEach((w, i) => {
      const t = wedgeTargets[i];
      const f = Math.min(1, dt * 12);
      w.a0 += (t.a0 - w.a0) * f;
      w.a1 += (t.a1 - w.a1) * f;
      if (Math.abs(t.a0 - w.a0) + Math.abs(t.a1 - w.a1) > 1e-4) turning = true;
      else Object.assign(w, t);
    });
    return { moving, turning };
  }

  function tick(now) {
    const dt = Math.min(1 / 30, Math.max(0, (now - last) / 1000));
    last = now;
    const a = step(dt / 2);
    const b = step(dt / 2);
    if (a.turning || b.turning) drawWedges();
    drawBodies();
    raf = a.moving || b.moving || b.turning ? requestAnimationFrame(tick) : 0;
    if (!raf) settleNow();
  }

  function start() {
    drawBodies();
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  update(initial, { first: true });
  return {
    el,
    update: (plate) => update(plate),
    destroy: () => { if (raf) cancelAnimationFrame(raf); raf = 0; },
  };
}
