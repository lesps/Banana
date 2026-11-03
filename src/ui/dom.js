export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v; // static markup only, never data
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

// − value + control. prev/next return the neighbouring value, or null at the ends.
export function stepper({ value, format, prev, next, onChange, label, cls = '', focusKey }) {
  let v = value;
  const out = h('output', { 'aria-live': 'polite' });
  const minus = h('button', { type: 'button', class: 'minus', 'aria-label': `Less ${label}`, 'data-focus': focusKey && `${focusKey}-minus` }, '−');
  const plus = h('button', { type: 'button', class: 'plus', 'aria-label': `More ${label}`, 'data-focus': focusKey && `${focusKey}-plus` }, '+');
  const sync = () => {
    out.textContent = format(v);
    minus.disabled = prev(v) == null;
    plus.disabled = next(v) == null;
  };
  const step = (fn) => () => {
    const n = fn(v);
    if (n == null) return;
    v = n;
    sync();
    onChange?.(v);
  };
  minus.addEventListener('click', step(prev));
  plus.addEventListener('click', step(next));
  sync();
  return { el: h('div', { class: `stepper ${cls}`.trim() }, minus, out, plus), get value() { return v; } };
}

export function openDialog(dlg) {
  document.body.append(dlg);
  try {
    dlg.showModal();
  } catch {
    dlg.setAttribute('open', '');
  }
  dlg.addEventListener('close', () => dlg.remove());
}

export function closeDialog(dlg) {
  try {
    dlg.close();
  } catch { /* not supported */ }
  dlg.remove();
}
