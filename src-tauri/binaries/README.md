# Sidecar binaries

Empty by design. `qbittorrent-nox` is downloaded here at build time, never
committed.

## How it gets here

    scripts/fetch-sidecar-binary.sh

That downloads the prebuilt binary for this machine's target triple from the
release named `sidecar-<version>`, where `<version>` is the pin in
`sidecar.json`. It compiles nothing.

The binaries in that release are produced by `.github/workflows/build-sidecar.yml`,
which builds qbittorrent-nox for Linux, Windows and macOS from the pinned upstream
tag with `-DGUI=OFF`. **That workflow does not run on commits or pull requests.**
It runs when the pin in `sidecar.json` changes, or when dispatched by hand, which
is a handful of times a year.

If the release does not exist yet for the pinned version:

    gh workflow run build-sidecar.yml --repo verastack-labs/rigseed-app

## Why we build it rather than vendor someone else's

Upstream publishes no `qbittorrent-nox` for any platform. Every qBittorrent
release asset is the GUI build. Third parties do publish Linux builds, but they
are unaffiliated with upstream and unendorsed by it, and vendoring one would mean
shipping a binary compiled by a stranger under our name.

Upstream's own CMake supports the headless target directly, via
`feature_option(GUI "Build GUI application" ON)`. Building it ourselves is a
supported configuration, not a workaround, and it is the only option that covers
Windows and macOS anyway, since nobody publishes those.

## Declaring it

Tauri resolves sidecars by target triple, so on Windows the file is:

    qbittorrent-nox-x86_64-pc-windows-msvc.exe

Once a binary is present, declare it in `tauri.conf.json` under
`bundle.externalBin` as `binaries/qbittorrent-nox`. The build script requires the
file to exist, so the declaration and the binary have to land together.

The app runs without it: `lib.rs` logs a warning and carries on, and the frontend
falls back to the mock transport.

## Licensing

Shipping this binary carries GPL obligations. See `../../licenses/README.md`.
Every release that ships it must carry the matching source archive on the same
release page, which `build-sidecar.yml` already does by attaching it alongside.
