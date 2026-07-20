import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    // Three.js is intentionally kept in the initial bundle; the compressed output is ~172 kB.
    chunkSizeWarningLimit: 700,
  },
})
