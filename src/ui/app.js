import { h } from './dom.js';
import { ensureSprite, SILHOUETTE } from './banana.js';
import { createStorage } from './storage.js';
import { toast } from './toast.js';
import { detectEnv, showIosHelp } from './install.js';
import { saveFile as defaultSaveFile } from './files.js';
import { renderToday } from './today.js';
import { renderHistory } from './history.js';
import { renderLookup } from './lookup.js';
import { renderSettings } from './settings.js';
import { openEditor } from './editor.js';
import { dayOf, addDays } from '../lib/day.js';
import { formatHalves, countEntries } from '../lib/units.js';
import { createEntry, addEntry, updateEntry, deleteEntry, restoreEntry, dayTotal, backupDue, cleanLabel, MAX_LABEL } from '../lib/log.js';
import { addToPlate, undoPlate, plateTotal, plateLabel, sanitizePlate } from '../lib/plate.js';
import { exportData, backupFilename, parseBackup, mergeBackup, validEntry } from '../lib/backup.js';
import { sanitizeSettings } from '../lib/settings.js';
import { prepareFoods } from '../lib/foods.js';

export const KEYS = { entries: 'banana:entries:v1', settings: 'banana:settings:v1', lastExport: 'banana:lastExport:v1', plate: 'banana:plate:v1' };
export const PAGE = 30;

const ICONS = {
  today: `<svg viewBox="8 5 52 54" aria-hidden="true"><path d="${SILHOUETTE}" fill="currentColor"/></svg>`,
  lookup: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V12M10 20V6M15 20V10M20 20V4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="16" cy="7" r="2.3" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="8" cy="17" r="2.3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
};
const TABS = [['today', 'Today'], ['lookup', 'Look up'], ['history', 'History'], ['settings', 'Settings']];
// The food list is its own chunk, fetched the first time Look up opens (and precached for offline).
const importFoods = () => import('../data/foods.json').then((m) => m.default);

export function mergeMessage({ added, updated, removed }) {
  const parts = [added && `added ${added}`, updated && `updated ${updated}`, removed && `removed ${removed}`].filter(Boolean);
  return parts.length ? `Merged: ${parts.join(', ')}.` : 'Nothing new in that file.';
}

export function mountApp(root, { storage = createStorage(), now = Date.now, saveFile = defaultSaveFile, env = detectEnv(), loadFoods = importFoods } = {}) {
  ensureSprite();
  const stored = storage.get(KEYS.entries, []);
  const lastExport = storage.get(KEYS.lastExport, null);
  let state = {
    entries: Array.isArray(stored) ? stored.map(validEntry).filter(Boolean) : [],
    settings: sanitizeSettings(storage.get(KEYS.settings)),
    lastExport: Number.isFinite(lastExport) ? lastExport : null,
    view: 'today',
    day: null, // null = follow today
    historyLimit: PAGE,
    importPreview: null,
    importError: null,
    persisted: null,
    install: { ...env, canPrompt: false },
    lookup: { query: '', status: 'idle' }, // idle | loading | ready | error
    plate: sanitizePlate(storage.get(KEYS.plate, [])), // a device-only draft, never in backups
  };
  let foodIndex = null;
  let destroyed = false;
  let draft = '';
  let pop = null; // { day, from }: one-shot, so the next render animates what was just logged
  let dropFrom = null; // one-shot: index of the first plate item added since the last render
  let deferredPrompt = null;

  const today = () => dayOf(now(), state.settings.rolloverHour);
  const shownDay = () => state.day ?? today();

  function set(patch) {
    state = { ...state, ...patch };
    render();
  }

  function commit(entries) {
    const ok = storage.set(KEYS.entries, entries);
    if (!ok) toast('Couldn’t save on this device. Export a backup now.', { duration: 10_000 });
    set({ entries });
    return ok;
  }

  function savePlate(plate, patch = {}) {
    storage.set(KEYS.plate, plate);
    set({ plate, ...patch });
  }

  function commitSettings(patch) {
    const settings = sanitizeSettings({ ...state.settings, ...patch, updatedAt: now() });
    storage.set(KEYS.settings, settings);
    set({ settings });
  }

  const actions = {
    setView(view) {
      set({ view });
      if (view === 'lookup' && state.lookup.status === 'idle') actions.loadFoods();
    },

    loadFoods() {
      set({ lookup: { ...state.lookup, status: 'loading' } });
      loadFoods().then(
        (data) => {
          if (destroyed) return;
          foodIndex = prepareFoods(data);
          set({ lookup: { ...state.lookup, status: 'ready' } });
        },
        () => { if (!destroyed) set({ lookup: { ...state.lookup, status: 'error' } }); },
      );
    },

    setLookupQuery: (query) => set({ lookup: { ...state.lookup, query } }),
    openDay: (day) => set({ view: 'today', day: day && day < today() ? day : null }),
    stepDay: (n) => actions.openDay(addDays(shownDay(), n)),

    addToPlate(halves, label, patch = {}) {
      const plate = addToPlate(state.plate, halves, label);
      if (!plate) {
        toast('A plate holds up to 100 bananas.');
        return false;
      }
      dropFrom = state.plate.length;
      savePlate(plate, patch);
      return true;
    },
    undoPlate: () => savePlate(undoPlate(state.plate)),
    clearPlate: () => savePlate([]),

    // From Look up: the portion's bananas go on the plate and "Bagel (regular)" goes into the label
    // field (appended after " + " if there's text already), back on the day being shown.
    addFromLookup(halves, label) {
      const before = draft;
      draft = (draft.trim() ? `${draft.trim()} + ${label}` : label).slice(0, MAX_LABEL);
      if (!actions.addToPlate(halves, '', { view: 'today' })) draft = before;
    },

    logPlate() {
      const total = plateTotal(state.plate);
      if (!total) return;
      const label = cleanLabel(draft) || plateLabel(state.plate);
      draft = '';
      storage.set(KEYS.plate, []);
      state = { ...state, plate: [] };
      actions.log(total, label);
    },

    log(halves, label = '') {
      const entry = createEntry({ halves, label, day: shownDay(), now: now() });
      pop = { day: entry.day, from: dayTotal(state.entries, entry.day) };
      if (commit(addEntry(state.entries, entry))) {
        toast(`Logged ${formatHalves(entry.halves)}${entry.label ? ` · ${entry.label}` : ''}`, {
          action: 'Undo',
          onAction: () => commit(deleteEntry(state.entries, entry.id, now())),
        });
      }
    },

    edit(id) {
      const entry = state.entries.find((e) => e.id === id);
      if (!entry) return;
      openEditor(entry, {
        today: today(),
        onSave: (patch) => actions.saveEdit(id, patch),
        onDelete: () => actions.remove(id),
      });
    },

    saveEdit(id, patch) {
      const p = { ...patch };
      if (p.day && p.day > today()) delete p.day;
      commit(updateEntry(state.entries, id, p, now()));
    },

    remove(id) {
      if (commit(deleteEntry(state.entries, id, now()))) {
        toast('Deleted', { action: 'Undo', onAction: () => commit(restoreEntry(state.entries, id, now())) });
      }
    },

    setTarget: (halves) => commitSettings({ targetHalves: halves || null }),
    setRollover: (hour) => commitSettings({ rolloverHour: Number(hour) }),
    showMore: () => set({ historyLimit: state.historyLimit + PAGE }),
    setPersisted: (persisted) => set({ persisted }),

    async exportBackup() {
      const text = JSON.stringify(exportData(state.entries, state.settings, now()));
      if (!(await saveFile(backupFilename(now()), text))) return;
      const t = now();
      storage.set(KEYS.lastExport, t);
      set({ lastExport: t });
    },

    importText(text, name) {
      const parsed = parseBackup(text);
      if (!parsed.ok) set({ importError: parsed.error, importPreview: null });
      else set({ importPreview: { name, parsed, confirmReplace: false }, importError: null });
    },

    applyImport(mode) {
      const preview = state.importPreview;
      if (!preview) return;
      const { parsed } = preview;
      if (mode === 'merge') {
        const { entries, settings, report } = mergeBackup({ entries: state.entries, settings: state.settings }, parsed);
        storage.set(KEYS.settings, settings);
        state = { ...state, settings, importPreview: null };
        if (commit(entries)) toast(mergeMessage(report));
      } else if (mode === 'replace') {
        if (!preview.confirmReplace) return set({ importPreview: { ...preview, confirmReplace: true } });
        storage.set(KEYS.settings, parsed.settings);
        state = { ...state, settings: parsed.settings, importPreview: null, day: null };
        const live = parsed.entries.filter((e) => !e.deleted).length;
        if (commit(parsed.entries)) toast(`Replaced with ${countEntries(live)} from the file.`);
      }
    },

    cancelImport: () => set({ importPreview: null, importError: null }),

    async install() {
      if (deferredPrompt) {
        const e = deferredPrompt;
        deferredPrompt = null;
        e.prompt();
        const { outcome } = await e.userChoice;
        set({ install: { ...state.install, canPrompt: false, standalone: outcome === 'accepted' } });
      } else if (state.install.ios) showIosHelp();
    },
  };

  function tabs() {
    const due = backupDue(state.entries, state.lastExport, now());
    return h('nav', { class: 'tabs', 'aria-label': 'Sections' },
      TABS.map(([view, label]) => h('button', {
        type: 'button',
        'data-view': view,
        'aria-current': state.view === view ? 'page' : null,
        onclick: () => (view === 'today' ? actions.openDay(null) : actions.setView(view)),
      },
      h('span', { class: 'ico', html: ICONS[view] }),
      h('span', { class: 'lbl' }, label),
      view === 'settings' && due && h('span', { class: 'dot', role: 'img', 'aria-label': 'Backup due' }))));
  }

  const VIEWS = { today: renderToday, lookup: renderLookup, history: renderHistory, settings: renderSettings };

  function render() {
    const active = document.activeElement;
    const focusKey = root.contains(active) ? active.dataset.focus : undefined;
    const sel = focusKey && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
    const ctx = { state, today: today(), day: shownDay(), draft, setDraft: (v) => { draft = v; }, pop, dropFrom, foodIndex, actions };
    pop = null;
    dropFrom = null;
    root.replaceChildren(h('main', { class: `view view-${state.view}` }, VIEWS[state.view](ctx)), tabs());
    lastToday = ctx.today;
    if (focusKey) {
      const el = root.querySelector(`[data-focus="${focusKey}"]`);
      el?.focus();
      if (sel && el?.setSelectionRange) try { el.setSelectionRange(...sel); } catch { /* not a text field */ }
    }
  }

  let lastToday = null;
  const onVisible = () => { if (document.visibilityState !== 'hidden') render(); };
  const onPrompt = (e) => {
    e.preventDefault();
    deferredPrompt = e;
    set({ install: { ...state.install, canPrompt: true } });
  };
  const onInstalled = () => set({ install: { ...state.install, standalone: true, canPrompt: false } });
  const timer = setInterval(() => { if (today() !== lastToday) render(); }, 60_000);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onInstalled);

  render();

  return {
    actions,
    state: () => state,
    destroy() {
      destroyed = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    },
  };
}
