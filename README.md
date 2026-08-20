<div align="center">

<img src="src-tauri/icons/128x128.png" width="104" alt="rigseed">

# rigseed

**A desktop client for qBittorrent that brings its own daemon.**

Install it, open it, add a torrent. No server to set up, no WebUI to configure,
no separate qBittorrent install to keep in step.

![version](https://img.shields.io/badge/version-0.1.0-4E7C9B?style=flat-square)
![platform](https://img.shields.io/badge/platform-Windows%20·%20macOS%20·%20Linux-2E343D?style=flat-square)
![tauri](https://img.shields.io/badge/Tauri-2.11-24C8DB?style=flat-square)
![react](https://img.shields.io/badge/React-19.2-58C4DC?style=flat-square)
![rust](https://img.shields.io/badge/Rust-1.77+-B7410E?style=flat-square)
![tests](https://img.shields.io/badge/tests-430%20+%2021-5E8C63?style=flat-square)
![licence](https://img.shields.io/badge/licence-Apache--2.0-8E5A42?style=flat-square)

</div>

---

## What it is

rigseed is a Tauri shell that ships `qbittorrent-nox` alongside it, starts it on
launch, and drives it over the Web API. No C++ or Qt is touched: the daemon is
upstream's own headless build, unmodified.

So it is a **frontend replacement for a dated GUI**, plus the two things the
stock client has never had: a first run that explains itself, and a theming
layer.

| | |
|---|---|
| **Three layouts** | Easy, Grid and List. Easy drops speeds, sizes and ratios entirely, describes every state in plain language, and uses 44px targets. |
| **Eight accents, two modes** | Every colour in the app is a token resolving through `[data-mode][data-accent]`. Switching reskins everything with no re-render, including the taskbar icon. |
| **The API is visible** | Every screen prints the endpoints it exercises in mono. The audience is technical, and it doubles as living documentation. |
| **Its own profile** | The bundled daemon runs under `--profile`, so it never touches a qBittorrent you already have. |
| **Or point at your own** | Remote instances are a first-class mode, not an afterthought. |

## How the daemon works

```
rigseed.exe
├── generates a 32-char password → OS keychain
├── writes qBittorrent.ini       → PBKDF2-HMAC-SHA512, 100k iterations
├── picks a free port            → prefers 43880, asks the OS if taken
└── spawns qbittorrent-nox       → --profile=<app data>, loopback only
```

Four decisions in there are load-bearing:

- **The WebUI binds to `127.0.0.1`.** Nothing but rigseed talks to it, so being
  on the LAN is exposure with no upside, and it turns a taken port from a
  silent hijack into an honest failure.
- **The port is asked for, not assumed.** 8080 is qBittorrent's own default, so
  a user who has enabled their existing WebUI would collide with us on launch.
- **Credentials are never sent to a stranger.** The app checks that whatever
  answered is really qBittorrent before authenticating.
- **HTTP happens in Rust.** qBittorrent answers a foreign `Origin` with 401, and
  a webview cannot send the right one. Requests come from a reqwest client with
  a cookie jar, so they carry no origin at all, which is how every native
  client talks to it, and it keeps CSRF protection switched on.

## The sidecar

Built from upstream's own source, not vendored from a stranger. Nobody publishes
a `qbittorrent-nox` for any platform, so `.github/workflows/build-sidecar.yml`
builds it for all three with `-DGUI=OFF`.

| | qbittorrent-nox | Runtime |
|---|---|---|
| Linux | 16.1 MB | 19.0 MB, 4 Qt and 3 ICU |
| macOS | 15.6 MB | 10.2 MB, 4 Qt frameworks and OpenSSL |
| Windows | 20.1 MB | 5.4 MB, 4 Qt DLLs and the MSVC runtime |

Pinned in [`sidecar.json`](sidecar.json): qBittorrent **5.2.3**, Qt **6.8.3**,
libtorrent **2.0.11**. Every build runs the binary with the build machine's Qt
moved out of the way, because a bundle missing a library runs perfectly on the
machine that built it.

## Getting started

```bash
pnpm install
bash scripts/fetch-sidecar-binary.sh   # downloads the daemon + its Qt runtime
pnpm tauri dev
```

Without the sidecar the app still opens and falls back to sample data, which is
what makes every screen reviewable before a daemon exists. The connection chip
in the top bar always says which it is.

```bash
pnpm test          # 430 frontend tests
cargo test         # 21, in src-tauri
pnpm tauri build   # MSI + NSIS on Windows
```

## Stack

**Tauri 2** · **React 19** · **TypeScript** with `exactOptionalPropertyTypes` ·
**Tailwind 4** CSS-first · **Zustand** · **Vitest** · **Rust 1.77+**

The design system is **Cozy Terminal**, and it is deliberately not Material: the
dominant Android qBittorrent client is Material 3, and following it would make
this read as that app's desktop port.

## Documentation

[`PRODUCT.md`](PRODUCT.md) covers what rigseed is for and who it is for.
[`DESIGN.md`](DESIGN.md) carries the design foundations the app is built
against, machine-readable, next to the code that has to honour them. Every
non-obvious decision is written up in the source, next to the thing it
explains, rather than in a document that drifts away from it.

## Licence

**Apache-2.0**, see [`LICENSE`](LICENSE).

rigseed ships `qbittorrent-nox` as a sidecar. Upstream's source is GPL-2.0-or-later
but **the binary distribution is GPL-3.0-or-later**, because it bundles GPLv3+
assets, and that is the licence governing what we redistribute. Every sidecar
release carries the corresponding source archive on the same release page, which
is what GPLv3 §6(d) asks for. See [`NOTICE`](NOTICE) and `licenses/` for the
detail, including font and icon attribution.

## Maintainer

Built by **[@riganb](https://github.com/riganb)** at **Verastack Labs**.

| | |
|---|---|
| Project, security, conduct | verastack.labs@gmail.com |
| Maintainer, direct | therealriganb@gmail.com |

Bugs and feature requests go through GitHub issues rather than email, since the
templates ask for the version detail that resolves most reports.
