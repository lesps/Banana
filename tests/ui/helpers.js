import { mountApp } from '../../src/ui/app.js';
import { createStorage, memoryBackend } from '../../src/ui/storage.js';

export const memoryStorage = () => createStorage(memoryBackend());
export const at = (y, m, d, hh = 12, mm = 0) => new Date(y, m - 1, d, hh, mm).getTime();

let current;

export function mount({ time = at(2026, 11, 3, 12), ...opts } = {}) {
  current?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app');
  let t = time;
  const clock = { now: () => t, set: (v) => { t = v; }, advance: (ms) => { t += ms; } };
  const saved = [];
  const saveFile = async (name, text) => { saved.push({ name, text }); return true; };
  const app = (current = mountApp(root, { storage: memoryStorage(), now: clock.now, saveFile, ...opts }));

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const button = (text, scope = document) => [...scope.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  const quick = (label) => $$('.quick button').find((b) => b.textContent.trim() === label);
  const total = () => $('.total .big').textContent;
  const heading = () => $('.daynav h1').textContent;
  const entries = () => $$('.entries .entry').map((e) => [e.querySelector('.label').textContent, e.querySelector('.amount').textContent]);
  const type = (sel, v) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const change = (sel, v) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    el.value = v;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const tab = (view) => $(`.tabs button[data-view="${view}"]`).click();
  const toast = () => $('.toast');
  const tick = () => new Promise((r) => setTimeout(r, 0));
  return { root, app, clock, saved, $, $$, button, quick, total, heading, entries, type, change, tab, toast, tick };
}
