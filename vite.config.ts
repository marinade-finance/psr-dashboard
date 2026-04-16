import { defineConfig, type PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function spaWithStaticDocs(): PluginOption {
  function rewrite(req: { url?: string; headers: Record<string, string | string[] | undefined> }, next: () => void) {
    const url = req.url ?? ''
    const accept = req.headers.accept as string | undefined
    if (url === '/docs' || url === '/docs/' || url.startsWith('/docs/?') || url.startsWith('/docs/#')) {
      req.url = '/docs/index.html'
    } else if (accept?.includes('text/html') && !url.startsWith('/docs') && !url.includes('.')) {
      req.url = '/index.html'
    }
    next()
  }
  return {
    name: 'spa-with-static-docs',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => rewrite(req, next))
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => rewrite(req, next))
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), spaWithStaticDocs()],
  resolve: {
    alias: { src: path.resolve(__dirname, 'src') },
  },
  build: { outDir: 'build' },
  appType: 'mpa',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
