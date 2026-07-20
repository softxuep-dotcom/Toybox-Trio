import { defineConfig } from 'vite'

export default defineConfig({
  // Keep every production URL relative so one build works on Poki and GitHub Pages.
  base: './',
  build: {
    // Three.js is intentionally kept in the initial bundle; the compressed output is ~172 kB.
    chunkSizeWarningLimit: 700,
  },
})
