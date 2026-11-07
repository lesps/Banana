// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, at, memoryStorage } from './helpers.js';

const DAY = 86_400_000;
const backup = (entries, settings) => JSON.stringify({ format: 'banana-log', version: 1, exported: 'x', settings, entries });
const entry = (id, day, halves, updatedAt = 1, extra = {}) => ({ id, day, ts: updatedAt, halves, label: id, updatedAt, ...extra });

describe('Settings: target and day start', () => {
  it('steps the target in halves down to "No target"', () => {
    const t = mount();
    t.tab('settings');
    const out = () => t.$('.target-stepper output').textContent;
    expect(out()).toBe('No target');
    expect(t.$('.target-stepper .minus').disabled).toBe(true);
    t.$('.target-stepper .plus').click();
    expect(out()).toBe('20 bananas');
    t.$('.target-stepper .plus').click();
    expect(out()).toBe('20½ bananas');
    t.$('.target-stepper .minus').click();
    expect(t.app.state().settings.targetHalves).toBe(40);
    for (let i = 0; i < 39; i++) t.$('.target-stepper .minus').click();
    expect(out()).toBe('½ banana');
    t.$('.target-stepper .minus').click();
    expect(out()).toBe('No target');
    expect(t.app.state().settings.updatedAt).toBe(at(2026, 11, 3, 12));
  });

  it('changes the rollover hour for new entries only', () => {
    const t = mount({ time: at(2026, 11, 3, 1, 30) });
    t.logNow('1');
    t.tab('settings');
    const select = t.$('#rollover');
    expect([...select.options].map((o) => o.textContent).slice(0, 3)).toEqual(['Midnight', '1 a.m.', '2 a.m.']);
    expect(select.value).toBe('4');
    t.change(select, '0');
    t.tab('today');
    expect(t.total()).toBe('0');
    t.logNow('2');
    expect(t.app.state().entries.map((e) => e.day)).toEqual(['2026-11-02', '2026-11-03']);
  });
});

describe('Settings: backup', () => {
  it('exports a backup file and records when', async () => {
    const t = mount();
    t.logNow('1');
    t.tab('settings');
    expect(t.$('.last-backup').textContent).toBe('Last backup: never');
    t.button('Export backup').click();
    await t.tick();
    expect(t.saved).toHaveLength(1);
    expect(t.saved[0].name).toBe('banana-2026-11-03.json');
    const data = JSON.parse(t.saved[0].text);
    expect(data).toMatchObject({ format: 'banana-log', version: 2 });
    expect(data.entries).toHaveLength(1);
    expect(t.$('.last-backup').textContent).toBe('Last backup: today');
  });

  it('doesn’t record a cancelled export', async () => {
    const t = mount({ saveFile: async () => false });
    t.tab('settings');
    t.button('Export backup').click();
    await t.tick();
    expect(t.$('.last-backup').textContent).toBe('Last backup: never');
  });

  it('shows how long ago the last backup was', () => {
    const storage = memoryStorage();
    storage.set('banana:lastExport:v1', at(2026, 10, 30, 9));
    const t = mount({ storage });
    t.tab('settings');
    expect(t.$('.last-backup').textContent).toBe('Last backup: 4 days ago');
  });

  it('previews an import, then merges it', () => {
    const t = mount();
    t.logNow('1');
    t.tab('settings');
    t.app.actions.importText(backup([entry('a', '2026-10-01', 2), entry('b', '2026-11-02', 3), { bad: true }]), 'banana-2026-11-02.json');
    const preview = t.$('.import-preview');
    expect(preview.textContent).toContain('banana-2026-11-02.json');
    expect(preview.textContent).toContain('2 entries, Oct 1 – Nov 2');
    expect(preview.textContent).toContain('Merging adds 2.');
    expect(preview.textContent).toContain('1 invalid entry skipped.');
    t.button('Merge', preview).click();
    expect(t.$('.import-preview')).toBeNull();
    expect(t.toast().textContent).toBe('Merged: added 2.');
    expect(t.app.state().entries).toHaveLength(3);
  });

  it('replace needs a second tap and swaps in the file’s data and settings', () => {
    const t = mount();
    t.logNow('1');
    t.tab('settings');
    const settings = { targetHalves: 30, rolloverHour: 3, updatedAt: 1 };
    t.app.actions.importText(backup([entry('a', '2026-10-01', 2)], settings), 'f.json');
    t.button('Replace everything').click();
    expect(t.app.state().entries).toHaveLength(1);
    expect(t.button('Tap again to replace all data')).toBeDefined();
    t.button('Tap again to replace all data').click();
    expect(t.app.state().entries.map((e) => e.id)).toEqual(['a']);
    expect(t.app.state().settings).toEqual(settings);
    expect(t.toast().textContent).toBe('Replaced with 1 entry from the file.');
  });

  it('cancel closes the preview', () => {
    const t = mount();
    t.tab('settings');
    t.app.actions.importText(backup([entry('a', '2026-10-01', 2)]), 'f.json');
    t.button('Cancel', t.$('.import-preview')).click();
    expect(t.$('.import-preview')).toBeNull();
    expect(t.app.state().entries).toEqual([]);
  });

  it('shows import errors', () => {
    const t = mount();
    t.tab('settings');
    t.app.actions.importText('{"format":"other"}', 'f.json');
    expect(t.$('.import-error').textContent).toMatch(/isn’t a Banana backup/);
  });

  it('reads the chosen file', async () => {
    const t = mount();
    t.tab('settings');
    const input = t.$('input[type=file]');
    const file = new File([backup([entry('a', '2026-10-01', 2)])], 'pick.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 20));
    expect(t.$('.import-preview').textContent).toContain('pick.json');
  });

  it('marks the Settings tab when a backup is due', () => {
    const t = mount();
    t.logNow('1');
    expect(t.$('.tabs button[data-view="settings"] .dot')).toBeNull();
    t.clock.advance(8 * DAY);
    t.tab('today');
    expect(t.$('.tabs button[data-view="settings"] .dot')).not.toBeNull();
  });
});

describe('Settings: storage and install', () => {
  it('warns when storage is not persistent', () => {
    const t = mount();
    t.app.actions.setPersisted(false);
    t.tab('settings');
    expect(t.$('.storage-note').textContent).toMatch(/may clear/);
    t.app.actions.setPersisted(true);
    expect(t.$('.storage-note')).toBeNull();
  });

  it('offers install help on iPhone', () => {
    const t = mount({ env: { standalone: false, ios: true } });
    t.tab('settings');
    t.button('Install app').click();
    expect(document.querySelector('dialog.ios-help')).not.toBeNull();
  });

  it('hides install when already installed', () => {
    const t = mount({ env: { standalone: true, ios: true } });
    t.tab('settings');
    expect(t.button('Install app')).toBeUndefined();
  });

  it('credits the food data', () => {
    const t = mount();
    t.tab('settings');
    expect(t.$('.about').textContent).toMatch(/Food estimates: USDA FoodData Central \(FNDDS 2021–2023\), public domain\./);
  });
});
