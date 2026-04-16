import { defineConfig, type PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function spaWithStaticDocs(): PluginOption {
  return {
    name: 'spa-with-static-docs',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        if (
          req.headers.accept?.includes('text/html') &&
          !url.startsWith('/docs') &&
          !url.includes('.')
        ) {
          req.url = '/index.html'
        }
        next()
      })
    },
    configureServer(server) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? ''
          if (
            req.headers.accept?.includes('text/html') &&
            !url.startsWith('/docs') &&
            !url.includes('.')
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
