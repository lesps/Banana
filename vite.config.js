import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { splashLinks } from './scripts/splash.js';

const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    { name: 'ios-launch-screens', transformIndexHtml: () => splashLinks(base) },
    VitePWA({
      // New versions download in the background and wait; they take over on the next launch
      // (or when "Restart now" in Settings asks them to), never by reloading the app mid-use.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Banana',
        short_name: 'Banana',
        description: 'Log food in bananas: one banana is about 100 calories. Works offline.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        theme_color: '#fbf6e9',
        background_color: '#fbf6e9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        globIgnores: ['splash/**'], // iOS reads launch screens only when the app is added
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
