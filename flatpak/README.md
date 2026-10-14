# Flathub packaging

`dev.verastack.rigseed.yml` is the manifest Flathub builds from. It is tested
on every pull request that touches the app or this directory, by
`.github/workflows/flatpak.yml`.

## Why the GNOME runtime, and why Qt is built from source

rigseed is two programs with opposite needs. The app is Tauri and needs
`webkit2gtk-4.1`. `qbittorrent-nox` needs Qt 6. Both runtimes were checked
rather than assumed:

| | `org.gnome.Platform//47` | `org.kde.Platform//6.10` |
| --- | --- | --- |
| `libwebkit2gtk-4.1` | yes | no |
| `libQt6Core` and friends | no | yes |

Neither has both, so one of them has to be built. WebKitGTK is one of the
largest builds in existence and a non-GUI Qt is about seven minutes, so the
runtime is GNOME and Qt comes from source. `qtbase` with `FEATURE_gui=OFF`
gives exactly the Core, Network, Sql and Xml that `CheckPackages.cmake` asks
for when `GUI=OFF`, plus the OpenSSL TLS backend and the SQLite driver as
plugins. `qttools` is there only because qBittorrent requires `LinguistTools`
unconditionally and it is not in `qtbase`.

## Why these versions

They are the ones `sidecar.json` pins, not the ones upstream's own Flathub
manifest uses:

| | here | `org.qbittorrent.qBittorrent` |
| --- | --- | --- |
| qBittorrent | 5.2.3 | 5.2.4 |
| libtorrent | 2.0.11 | 1.2.x |
| boost | 1.90.0 | 1.86.0 |

Taking upstream's would put a different BitTorrent engine in the Flatpak than
in the `.deb`: different disk I/O, different v2 torrent support, different
memory behaviour. One daemon everywhere is worth more than a recipe somebody
else has already debugged.

## The source lists are generated, never committed

`cargo-sources.json` and `node-sources.json` are derived entirely from
`Cargo.lock` and `pnpm-lock.yaml`. A committed copy is one more hand
maintained duplicate of a fact that lives somewhere else, which is exactly
the failure mode this repository keeps finding. CI regenerates them on every
run and uploads them as an artifact; the Flathub repository gets a generated
copy at submission time.

To make them by hand:

```sh
pip install aiohttp tomlkit "git+https://github.com/flatpak/flatpak-builder-tools.git#subdirectory=node"
curl -fsSLO https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/cargo/flatpak-cargo-generator.py
python3 flatpak-cargo-generator.py -o flatpak/cargo-sources.json src-tauri/Cargo.lock
flatpak-node-generator pnpm pnpm-lock.yaml --pnpm-store-version v11 -o flatpak/node-sources.json
```

`--pnpm-store-version` is the pnpm **store directory** version, not the
lockfile version. Lockfile 9 maps to `v10` or `v11` and nothing else, so
passing `9` raises `ValueError`. `package.json` pins `pnpm@11.17.0`, and pnpm
11 lays its store out as `v11`. The difference is not cosmetic: `v11` writes
`storeDir` into `pnpm-workspace.yaml` while `v10` writes `store-dir` into
`.npmrc`, and the wrong one fails as an offline install that cannot find its
packages.

## Things that are not obvious

- **pnpm is a declared source.** It is in neither the base SDK nor the node
  extension, and corepack would try to download it, which the sandbox
  forbids. The published tarball is pinned to the version `package.json`
  names and run straight off disk.
- **`QT_PLUGIN_PATH` is not set here.** `src-tauri/src/packaging.rs` detects
  the sandbox and `lib.rs` skips the variable, because the daemon is built
  against the runtime's Qt and finds its own plugins. Setting it would point
  Qt at a directory with no plugins in it and the daemon would lose its TLS
  backend, which is silent until a tracker is contacted.
- **The desktop file is renamed.** Flathub wants it named for the app id; the
  bundler names it after `productName`. The metainfo's `launchable` is
  rewritten to match, since only one of the two names can be in the file and
  the `.deb` needs the other.
- **The in-app updater turns itself off.** A store owns its own updates, and
  `packaging.rs` is what tells the app it is in one.

## What this does not touch

The `.deb`, `.rpm` and AppImage still bundle the prebuilt `qbittorrent-nox`
from `sidecar.json`, exactly as before. Building from source applies only
inside the Flatpak sandbox, because Flathub does not accept precompiled
binaries.

## Submitting

Flathub takes a pull request against the `new-pr` branch of
`flathub/flathub`, carrying this manifest and the two generated source lists.
The app id must match a domain under our control, and
`appstreamcli validate` must pass, which CI already checks on the metainfo
as installed.
