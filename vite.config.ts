import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; the Pages workflow sets PAGES_BASE, the app and Android build keep '/'
  base: process.env.PAGES_BASE ?? '/',
  // the version shown under the name on the web (only the number goes in, not the whole package.json)
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
