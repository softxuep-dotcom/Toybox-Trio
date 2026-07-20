import { defineConfig } from 'vite'

export default defineConfig({
  // Keep every production URL relative so one build works on Poki and GitHub Pages.
  base: './',
  build: {
    // Three.js and Rapier ship together for a self-contained Poki-compatible build.
    chunkSizeWarningLimit: 3000,
  },
})
