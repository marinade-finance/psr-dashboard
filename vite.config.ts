import { defineConfig } from 'vitest/config'
import type { PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite's `appType: 'mpa'` disables the default SPA fallback. Routes like
// `/docs`, `/expert-docs`, `/bonds` etc. need to resolve to /index.html so
// the React router can pick them up. Static assets (markdown, images) and
// the bundler's own URLs (/@vite/, /@react-refresh) must pass through.
function spaFallback(): PluginOption {
  function rewrite(
    req: {
      url?: string
      headers: Record<string, string | string[] | undefined>
    },
    next: () => void,
  ) {
    const url = req.url ?? ''
    const accept = req.headers.accept as string | undefined
    if (
      accept?.includes('text/html') &&
      !url.includes('.') &&
      !url.startsWith('/@')
    ) {
      req.url = '/index.html'
    }
    next()
  }
  return {
    name: 'spa-fallback',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => rewrite(req, next))
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => rewrite(req, next))
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), spaFallback()],
  resolve: {
    alias: { src: path.resolve(__dirname, 'src') },
  },
  define: {
    'process.env': {},
  },
  build: { outDir: 'build' },
  appType: 'mpa',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
