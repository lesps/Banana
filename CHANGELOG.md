# Changelog

## 1.5.0 — 2026-11-04

- The plate is now a drawn plate: each banana you add lands on it (a cut half for each ½), dropping in with a bounce. Up to 14 are drawn, with a `+N` badge after that. The sum shows the last 3 amounts.

## 1.4.0 — 2026-11-04

- Swipe actions on logged items: swipe left to delete (with Undo), right for **Again**, which puts the same amount and label back on the plate. A short swipe opens the row on its button; a full swipe acts on release. Tapping still opens the editor.

## 1.3.0 — 2026-11-04

- **The plate**: the quick buttons and recent chips now add bananas to a plate instead of logging right away. The plate shows the sum, previews where it lands against your target (pending bananas in the row, "… left after this"), and **Log** writes it as one entry; ↶ removes the last amount, ✕ clears it. A meal labels itself from its chips when you haven't typed a label. The plate survives closing the app.
- Look up portions are now tappable: they add their bananas to the plate and take you back to the day you were on, to adjust before logging. Nothing from the food database is saved with the entry.

## 1.2.0 — 2026-11-04

- **Look up** tab: search about 5,200 foods from USDA FNDDS 2021–2023 and see each portion in bananas (typical serving tagged, little bananas per portion). Reference only; nothing is logged from it. Works offline; the list is its own 70 KB (gzipped) chunk, loaded the first time the tab opens.
- Everyday-word aliases (donut, coke, boba, mac and cheese, cold brew…) and pinned top results for common searches.
- `npm run foods` regenerates the list from the FNDDS JSON.
- New, more realistic bananas everywhere: shaded peel, ridge, stem and tip; halves are cut open; overripe bananas get brown spots; a smiling banana on empty days. New app icon. Progress-row bananas are bigger (10 to a row).

## 1.1.0 — 2026-11-03

More bananas.

- Quick-add buttons show their amount as small bananas.
- Logged bananas pop into the day's row; the total gives a little bump.
- Bananas past your target go overripe (brown spots), in the row and on History bars; History bars get stems.
- A faint banana pattern behind the page, and a swaying banana on empty days and an empty history.

## 1.0.0 — 2026-11-03

First release.

- Log food in half-banana steps (1 banana ≈ 100 kcal) with one tap, an optional label, recent-food chips and Undo.
- Edit an entry's amount, label or day; delete with Undo. Deleted entries are kept as markers so merges can't bring them back.
- Each entry's day is stamped when it's logged, with a configurable start of day (default 4 a.m.).
- Optional daily target with a banana-icon progress row.
- History: 14-day bars with target line, past-week average over logged days, list of logged days.
- Backup: JSON export (share sheet or download) and import with a preview, last-writer-wins merge, or replace; a reminder dot when a backup is a week overdue.
- Installable offline PWA (GitHub Pages), light and dark themes.
