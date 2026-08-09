import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// base: './' → relative asset paths, works on GitHub Pages subpath (/mark-six-analyzer/)
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '六合彩大數據分析',
        short_name: '六合彩分析',
        description: '六合彩大數據統計、AI推薦、智能選號',
        theme_color: '#1f1633',
        background_color: '#1f1633',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
