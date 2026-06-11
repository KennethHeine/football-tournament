import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  // Azure Static Web Apps (new static-web convention) deploys `<app_dir>/out`,
  // so emit the production build into `out` instead of Vite's default `dist`.
  build: {
    outDir: 'out',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-192.svg', 'icon-512.svg', 'icon-maskable.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Fodboldturnering - Gratis Kampskema Generator',
        short_name: 'Fodboldturnering',
        description:
          'Gratis online værktøj til at oprette kampskemaer til fodboldturneringer. Lavet til frivillige fodboldtrænere.',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Fonts are self-hosted (@fontsource-variable) and precached as woff2;
        // no runtime caching of external font CDNs (CSP blocks them anyway).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
    },
  },
})
