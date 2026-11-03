import { h, stepper } from './dom.js';
import { dayOf, daysBetween, hourLabel, shortDay } from '../lib/day.js';
import { formatHalves, bananaWord, countEntries, MAX_HALVES } from '../lib/units.js';
import { MAX_ROLLOVER } from '../lib/settings.js';
import { mergeBackup, summarize } from '../lib/backup.js';

export const REPO_URL = 'https://github.com/lesps/banana';
const DEFAULT_TARGET = 40; // 20 bananas ≈ 2,000 kcal

export function lastBackupText(lastExport, today, rolloverHour) {
  if (lastExport == null) return 'Last backup: never';
  const n = daysBetween(dayOf(lastExport, rolloverHour), today);
  return `Last backup: ${n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`}`;
}

export function mergePreviewText({ added, updated, removed }) {
  const parts = [added && `adds ${added}`, updated && `updates ${updated}`, removed && `removes ${removed}`].filter(Boolean);
  return parts.length ? `Merging ${parts.join(', ')}.` : 'Merging changes nothing.';
}

function importPreview({ state, today, actions }) {
  const { name, parsed, confirmReplace } = state.importPreview;
  const { count, first, last } = summarize(parsed.entries);
  const range = !count ? '' : first === last ? `, ${shortDay(first, today)}` : `, ${shortDay(first, today)} – ${shortDay(last, today)}`;
  const { report } = mergeBackup({ entries: state.entries, settings: state.settings }, parsed);
  return h('div', { class: 'import-preview', role: 'region', 'aria-label': 'Import preview' },
    h('p', { class: 'file' }, name),
    h('p', {}, `${count ? countEntries(count) : 'No entries'}${range}`),
    h('p', {}, mergePreviewText(report)),
    parsed.skipped > 0 && h('p', { class: 'warn' }, `${parsed.skipped} invalid ${parsed.skipped === 1 ? 'entry' : 'entries'} skipped.`),
    h('div', { class: 'buttons' },
      h('button', { type: 'button', class: 'btn primary', onclick: () => actions.applyImport('merge') }, 'Merge'),
      h('button', { type: 'button', class: `btn danger${confirmReplace ? ' armed' : ''}`, 'data-focus': 'replace', onclick: () => actions.applyImport('replace') },
        confirmReplace ? 'Tap again to replace all data' : 'Replace everything'),
      h('button', { type: 'button', class: 'btn', onclick: actions.cancelImport }, 'Cancel')));
}

export function renderSettings(ctx) {
  const { state, today, actions } = ctx;
  const { targetHalves, rolloverHour } = state.settings;

  const target = stepper({
    value: targetHalves ?? 0,
    label: 'target',
    cls: 'target-stepper',
    focusKey: 'target',
    format: (v) => (v === 0 ? 'No target' : `${formatHalves(v)} ${bananaWord(v)}`),
    prev: (v) => (v > 0 ? v - 1 : null),
    next: (v) => (v === 0 ? DEFAULT_TARGET : v < MAX_HALVES ? v + 1 : null),
    onChange: (v) => actions.setTarget(v),
  });

  const rollover = h('select', { id: 'rollover', 'data-focus': 'rollover', onchange: (e) => actions.setRollover(e.target.value) },
    Array.from({ length: MAX_ROLLOVER + 1 }, (_, hr) => h('option', { value: hr, selected: hr === rolloverHour }, hourLabel(hr))));

  const file = h('input', {
    type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true',
    onchange: async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      actions.importText(await f.text(), f.name);
      e.target.value = '';
    },
  });

  const { install } = state;
  const installRow = install.standalone
    ? h('p', {}, 'Installed. Banana works offline.')
    : install.canPrompt || install.ios
      ? h('button', { type: 'button', class: 'btn primary', onclick: actions.install }, 'Install app')
      : h('p', { class: 'hint' }, 'To install, use your browser’s menu: “Install app” or “Add to Home Screen”.');

  return [
    h('h1', {}, 'Settings'),

    h('section', { class: 'card' },
      h('h2', {}, 'Daily target'),
      target.el,
      h('p', { class: 'hint' }, '1 banana ≈ 100 kcal.')),

    h('section', { class: 'card' },
      h('h2', {}, h('label', { for: 'rollover' }, 'New day starts at')),
      rollover,
      h('p', { class: 'hint' }, 'Anything logged before this counts toward the day before. Changing it doesn’t move entries already logged.')),

    h('section', { class: 'card backup' },
      h('h2', {}, 'Backup'),
      h('p', { class: 'last-backup' }, lastBackupText(state.lastExport, today, rolloverHour)),
      h('div', { class: 'buttons' },
        h('button', { type: 'button', class: 'btn primary', onclick: actions.exportBackup }, 'Export backup'),
        h('button', { type: 'button', class: 'btn', onclick: () => file.click() }, 'Import backup…')),
      file,
      state.importError && h('p', { class: 'import-error', role: 'alert' }, state.importError),
      state.importPreview && importPreview(ctx),
      h('p', { class: 'hint' }, 'Your log lives only on this device. Export a backup now and then; import it to restore or move to a new phone. Merging never loses anything you’ve logged.')),

    h('section', { class: 'card' },
      h('h2', {}, 'App'),
      installRow,
      state.persisted === false && h('p', { class: 'storage-note' },
        'This browser may clear stored data when space runs low. Installing the app and keeping a backup protects your log.')),

    h('p', { class: 'about' }, 'Inspired by One Banana. ', h('a', { href: REPO_URL, target: '_blank', rel: 'noopener' }, 'Source on GitHub')),
  ];
}
