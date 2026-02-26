import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function spaFallbackExcludeDocs(): PluginOption {
  return {
    name: 'spa-fallback-exclude-docs',
    configureServer(server) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          if (
            req.headers.accept?.includes('text/html') &&
            !req.url?.startsWith('/docs')
          ) {
            req.url = '/index.html'
          }
          next()
        })
      }
    },
    configurePreviewServer(server) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          if (
            req.headers.accept?.includes('text/html') &&
            !req.url?.startsWith('/docs')
          ) {
            req.url = '/index.html'
          }
          next()
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallbackExcludeDocs()],
  resolve: {
    alias: { src: path.resolve(__dirname, 'src') },
  },
  build: { outDir: 'build' },
  appType: 'mpa',
})
