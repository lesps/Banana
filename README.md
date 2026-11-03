# Banana

Log food in bananas. One banana is about 100 calories, so a latte is "1", a burrito bowl is "3", and logging takes one tap. Inspired by the iOS app One Banana.

**Use it:** https://lesps.github.io/Banana/ — install it to your Home Screen and it works offline.

## Features

- **Today**: your total in big numbers and a row of bananas against an optional daily target ("of 20 · 14½ left"); anything past the target goes overripe. Tap `½ 1 1½ 2 3` to log; type what it was first if you like. Recent foods sit in a row of chips that log again in one tap. Every log can be undone.
- **Edit and delete**: tap any entry to change its amount, label or day, or delete it (with Undo).
- **Past days**: step back with `‹` to see or fill in an earlier day.
- **Late nights count toward the day before**: a new day starts at 4 a.m. by default (Settings → New day starts at). Each entry's day is fixed when you log it, so changing this later doesn't move anything.
- **History**: the last 14 days as bars with your target line, the average of the days you logged this past week, and every logged day with its total.
- **Backup**: Settings → Export backup shares or downloads a JSON file. Import shows what the file contains and what it would change before you merge it or replace everything.

## Your data

Everything stays on your device in the browser's storage. Nothing is sent anywhere. That also means the app's storage is the only copy, so:

- **Install the app** (Settings → Install app, or Safari's Share → Add to Home Screen). Browsers can clear storage for sites you haven't installed; Safari does it after seven days of browsing without a visit.
- **Export a backup now and then.** A dot on the Settings tab means you have changes that haven't been backed up for a week or more.

**Merging** a backup keeps the newest version of every entry, so importing an old backup never undoes edits or brings back deleted entries, and importing the same file twice changes nothing. **Replace everything** makes your data exactly the file's (it asks twice).

### Backup format

```json
{
  "format": "banana-log",
  "version": 1,
  "exported": "2026-11-03T13:00:00.000Z",
  "settings": { "targetHalves": 40, "rolloverHour": 4, "updatedAt": 1762174800000 },
  "entries": [
    { "id": "…", "day": "2026-11-03", "ts": 1762174800000, "halves": 3, "label": "Latte", "updatedAt": 1762174800000 }
  ]
}
```

Amounts are in half-bananas (`halves: 3` = 1½ bananas). Deleted entries appear with `"deleted": true`. Full details in [SPEC.md](SPEC.md).

## Development

```bash
npm ci
npm test                              # unit + UI tests
npm run build && npm run test:build   # build, then check dist/
npm run dev                           # http://localhost:5173/
npm run icons                         # regenerate icons from assets/icon.svg
```

Vite, plain ES modules, `vite-plugin-pwa`, Vitest + jsdom. See [CLAUDE.md](CLAUDE.md) for the code layout and conventions.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, a build at `/<repo-name>/`, build checks, then GitHub Pages. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions** once.
