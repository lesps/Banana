# Banana — spec

A food log where the unit is the banana: 1 banana ≈ 100 kcal. Modeled on the iOS app One Banana. The point is speed: estimating a meal as "about two bananas" is good enough, so logging takes one or two taps. Installable PWA, fully offline, no backend, data lives on the device with JSON export/import.

## Units

Amounts are stored as an integer number of **half-bananas** (`halves`). ½ banana (~50 kcal) is the finest step, which keeps sums exact. Displayed as `½`, `1`, `1½`, `2`… An entry is 1–200 halves.

## Data

### Entry

```json
{ "id": "uuid", "day": "2026-11-03", "ts": 1762174800000, "halves": 3, "label": "Latte", "updatedAt": 1762174800000 }
```

- `id`: random UUID, never reused.
- `day`: the log day (`YYYY-MM-DD`), **stamped when the entry is created**, not derived later. A day runs from the rollover hour (default 4 a.m.) to the rollover hour the next day, so a 1 a.m. snack counts toward the evening before. Changing the rollover hour later never moves existing entries. Editing an entry can move it to another day.
- `ts`: creation time (ms). Orders entries within a day.
- `label`: optional, may be `""`, trimmed, max 200 chars.
- `updatedAt`: set on create and on every edit, delete or restore.
- `deleted: true`: a deleted entry stays as a marker so that importing an older backup can't bring it back. Markers are excluded from every total, list and suggestion. Undoing a delete clears the flag and bumps `updatedAt`.

### Settings

`{ "targetHalves": 36 | null, "rolloverHour": 4, "updatedAt": 0 }`. Target is off (`null`) by default. Rollover hour is 0–11 (midnight to 11 a.m.). `updatedAt` 0 means never changed.

### Storage

`localStorage` through a wrapper that never throws (falls back to memory): `banana:entries:v1` (array), `banana:settings:v1`, `banana:lastExport:v1` (ms). If a save fails, a toast says so and asks for an export. The app calls `navigator.storage.persist()` at startup. Ten years at eight entries a day is about 1.5 MB, under the ~5 MB localStorage limit.

## Screens

Bottom tabs: **Today**, **History**, **Settings**. Tapping Today always returns to today. The first time the service worker finishes caching, a toast says the app is ready to work offline.

### Today (the day view)

- Day navigator `‹ Today ›`. `›` is disabled on today. The view always means "today" unless you step back or open a day from History; it follows the rollover while the app is open.
- Total for the day, large, plus a row of banana icons: with a target, one icon per target banana (filled, half-filled or empty, and bananas past the target drawn overripe, deeper yellow with brown spots); without a target, one icon per banana eaten. A line under it says "of 18" / "4½ left" / "1 over". After a log, the bananas it filled pop into the row one after another and the number gives a small bump (once, on the render right after logging; not on Undo; off with reduced motion).
- An optional "What was it?" label field, then quick-add buttons `½ 1 1½ 2 3`, each showing its amount as small bananas under the number. Tapping one logs that amount with the label (if any) on the shown day, clears the label and shows a toast `Logged 1½ · Undo`.
- Recent chips, in one horizontally scrolling row: up to 8 distinct recent labels with the amount last used ("Latte · 1½"). One tap logs it again. The label field also suggests up to 50 past labels.
- The day's entries, oldest first: time (only when the entry was logged on its own day, since a back-filled entry's creation time says nothing about when it was eaten), label (or "Food"), amount. Tapping one opens the editor.

### Editor (dialog)

Amount stepper (− / value / +, ½ steps, min ½), label, day (date input, no future dates), **Save**, **Delete**, **Cancel**. Delete closes the dialog and shows `Deleted · Undo`.

### History

- Bars for the last 14 days ending today, scaled to the larger of the target and the biggest day, with a dashed target line when a target is set and days over it drawn overripe (spotted). Bars with anything in them carry a little stem. Tapping a bar opens that day.
- "Average X a day over N logged days" for the 7 days before today (days with no entries are left out, since an empty day usually means nothing was logged, not nothing eaten).
- Every day that has entries, newest first: date, total, number of entries. 30 at a time with "Show more". Tapping one opens it in the day view.

### Settings

- **Daily target**: stepper in ½ steps, down to "No target". Stepping up from "No target" starts at 20 bananas (~2,000 kcal).
- **New day starts at**: midnight through 11 a.m. Note: applies to new entries.
- **Backup**: "Last backup: never / today / N days ago". **Export backup** shares the file (Web Share with files) or downloads it, and records the time. **Import backup** opens a file, then shows a preview: entry count, date range, and what a merge would do ("adds 12, updates 3"). **Merge** applies it; **Replace everything** needs a second tap.
- Storage note when `persist()` was not granted: the browser may clear data, so install the app and keep backups.
- Install button (with iPhone/iPad instructions), or a hint to use the browser menu when the browser offers no install prompt; "Installed" when running standalone.

A dot on the Settings tab means a backup is due: there are changes since the last export, and the last export (or the first entry, if never exported) was 7 or more days ago.

## Backup format

```json
{ "format": "banana-log", "version": 1, "exported": "2026-11-03T13:00:00.000Z", "settings": { … }, "entries": [ … ] }
```

File name `banana-YYYY-MM-DD.json`. Exports include deleted markers.

**Merge** (import into existing data): per `id`, keep whichever copy has the newer `updatedAt`; ties keep the local copy. Re-importing the same file changes nothing. Settings merge the same way on their own `updatedAt`, so restoring onto a fresh install takes the file's settings. Invalid entries are skipped and counted; a file with the wrong `format` or an unknown `version` is rejected.

**Replace**: data and settings become exactly the file's.

## Look

Cream and banana yellow, light and dark themes, a faint pattern of scattered bananas behind the page, and the same banana glyph for the progress row, the quick buttons, the Today tab and the empty states (a big, gently swaying banana when a day or the history is empty).

## Stack

Vite + vanilla ES modules, `vite-plugin-pwa` (generateSW, autoUpdate), Vitest + jsdom, sharp for icons. GitHub Pages via Actions with `BASE_PATH=/<repo>/`. Test-first: pure logic in `src/lib` (no DOM), DOM in `src/ui`, build checks against `dist/`.
