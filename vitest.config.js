import { defineConfig } from 'vitest/config';

export default defineConfig({
  // A DST-observing zone, so day-boundary tests cover the clock change.
  test: { include: ['tests/lib/**/*.test.js', 'tests/ui/**/*.test.js'], env: { TZ: 'America/New_York' } },
});
