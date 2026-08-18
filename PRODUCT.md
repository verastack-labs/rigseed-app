# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Tauri desktop app - the UI is web technology (React/Tailwind) rendered in a native shell, so the design language is web rather than native OS chrome, for macOS/Windows/Linux.)

## Users

Primary: people who already run qBittorrent on a machine they own and find the stock Qt GUI dated - home-server and NAS owners, seedbox users, media archivists. They are comfortable with the concepts (seeding, ratio, trackers, categories) and want a client that looks and moves like software from this decade.

Secondary: newcomers arriving at torrenting for the first time, usually for Linux ISOs, public-domain archives or game assets. They are served by the **Easy** layout - big cards, plain-language status, few numbers - chosen during first-run setup and switchable at any time.

## Product Purpose

rigseed is a desktop client for qBittorrent. It replaces the stock GUI with a warm, themeable interface over the daemon's existing Web API, and adds the two things the stock client has never had: a first-run experience that sets up look and layout before anything else, and a theming layer where the accent tints every surface rather than recolouring a few highlights.

Success is a user leaving the stock GUI behind and not going back, and a newcomer completing a first download without needing to learn what a ratio is.

## Positioning

A **qBittorrent front end**, not a new torrent engine and not a general download manager. The daemon underneath is named plainly wherever it is real (`qbittorrent-nox 5.0.3 · api 2.11.2` in the footer, `.config/qBittorrent/` config paths, `qBittorrent 5.0.3` in peer-client columns) - the product claim is about the interface, so there is nothing to obscure.

Deliberately **not Material Design**. LibreTorrent, the dominant Android qBittorrent client, is Material 3; following M3 would make rigseed read as the desktop port of the Android app.

## Operating Context

Solo desktop use on a machine the user owns. The app launches and manages `qbittorrent-nox` as a sidecar and talks to it over the Web API, so the local instance needs no login screen. Remote instances (NAS, seedbox, office box) are added as saved connections and switched from the top bar; the bundled instance is pinned and cannot be removed.

Sessions are long-lived and mostly ambient - the window sits open showing live speeds - punctuated by short bursts of work: add a torrent, retag something, check why a tracker is failing.

## Capabilities and Constraints

- Cross-platform desktop app (macOS, Windows, Linux) via Tauri; `qbittorrent-nox` ships as a bundled sidecar
- All torrent operations go through the qBittorrent Web API v2.x - no C++/Qt code is touched
- Live data comes from incremental `sync/maindata` polling keyed by `rid`, merged into a normalised store; never a full replace per tick
- Local credentials are generated on first launch, written into `qBittorrent.conf`, and stored in the OS keychain - the user never sees a login for the bundled instance
- Nine screens designed: Transfers, Torrent Detail, Add Torrent, Search, RSS, Categories & Tags, Logs, Settings, Connections
- Both light and dark ship, eight accents each; theme is app-local and persisted outside qBittorrent's own preferences
- Two fields the API has no home for - category icon and category/tag colour - live in the app's settings file, keyed by name, with a neutral fallback
- Design canvas is 1440×900; minimum supported window 1100×700, below which the Transfers sidebar collapses behind a toggle

## Brand Commitments

- Product name: **rigseed**, lowercase everywhere including sentence-initial
- Brand mark: a cleat glyph - horizontal bar with flared horns at both ends, rope loop rotated −38° across it - drawn in `--accent` at 19–20px, 2px stroke
- The name applies to the app only; strings describing the daemon stay accurate to the software underneath
- Agency umbrella: Verastack Labs (GitHub org `verastack-labs`)
- Visual direction is resolved - see `DESIGN.md`: warm low-contrast neutrals, user-chosen accent tinting every surface, monospace reserved for data
- No Material patterns: no ripple, no tonal elevation, no pill FAB

## Evidence on Hand

None. Pre-build project - no screenshots of a shipping build, no usage data, no testimonials. The `.dc.html` files under `docs/design-references/` are prototypes, not evidence; do not present them as product screenshots.

## Product Principles

1. The accent is a reskin, not a highlight - picking it tints every neutral surface by a percentage of itself.
2. Monospace means data. Sizes, speeds, ratios, hashes, IPs and API paths are mono; every sentence and label is Inter.
3. Plain language beats correct jargon where a newcomer can see it. Pause/Resume for a running torrent, Start/Stop only at 0% and 100%, never mixed.
4. Every screen states the API endpoints it exercises in a small mono line. It doubles as developer documentation in the UI, so keep it accurate.
5. Paused and stalled states are never accent-coloured. Attention is a scarce resource spent on live things.
