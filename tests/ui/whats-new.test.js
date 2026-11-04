// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount, memoryStorage } from './helpers.js';

const changelog = `# Changelog

## 1.6.0 — 2026-11-04

- Look up fills in **What was it?**.
- <img src=x onerror=alert(1)>

## 1.5.0 — 2026-11-04

- A drawn plate.

## 1.4.0 — 2026-11-04

- Swipes.
`;
const KEY = 'banana:seenVersion:v1';
const storageWith = (seen, entries) => {
  const s = memoryStorage();
  if (seen) s.set(KEY, seen);
  if (entries) s.set('banana:entries:v1', [{ id: 'a', day: '2026-11-03', ts: 1, halves: 2, label: '', updatedAt: 1 }]);
  return s;
};
const dialog = () => document.querySelector('dialog.whats-new');
const sections = () => [...dialog().querySelectorAll('.notes > section')].map((s) => [s.querySelector('h3')?.textContent ?? null, [...s.querySelectorAll('li')].map((li) => li.textContent)]);
const earlier = () => [...(dialog().querySelectorAll('details.earlier section') ?? [])].map((s) => s.querySelector('h3').textContent);

describe('What’s new', () => {
  it('pops up once after an update, with the new version and what changed', () => {
    const storage = storageWith('1.5.0');
    const t = mount({ storage, version: '1.6.0', changelog });
    expect(dialog().hasAttribute('open')).toBe(true);
    expect(dialog().querySelector('h2').textContent).toBe('Updated to 1.6.0');
    expect(sections()).toEqual([[null, ['Look up fills in What was it?.', '<img src=x onerror=alert(1)>']]]);
    expect(dialog().querySelector('img')).toBeNull();
    expect(earlier()).toEqual(['1.5.0', '1.4.0']);
    expect(dialog().querySelector('details.earlier').hasAttribute('open')).toBe(false);
    expect(dialog().querySelector('details.earlier summary').textContent).toBe('Earlier updates');
    expect(storage.get(KEY)).toBe('1.6.0');
    t.button('Got it', dialog()).click();
    expect(dialog()).toBeNull();
    mount({ storage, version: '1.6.0', changelog });
    expect(dialog()).toBeNull();
  });

  it('covers every update since the version last seen, newest first, by version', () => {
    mount({ storage: storageWith('1.4.0'), version: '1.6.0', changelog });
    expect(sections().map((s) => s[0])).toEqual(['1.6.0', '1.5.0']);
    expect(earlier()).toEqual(['1.4.0']);
  });

  it('stays quiet on a fresh install', () => {
    const storage = storageWith(null);
    mount({ storage, version: '1.6.0', changelog });
    expect(dialog()).toBeNull();
    expect(storage.get(KEY)).toBe('1.6.0');
  });

  it('catches up someone who already has a log but no version on record, with every release so far', () => {
    mount({ storage: storageWith(null, true), version: '1.6.0', changelog });
    expect(dialog().querySelector('h2').textContent).toBe('Updated to 1.6.0');
    expect(sections().map((s) => s[0])).toEqual(['1.6.0', '1.5.0', '1.4.0']);
    expect(dialog().querySelector('details.earlier')).toBeNull();
  });

  it('can be closed from the top without scrolling', () => {
    const storage = storageWith('1.5.0');
    mount({ storage, version: '1.6.0', changelog });
    const close = dialog().querySelector('.whats-new-close');
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.compareDocumentPosition(dialog().querySelector('h2')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dialog().querySelector('h2').hasAttribute('autofocus')).toBe(true);
    close.click();
    expect(dialog()).toBeNull();
    mount({ storage, version: '1.6.0', changelog });
    expect(dialog()).toBeNull();
  });

  it('opens at the top: focus goes to the heading, not the button at the bottom', () => {
    mount({ storage: storageWith(null, true), version: '1.6.0', changelog });
    const h2 = dialog().querySelector('h2');
    expect(h2.hasAttribute('autofocus')).toBe(true);
    expect(h2.getAttribute('tabindex')).toBe('-1');
    expect(dialog().scrollTop).toBe(0);
  });

  it('says nothing after a rollback, but records the running version', () => {
    const storage = storageWith('2.0.0');
    mount({ storage, version: '1.6.0', changelog });
    expect(dialog()).toBeNull();
    expect(storage.get(KEY)).toBe('1.6.0');
  });

  it('says nothing when the changelog has no notes for the version', () => {
    mount({ storage: storageWith('1.5.0'), version: '1.7.0', changelog });
    expect(dialog()).toBeNull();
  });

  it('can be reopened from Settings', () => {
    const t = mount({ storage: storageWith(null), version: '1.6.0', changelog });
    t.tab('settings');
    expect(t.$('.version').textContent).toBe('Version 1.6.0');
    t.button('What’s new').click();
    expect(dialog().querySelector('h2').textContent).toBe('What’s new in 1.6.0');
    expect(sections()).toEqual([[null, ['Look up fills in What was it?.', '<img src=x onerror=alert(1)>']]]);
    expect(earlier()).toEqual(['1.5.0', '1.4.0']);
  });
});
