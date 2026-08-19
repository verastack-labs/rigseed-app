# Sidecar binaries

**Nothing here yet, and that is a live decision rather than an oversight.**

`architecture.md` says rigseed bundles `qbittorrent-nox` as a sidecar. Upstream
publishes no such binary. Every qBittorrent release asset is the GUI build:
`.dmg` for macOS, `.AppImage` for Linux, `_setup.exe` for Windows, plus source.
`qbittorrent-nox` is the headless build that distributions compile and package
themselves, so there is nothing to download.

That leaves three ways forward, and it is a product call:

1. **Build it from source per platform in CI.** Heaviest option: needs Qt,
   libtorrent-rasterbar, Boost and OpenSSL toolchains on three targets. It does
   neatly satisfy the GPL corresponding-source obligation, since the exact
   source that produced the binary is already in hand.
2. **Do not bundle.** rigseed becomes a front end for an install the user
   already has, or for a remote instance. Remote connections work this way
   already, so this is the smallest change and it removes the GPL
   redistribution obligation entirely.
3. **Bundle per platform where a package exists.** Linux distributions ship
   `qbittorrent-nox`; macOS and Windows would still need option 1 or 2.

Until that is decided, the app runs without a sidecar. `lib.rs` logs a warning
and carries on, and the frontend uses the mock transport.

## If a binary is vendored

Tauri resolves sidecars by target triple, so on Windows the file is:

    qbittorrent-nox-x86_64-pc-windows-msvc.exe

Re-add it to `tauri.conf.json` under `bundle.externalBin` as
`binaries/qbittorrent-nox`. The build script requires the file to exist, so the
declaration and the binary have to land together.

Redistributing it carries GPL obligations. See `../../licenses/README.md`: every
release that ships it must carry the matching source archive on the same release
page.
