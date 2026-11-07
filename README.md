# Banana

Log food in bananas. One banana is about 100 calories, so a latte is "1", a burrito bowl is "3", and logging takes one tap. Inspired by the iOS app One Banana.

**Use it:** https://lesps.github.io/Banana/ — install it to your Home Screen and it works offline.

## Features

- **Today**: your total in big numbers and a row of bananas against an optional daily target ("of 20 · 14½ left"); anything past the target goes overripe. Tap `½ 1 1½ 2 3` to add bananas to your plate, as many as you need, then **Log** them; you see where the plate lands against your target before you commit. Type what it was if you like. Recent foods sit in a row of chips you can add again. Every log can be undone.
- **Meals**: **+ Part** splits the plate into sections like a pie chart, a wedge per part sized by its bananas: rice 2, chicken 3, salad 1. The buttons add to the part you've picked (tap its chip or its wedge); recent chips and Look up add their own named part; tap a part to rename it, change it or take it off. Bananas drop onto the plate, bounce and heap up in their wedge. Log saves it as one meal in your day, with its parts underneath; tap it to change any of it.
- **Edit and delete**: tap any entry to change its amount, label or day, or delete it (with Undo). Or swipe: left to delete, right to put it back on your plate ("Again"). Meals swipe as a whole.
- **Past days**: step back with `‹` to see or fill in an earlier day.
- **Late nights count toward the day before**: a new day starts at 4 a.m. by default (Settings → New day starts at). Each entry's day is fixed when you log it, so changing this later doesn't move anything.
- **Look up**: search about 5,200 everyday foods (bagel, burrito, latte, pad thai, Big Mac…) and see each portion in bananas, so you can estimate before you log. Tap a portion to put it on your plate as a part named after it (e.g. "Bagel (regular)"), then adjust it before logging. Works offline.
- **History**: the last 14 days as bars with your target line, the average of the days you logged this past week, and every logged day with its total.
- **What's new**: after each update, a little note says what changed (also in Settings → What's new).
- **Backup**: Settings → Export backup shares or downloads a JSON file. Import shows what the file contains and what it would change before you merge it or replace everything.

## Your data

Everything stays on your device in the browser's storage. Nothing is sent anywhere. That also means the app's storage is the only copy, so:

- **Install the app** (Settings → Install app, or Safari's Share → Add to Home Screen). Browsers can clear storage for sites you haven't installed; Safari does it after seven days of browsing without a visit. On iPhone a smiling banana shows while the app starts; iOS only picks that launch screen up when the app is added, so if you added Banana before version 1.9, export a backup, remove it from the Home Screen, add it again and import the backup.
- **Export a backup now and then.** A dot on the Settings tab means you have changes that haven't been backed up for a week or more.

**Merging** a backup keeps the newest version of every entry, so importing an old backup never undoes edits or brings back deleted entries, and importing the same file twice changes nothing. **Replace everything** makes your data exactly the file's (it asks twice).

### Backup format

```json
{
  "format": "banana-log",
  "version": 2,
  "exported": "2026-11-03T13:00:00.000Z",
  "settings": { "targetHalves": 40, "rolloverHour": 4, "updatedAt": 1762174800000 },
  "entries": [
    { "id": "…", "day": "2026-11-03", "ts": 1762174800000, "halves": 3, "label": "Latte", "updatedAt": 1762174800000 },
    { "id": "…", "day": "2026-11-03", "ts": 1762196400000, "halves": 4, "label": "Rice", "updatedAt": 1762196400000, "meal": { "id": "…", "name": "Dinner" } }
  ]
}
```

Amounts are in half-bananas (`halves: 3` = 1½ bananas). Each part of a meal is its own entry, tied to the others by `meal.id`. Deleted entries appear with `"deleted": true`. Version 1 backups (from before meals) still import; Banana versions before 1.10 can't read version 2. Full details in [SPEC.md](SPEC.md).

## Food data

Look up uses USDA [FoodData Central](https://fdc.nal.usda.gov/)'s FNDDS 2021–2023 "survey foods", which is public domain. To regenerate `src/data/foods.json` after a new FNDDS release, download **Survey Foods (FNDDS), JSON** from the [downloads page](https://fdc.nal.usda.gov/download-datasets), unzip it, and run `npm run foods -- path/to/surveyDownload.json`. Search aliases and pins live in `src/lib/food-aliases.js`.

## Development

```bash
npm ci
npm test                              # unit + UI tests
npm run build && npm run test:build   # build, then check dist/
npm run dev                           # http://localhost:5173/
npm run icons                         # regenerate icons from assets/icon.svg, and the iOS launch screens
npm run foods -- surveyDownload.json  # regenerate the food list
```

Vite, plain ES modules, `vite-plugin-pwa`, Vitest + jsdom. See [CLAUDE.md](CLAUDE.md) for the code layout and conventions.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, a build at `/<repo-name>/`, build checks, then GitHub Pages. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions** once.
