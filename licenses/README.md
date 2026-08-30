# Licences and redistribution

rigseed's own code is Apache-2.0 (see `../LICENSE`). This folder covers the third-party
software that ships inside a rigseed build, and the obligations that come with it.

The obligation that actually constrains the release pipeline is the sidecar. Read that
section before cutting a release.

## The sidecar: qbittorrent-nox

rigseed launches and manages `qbittorrent-nox` as a sidecar process and talks to it over
its HTTP Web API. The exact build shipped is pinned in `../sidecar.json`.

### What licence applies

Upstream `COPYING` draws a distinction that is easy to get wrong:

| What | Licence |
|---|---|
| qBittorrent **source code** | GPL-2.0-or-later |
| qBittorrent **binary distribution** | GPL-3.0-or-later |

The binary is GPLv3+ because it bundles GPLv3+ assets such as images. rigseed ships the
binary, so **GPL-3.0-or-later is the licence that governs what we redistribute.** Both
texts are included here because both are referenced by upstream, along with the OpenSSL
linking exception in `qbittorrent/COPYING.txt`.

### Does this affect rigseed's own licence?

No. rigseed and `qbittorrent-nox` are separate programs. They run as separate processes
and communicate over HTTP. No qBittorrent source is compiled into rigseed, and rigseed is
not a derivative work of it. This is mere aggregation, and rigseed stays Apache-2.0.

What the GPL does create is a set of obligations attached to redistributing that binary.
Those are distribution obligations, not licensing ones.

### How we satisfy GPLv3 section 6

GPLv3 offers several ways to provide Corresponding Source. The one that fits how rigseed
is distributed is **section 6(d)**: when object code is conveyed by offering access from a
designated place, offering equivalent access to the Corresponding Source from the same
place, at no further charge, satisfies the requirement.

rigseed is distributed through GitHub Releases. So the rule is:

> Every release that ships the `qbittorrent-nox` binary must carry the matching
> `qbittorrent-nox` source archive as an asset on that same release.

Not a link to upstream. The same release page, so a person who downloads the binary can
download the corresponding source from where they got the binary.

`scripts/fetch-sidecar-source.sh` retrieves the archive for the pinned version, and
`.github/workflows/release.yml` attaches it. `.github/workflows/compliance.yml` fails a
pull request that changes `sidecar.json` without the licence bundle still lining up.

### If the pinned version changes

Bumping `sidecar.json` means the previously attached source archive no longer corresponds
to the shipped binary. Re-run the fetch script and confirm the release workflow attaches
the new archive. A version bump and a stale source archive is the most likely way this
compliance quietly breaks.

### The sidecar is self-built, so the obligation is wider than the tarball

This was written as a hypothetical - *if* rigseed ever ships a self-built sidecar - and it
is not one. Upstream publishes no `qbittorrent-nox` for any platform, only GUI builds, so
`.github/workflows/build-sidecar.yml` compiles it from the pinned tag with `-DGUI=OFF`.
rigseed has always shipped a binary it built itself.

That widens Corresponding Source. GPLv3 defines it to include "the scripts used to control
compilation and installation", not only the upstream sources. For rigseed that means:

| Part | Where it is |
|---|---|
| Upstream sources at the pinned tag | `qbittorrent-nox-<version>-source.tar.gz`, attached to every release |
| The exact toolchain pairing | `sidecar.json`, the `build` block |
| The scripts that control the build | `.github/workflows/build-sidecar.yml` |

The first is an asset on the release. The other two are files in this repository, which
satisfies 6(d) only while this repository is publicly readable from the same place the
binary is offered. **If this repository is ever made private again, the release assets stop
being sufficient on their own** and the build scripts have to be attached to the release
instead.

### Still open: the sidecar's own dependencies

`qbittorrent-nox` links Qt, libtorrent-rasterbar, Boost, OpenSSL and zlib, and the Qt
libraries are redistributed inside the installer alongside it. `licenses/qbittorrent/`
holds the GPL texts and qBittorrent's own `COPYING`; it does **not** yet hold the licence
texts of those five, and it should, because we ship their compiled output.

Qt is the pressing one, since `Qt6Core`, `Qt6Network`, `Qt6Sql` and `Qt6Xml` are physically
in the bundle. Qt Base under LGPLv3 carries relinking obligations that the others do not.

Flagged rather than solved. The versions to collect for are the ones pinned in
`sidecar.json`.

## Fonts

Inter and JetBrains Mono are both SIL Open Font License 1.1. OFL permits bundling and
redistribution as part of a larger work. The one restriction worth remembering: a modified
version may not be distributed under the reserved font names.

- `fonts/Inter-OFL.txt`
- `fonts/JetBrainsMono-OFL.txt`

## Icons

Lucide is ISC licensed, which requires the copyright notice be retained.

- `lucide/ISC.txt`

## Checklist before publishing a release

1. `sidecar.json` names the version actually bundled.
2. The sidecar source archive for that exact version is attached to the release.
3. `qbittorrent/COPYING.GPLv3.txt` ships alongside the binary in the installed layout.
4. Font and icon licence texts ship with the app bundle.
5. `../NOTICE` is accurate for the versions in this build.
