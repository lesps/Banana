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

`localStorage` through a wrapper that never throws (falls back to memory): `banana:entries:v1` (array), `banana:settings:v1`, `banana:lastExport:v1` (ms), and `banana:plate:v1` (the plate, a device-only draft that isn't in backups), and `banana:seenVersion:v1` (the last app version this device has seen). If a save fails, a toast says so and asks for an export. The app calls `navigator.storage.persist()` at startup. Ten years at eight entries a day is about 1.5 MB, under the ~5 MB localStorage limit.

## Screens

Bottom tabs: **Today**, **Look up**, **History**, **Settings**. Tapping Today always returns to today. The first time the service worker finishes caching, a toast says the app is ready to work offline.

### Today (the day view)

- Day navigator `‹ Today ›`. `›` is disabled on today. The view always means "today" unless you step back or open a day from History; it follows the rollover while the app is open.
- Total for the day, large, plus a row of banana icons: with a target, one icon per target banana (whole, cut in half, or an empty outline, and bananas past the target drawn overripe, deeper yellow with brown spots); without a target, one icon per banana eaten. A line under it says "of 18" / "4½ left" / "1 over". While something is on the plate, the row adds those bananas in a lighter, wobbling style and the line previews the result ("of 20 · 9½ left after this"). After a log, the bananas it filled pop into the row one after another and the number gives a small bump (once, on the render right after logging; not on Undo; off with reduced motion).
- An optional "What was it?" label field, then quick-add buttons `½ 1 1½ 2 3`, each showing its amount as small bananas under the number. Tapping one **adds it to the plate**; nothing is logged yet.
- **The plate**, below the buttons (so they don't move under your finger when it appears), shown while it has anything on it: a drawn plate with a banana on it for every whole banana added and a cut half for every ½ (item by item, so ½ + ½ is two halves; up to 14 drawn, then a `+N` badge; the newest ones drop onto the plate with a bounce, once, right after they're added, from the buttons, chips, a swipe or Look up), the sum (`1 + 2 + ½ = 3½`, the last 3 amounts with `…` before them, wrapping if needed), **↶** (remove the last amount), **✕** (clear) and **Log 3½**. Log writes one entry for the total on the day being shown, labelled with the typed label, or else the chip names on the plate joined with " + " ("Latte + Croissant"), or else nothing. It then clears the plate and the label and shows `Logged 3½ · Undo`. Enter in the label field also logs the plate. A plate holds up to 100 bananas (one entry's maximum); past that a toast says "A plate holds up to 100 bananas." The plate survives tab switches and closing the app.
- Recent chips, in one horizontally scrolling row: up to 8 distinct recent labels with the amount last used ("Latte · 1½"). One tap adds it to the plate. The label field also suggests up to 50 past labels.
- The day's entries, oldest first: time (only when the entry was logged on its own day, since a back-filled entry's creation time says nothing about when it was eaten), label (or "Food"), amount. Tapping one opens the editor.
- **Swipe actions** on entries. Swipe left past 48 px and let go: the row stays open on a red **Delete** button; swipe right: a yellow **Again** button, which puts the entry's amount and label back on the plate (nothing is logged). A full swipe (45% of the row, at least 140 px) does the action on release; past that point the button fills the row. Delete shows `Deleted · Undo`. Only one row is open at a time; tapping an open row, or anywhere else, closes it. A mostly vertical drag scrolls as usual. The swipe buttons are hidden from screen readers and the tab order; the editor (Delete) and the recent chips (add again) do the same jobs accessibly.

### Editor (dialog)

Amount stepper (− / value / +, ½ steps, min ½), label, day (date input, no future dates), **Save**, **Delete**, **Cancel**. Delete closes the dialog and shows `Deleted · Undo`.

### Look up

A reference for estimating. Nothing here creates or changes an entry. Tapping a portion adds its bananas to the plate, prefills "What was it?" with the food and portion ("Bagel (regular)"; appended after " + " when the field already has text, capped at 200 characters), and goes back to the day being shown, where you can adjust the plate and the label before logging. If the plate is full, a toast says so and the label is left alone.

- A search box. The search survives switching tabs (not reloads).
- Before typing: a hint ("Search a food to see about how many bananas it is. Tap a portion to put it on your plate.") and example searches (bagel, burrito, latte, pizza, beer, salad) that fill the box.
- Results (up to 30, with "Showing 30 of N. Add a word to narrow it down." when there are more): each food's name and up to 4 portions, each as its label, little bananas (up to 10) and the amount in bananas. FNDDS's typical serving is tagged **typical**. Each portion is a button with a **+** ("Add 2½ bananas to the plate (Bagel, regular)"). Portions under ¼ banana show `<½` and can't be added.
- "No match for “…”. Try a simpler word." when nothing matches.
- The food list loads the first time the tab opens ("Loading foods…"), from its own precached chunk, so it works offline; if it fails, "Couldn’t load the food list." with **Try again**.
- A credit line: estimates from USDA FoodData Central (FNDDS 2021–2023), rounded to the nearest ½ banana; restaurant portions often run bigger.

Search: every query word must match the start of a word in the name (any order; case, accents and apostrophes ignored; filler words like "and" and "with" skipped; a plural matches its singular as a whole word, so "tacos" finds "Taco" but "fries" doesn't find "fried"). Hand-kept **aliases** translate everyday words into FNDDS's vocabulary (donut → doughnut, coke → soft drink cola, boba → bubble tea, mac and cheese → macaroni or noodles with cheese); alias matches come first and the literal words are still searched after. Hand-kept **pins** put specific foods first for common one-word searches (egg → fried, boiled, scrambled). Otherwise: names whose first part is the query, then names starting with it, then fewer parts, then shorter names.

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

- At the bottom: "Version 1.8.0 · What's new", and "Update ready … Restart now" while a downloaded update is waiting (see Updates). **What's new** opens the note for the running version, with every earlier release folded under "Earlier updates".

A dot on the Settings tab means a backup is due: there are changes since the last export, and the last export (or the first entry, if never exported) was 7 or more days ago.

## Updates

New versions download in the background whenever the app opens with a connection, and wait. They take over the next time Banana is launched, never by reloading the app while it's in use. While one is waiting, Settings shows "Update ready. It'll apply next time you open Banana. **Restart now**"; Restart now switches over immediately (the page reloads into the new version). Opening the app never waits on the network: everything it needs is in the offline copy.

## What's new

After the app has updated, it shows a note once: the smiling banana, "Updated to 1.7.0", and the bullets for every release since the version this device last saw, newest first (a heading per release when there's more than one), with the older history folded under "Earlier updates". The note opens at the top (focus goes to its heading); a round **✕** pinned to its top corner while it scrolls, or **Got it** at the bottom, closes it. Someone who already has a log but no version on record (they used the app before versions were tracked) gets a catch-up with every release so far. A fresh install, a rollback, or a version with no notes shows nothing. Either way the running version is recorded.

The text comes from `CHANGELOG.md`, bundled at build time: each `## x.y.z — date` heading, an optional intro line and its `- ` bullets, with Markdown emphasis, code and links reduced to plain text and anything under a `###` subheading (e.g. "### Developer") skipped.

## Backup format

```json
{ "format": "banana-log", "version": 1, "exported": "2026-11-03T13:00:00.000Z", "settings": { … }, "entries": [ … ] }
```

File name `banana-YYYY-MM-DD.json`. Exports include deleted markers.

**Merge** (import into existing data): per `id`, keep whichever copy has the newer `updatedAt`; ties keep the local copy. Re-importing the same file changes nothing. Settings merge the same way on their own `updatedAt`, so restoring onto a fresh install takes the file's settings. Invalid entries are skipped and counted; a file with the wrong `format` or an unknown `version` is rejected.

**Replace**: data and settings become exactly the file's.

## Food data

`src/data/foods.json` is generated from USDA FoodData Central's FNDDS 2021–2023 "survey foods" (public domain) by `npm run foods -- path/to/surveyDownload.json` and committed. The build skips baby food, formula, ingredient-only entries and water; strips FNDDS's "not further specified" markers from names ("Yogurt, NFS" → "Yogurt"; "NS as to …" phrases, except the two that run past a comma); drops portions nobody estimates in (cubic inch, teaspoon, fl oz, oz…); keeps the typical serving ("Quantity not specified", folded into a named portion of the same weight, else listed as "serving") plus up to 3 portions nearest it in size; converts each to whole half-bananas; and keeps the first of any foods whose cleaned names collide. About 5,200 foods, 70 KB gzipped. Shape: `{ source, foods: [[foodCode, name, [[portion, halves, typical?], …]], …] }`.

SR Legacy, Foundation and Branded foods were evaluated and left out: SR Legacy is mostly raw ingredients (its 148 chain-restaurant items date from 2018 or earlier), Foundation is 424 raw commodities with sparse portions, and Branded is 434,000 packaged products (37 MB even stripped down) whose calories are printed on the package.

## Look

**Launch screen (iPhone):** while a Home Screen web app starts, iOS shows plain white unless there's a launch image for that exact screen. Banana has one for every iPhone screen size, portrait, light and dark (dark when the phone is in dark mode): the smiling banana with a soft shadow on the app's background. iOS reads them only when the app is added to the Home Screen, so an install from before 1.9.0 has to be removed and added again to get one. They aren't part of the offline download.

Cream and banana yellow, light and dark themes, a faint pattern of scattered banana silhouettes behind the page. Bananas are drawn from one inline SVG sprite: shaded peel, a ridge, a highlight, a green-tinged neck, a stem and a dark tip. A whole banana; a half is the stem half cut open (pale flesh showing) over an empty outline; an empty banana is the outline alone. Past the target they go overripe: deeper yellow with brown spots. The quick buttons use one-colour versions; the empty states show a big banana with a smiling face that sways gently.

## Stack

Vite + vanilla ES modules, `vite-plugin-pwa` (generateSW, `registerType: 'prompt'`; see Updates), Vitest + jsdom, sharp for icons. GitHub Pages via Actions with `BASE_PATH=/<repo>/`. Test-first: pure logic in `src/lib` (no DOM), DOM in `src/ui`, build checks against `dist/`.
