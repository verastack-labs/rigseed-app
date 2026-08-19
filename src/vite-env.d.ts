import 'vite/client'

/**
 * Development only. Points the dev server, and through it the app, at a real
 * qBittorrent rather than the mock. See `.env.example`.
 *
 * An `import` rather than the scaffolded `/// <reference types="vite/client" />`.
 * A triple-slash reference resolves as a directory package, and vite ships
 * these as a `client.d.ts` file reachable only through its exports map, so the
 * reference silently found nothing and `import.meta.env` had no type at all.
 * An import goes through `moduleResolution: "bundler"`, which does read the
 * exports map.
 *
 * `declare global` because `moduleDetection` is `force`: a bare interface here
 * would be scoped to this file and shadow vite's rather than adding to it.
 */
declare global {
  interface ImportMetaEnv {
    readonly VITE_QBT_URL?: string
    readonly VITE_QBT_USER?: string
    readonly VITE_QBT_PASS?: string
  }
}
