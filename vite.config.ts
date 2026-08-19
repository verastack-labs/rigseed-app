import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  /**
   * Point the dev server at a real qBittorrent.
   *
   * `VITE_QBT_URL=http://127.0.0.1:8080 pnpm dev` and the app talks to that
   * daemon instead of the mock. Without it, nothing changes.
   *
   * A proxy rather than letting the page call the daemon directly, because the
   * session is an `SID` cookie: cross-origin it needs qBittorrent's CSRF and
   * host-header checks turned off, which is asking a user to weaken their
   * daemon to run our dev server. Through the proxy everything is same-origin
   * and the cookie simply works.
   */
  const daemon = env['VITE_QBT_URL']

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 1420,
      strictPort: true,
      ...(daemon
        ? {
            proxy: {
              '/api': {
                target: daemon,
                changeOrigin: true,
                // qBittorrent checks that Referer matches its own origin, and
                // changeOrigin only rewrites Host.
                headers: { Referer: daemon },
              },
            },
          }
        : {}),
    },
    build: {
      // Tauri targets a known webview, so there is no need to transpile down.
      target: 'esnext',
      sourcemap: true,
    },
  }
})
