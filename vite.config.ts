import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // maplibre-gl v5 ships its own Web Workers as ES modules.
  // We'll let Vite pre-bundle the main library but we handle the worker format below.
  optimizeDeps: {
    include: ['maplibre-gl'],
  },

  // Emit worker chunks as ES modules (required for maplibre-gl v5).
  worker: {
    format: 'es',
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})