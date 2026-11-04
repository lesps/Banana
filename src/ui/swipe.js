// Swipe actions on a list row: left reveals/does onDelete, right reveals/does onAgain, a tap is onTap.
// The row is translated with transform; its <li> holds the action buttons behind it.

export const REVEAL = 88; // width of a revealed button
const OPEN_AT = 48; // release past this to leave the row open on its button
const SLOP = 8; // movement before deciding between a swipe and a scroll

// A full swipe acts on release: about half the row, at least 140 px.
const commitAt = (width) => Math.max(140, (width || 320) * 0.45);

export function swipeOutcome(dx, width) {
  const commit = commitAt(width);
  if (dx <= -commit) return 'delete';
  if (dx >= commit) return 'again';
  if (dx <= -OPEN_AT) return 'open-left';
  if (dx >= OPEN_AT) return 'open-right';
  return 'close';
}

let openRow = null;
let listening = false;

const offsetOf = (row) => Number(row.dataset.offset || 0);

function setOffset(row, x) {
  row.style.transform = x ? `translateX(${x}px)` : '';
  row.dataset.offset = String(x);
}

function close(row) {
  row.classList.remove('open-left', 'open-right');
  setOffset(row, 0);
  if (openRow === row) openRow = null;
}

function markCommit(row, outcome) {
  const li = row.parentElement;
  li?.classList.toggle('commit-left', outcome === 'delete');
  li?.classList.toggle('commit-right', outcome === 'again');
}

// Any press outside the open row (or its buttons) closes it.
function listenOutside(doc) {
  if (listening) return;
  listening = true;
  doc.addEventListener('pointerdown', (e) => {
    if (openRow && !openRow.parentElement?.contains(e.target)) close(openRow);
  }, true);
}

export function attachSwipe(row, { onTap, onDelete, onAgain }) {
  listenOutside(row.ownerDocument);
  let start = null;
  let mode = null; // null until decided, then 'swipe' or 'scroll'
  let suppressClick = false;

  row.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    suppressClick = false;
    if (openRow && openRow !== row) close(openRow);
    start = { x: e.clientX, y: e.clientY, base: offsetOf(row) };
    mode = null;
  });

  row.addEventListener('pointermove', (e) => {
    if (!start || mode === 'scroll') return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!mode) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
      if (mode === 'scroll') return;
      row.classList.add('dragging');
      try { row.setPointerCapture?.(e.pointerId); } catch { /* pointer already gone */ }
    }
    const x = start.base + dx;
    setOffset(row, x);
    markCommit(row, swipeOutcome(x, row.offsetWidth));
  });

  const finish = (cancelled) => {
    if (!start) return;
    const { base } = start;
    const swiped = mode === 'swipe';
    start = null;
    mode = null;
    row.classList.remove('dragging');
    markCommit(row, null);
    if (!swiped) return;
    suppressClick = true;
    if (cancelled) return setOffset(row, base);
    const outcome = swipeOutcome(offsetOf(row), row.offsetWidth);
    if (outcome === 'delete' || outcome === 'again') {
      close(row);
      (outcome === 'delete' ? onDelete : onAgain)();
    } else if (outcome === 'close') {
      close(row);
    } else {
      if (openRow && openRow !== row) close(openRow);
      row.classList.remove('open-left', 'open-right');
      row.classList.add(outcome);
      setOffset(row, outcome === 'open-left' ? -REVEAL : REVEAL);
      openRow = row;
    }
  };
  row.addEventListener('pointerup', () => finish(false));
  row.addEventListener('pointercancel', () => finish(true));

  row.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false;
    } else if (row.classList.contains('open-left') || row.classList.contains('open-right')) {
      close(row);
    } else {
      onTap();
    }
  });
}
