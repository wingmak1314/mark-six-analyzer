import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: './' → relative asset paths, works on GitHub Pages subpath (/mark-six-analyzer/)
export default defineConfig({
  plugins: [react()],
  base: './',
})
