import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Puerto fijo de Scammer = 5180 (water1 usa 5173/517x). strictPort hace que
    // falle en vez de saltar solo a otro puerto, manteniéndolo estable.
    port: 5180,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
