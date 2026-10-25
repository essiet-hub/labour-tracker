import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const base = '/labour-tracker/'

// https://vite.dev/config/
export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    manifest: {
      id: base,
      name: 'Labour Case Tracker',
      short_name: 'Labour',
      description: 'A personal labour reminder tool. Cases stay on this device.',
      lang: 'en-GB',
      start_url: base,
      scope: base,
      display: 'standalone',
      theme_color: '#176b68',
      background_color: '#f5f7f7',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      // All application assets are precached; no third-party runtime caching.
      runtimeCaching: [],
      navigateFallback: `${base}index.html`,
      navigateFallbackAllowlist: [/^\/labour-tracker\//],
    },
  })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Clinical timing logic depends on the local clock – pin it to Hong Kong.
    env: { TZ: 'Asia/Hong_Kong' },
  },
})
