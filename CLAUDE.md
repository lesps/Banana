# CLAUDE.md

Banana: an offline-first PWA for logging food in bananas (1 banana ≈ 100 kcal), modeled on the iOS app One Banana. No backend; everything lives in `localStorage` on the device, with JSON export/import. `SPEC.md` describes the behaviour and data format and is kept accurate to the code.

## Stack
Vite 8 + vanilla ES modules (no framework), `vite-plugin-pwa` (generateSW, autoUpdate), Vitest 5 + jsdom, sharp (icon script only), `@fontsource/fredoka` (500/600, numbers and headings; body text is the system font).

## Commands
```bash
npm ci
npm test                              # tests/lib + tests/ui (TZ=America/New_York, set in vitest.config.js)
npm run build && npm run test:build   # tests/build runs against dist/
npm run dev | npm run preview
npm run icons                         # regenerate public/ icons from assets/icon.svg; commit the output
BASE_PATH=/banana/ npm run build      # sub-path build (CI sets /<repo-name>/)
```

## Layout
- `src/lib/` — pure logic, no DOM.
  - `units.js`: amounts are integer **half-bananas** (`halves`). `formatHalves` (3 → `1½`), `clampHalves` (1..`MAX_HALVES` 200), `QUICK_HALVES` [1,2,3,4,6], `bananaRow(total, target, cap=40)` → `{ icons: [{ fill: 0|1|2, over }], more }`, `bananaWord`, `countEntries`.
  - `day.js`: days are local `'YYYY-MM-DD'` strings (they sort chronologically). `dayOf(ts, rolloverHour)` (before the rollover hour counts as the previous day), `addDays`/`daysBetween` (step via local noon, DST-safe), `isDay`, `formatDay` ("Today", "Yesterday", "Fri, Oct 30", year only if different), `shortDay`, `weekdayLetter`, `formatTime`, `hourLabel`. All formatting is `en-US`.
  - `log.js`: entry operations, all returning new arrays. `createEntry`, `addEntry`, `updateEntry` (halves/label/day only; invalid day ignored), `deleteEntry` (sets `deleted: true`), `restoreEntry`; every change sets `updatedAt`. Views over live entries: `live`, `entriesForDay`, `dayTotal`, `daySummaries`, `recentLabels`, `series(entries, endDay, n)`, `recentAverage(entries, today)` (logged days among the 7 before today), `backupDue(entries, lastExport, now)`.
  - `settings.js`: `DEFAULT_SETTINGS` `{ targetHalves: null, rolloverHour: 4, updatedAt: 0 }`, `sanitizeSettings`, `MAX_ROLLOVER` 11.
  - `backup.js`: `exportData`, `backupFilename`, `parseBackup` (validates, skips and counts bad entries, keeps the newest copy of a repeated id), `validEntry`, `mergeBackup` (last writer wins per id on `updatedAt`, ties keep local; settings merge on their own `updatedAt`; returns `report { added, updated, removed, unchanged }`), `summarize`.
- `src/ui/` — DOM.
  - `app.js`: `mountApp(root, { storage, now, saveFile, env })` → `{ actions, state(), destroy() }`. Owns state and persistence, renders the current view plus the tab bar on every change (whole-view re-render; focus and caret restored through `data-focus`). The label being typed (`draft`) lives outside state so typing doesn't re-render; so does `pop` (`{ day, from }`, the day's total just before a log), which the next render passes to the Today view and then clears, so the just-logged bananas animate exactly once. `state.day` is `null` while following today. Storage keys `banana:entries:v1`, `banana:settings:v1`, `banana:lastExport:v1` (`KEYS`). Listens for `visibilitychange` and checks every minute so "today" follows the rollover.
  - `today.js`, `history.js`, `settings.js`: view renderers taking `{ state, today, day, draft, setDraft, pop, actions }` and returning nodes. `today.js` also exports `emptyState(text)` (the swaying banana, shared with History) and `statusText`. Icons whose fill grew since `pop.from` get `.pop` and a `--i` stagger index; history bars with no entries get `.zero` (no stem). `editor.js`: the edit dialog (owns its own draft values until Save). `dom.js`: `h()`, `stepper()`, `openDialog`/`closeDialog` (falls back to the `open` attribute where `showModal` is missing, e.g. jsdom). `toast.js` (one at a time, optional action button), `install.js` (`detectEnv`, iOS install help), `files.js` (`saveFile`: Web Share with files, else download; resolves `false` when the share sheet is cancelled), `storage.js` (`createStorage(backend)`: JSON get/set/remove that never throw; localStorage or memory).
- `src/main.js`: entry point (fonts, CSS, `navigator.storage.persist()`, SW registration). Untested by design; keep logic out of it.
- `src/styles.css`: tokens with light/dark themes. Every banana is a CSS mask of `--glyph` (on `:root`); the same path is the Today tab icon in `app.js` and is baked into `--pattern`, the tiled page background (one tile per theme, fill colour inlined). `.b` colours come from `--fill`/`--rest` (the quick buttons' `.mini` icons override them); `.b.over` is overripe (`--ripe` plus `--spots`), as are `.bar.over` fills. `assets/icon.svg` is the app icon source.
- `tests/lib`, `tests/ui` (jsdom via `// @vitest-environment jsdom`; `tests/ui/helpers.js` mounts with memory storage, a controllable clock and a recording `saveFile`), `tests/build` (separate config `vitest.build.config.js`).
- `.github/workflows/deploy.yml`: test, build, build tests, deploy to GitHub Pages on push to `main`.

## Rules
- TDD: write or update the failing test first. Flag any untested change.
- User text goes through `textContent` (the `h()` children). `h(..., { html })` is for static markup only, never data.
- Never derive an entry's day from its timestamp after creation; `day` is stamped once (see SPEC "Entry").
- Never hard-delete entries: deletion is a `deleted: true` marker so merges can't resurrect it.
- Changing the backup format means bumping `VERSION` in `backup.js` and keeping `parseBackup` able to read version 1.
- Keep README, CHANGELOG, SPEC and this file accurate to the code.
