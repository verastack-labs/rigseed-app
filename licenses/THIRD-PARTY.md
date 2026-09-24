# Third-party software in rigseed

rigseed bundles `qbittorrent-nox` and the libraries it needs. This file lists what is
redistributed, on which platform, and under what terms. Every text referenced here is
attached to the same release as the installers.

rigseed's own code is Apache-2.0. `qbittorrent-nox` is GPLv3-or-later as a binary, and its
complete source is attached to this release as `qbittorrent-nox-<version>-source.tar.gz`.

## What ships, and where

Established from the published runtime bundles rather than from the build scripts, because
the platforms differ.

| Component | Version | Windows | macOS | Linux | Licence | Text |
|---|---|---|---|---|---|---|
| Qt Base (Core, Network, Sql, Xml) | 6.8.3 | DLLs | frameworks | shared objects | LGPL-3.0 | `qt-LGPL-3.0-only.txt` |
| Qt DBus | 6.8.3 | no | no | shared object | LGPL-3.0 | as above |
| Qt plugins (TLS, SQL, network) | 6.8.3 | yes | yes | yes | LGPL-3.0 | as above |
| ICU | 73 | no | no | yes | Unicode | `icu-LICENSE.txt` |
| OpenSSL | 3.x | linked in | `libssl.3`, `libcrypto.3` | system's, not ours | Apache-2.0 | `openssl-LICENSE-Apache-2.0.txt` |
| libtorrent-rasterbar | 2.0.11 | linked in | linked in | linked in | BSD-3-Clause | `libtorrent-LICENSE-BSD-3-Clause.txt` |
| Boost | 1.90.0 | linked in | linked in | linked in | BSL-1.0 | `boost-LICENSE-1.0.txt` |
| zlib | 1.3.x | linked in | linked in | linked in | zlib | `zlib-LICENSE.txt` |
| Microsoft Visual C++ runtime | 14.x | yes | no | no | Microsoft redistributable terms | see below |

"Linked in" means statically linked into `qbittorrent-nox`. It is still redistribution: a
BSD-3-Clause notice is owed for a binary that contains the code, which is why libtorrent's
text is here.

Linux takes OpenSSL from the system rather than shipping it, so nothing is redistributed
there. The text is attached anyway, because one release page serves all three platforms and
sorting out which file applies to your download is worse than having one spare.

## Qt and the LGPL

Qt Base is used under **LGPL-3.0**, unmodified, at the version above.

LGPLv3 requires that a user be able to replace the Qt libraries with their own build and
still run the application. rigseed satisfies this the straightforward way: **Qt is
dynamically linked and shipped as separate shared libraries**, not statically linked into
the executable. The files are in the installed application:

- Windows: `Qt6Core.dll` and friends beside the sidecar
- macOS: `QtCore.framework` and friends inside the bundle
- Linux: `libQt6Core.so.6` and friends under the application's `lib` directory

Replacing one with a compatible build of the same major version is enough. Nothing is
relinked, and no object files are needed.

`qt-GPL-3.0-only.txt` is included because LGPLv3 is written as a set of additional
permissions on top of GPLv3 and cannot be read on its own. It does **not** mean Qt is used
here under the GPL.

Qt is a trademark of The Qt Company. rigseed is not affiliated with or endorsed by them.

## Microsoft Visual C++ runtime

The Windows installer carries `vcruntime140*.dll` and `msvcp140*.dll`. These are Microsoft
redistributables, distributed under the terms that accompany Visual Studio, which permit
shipping them with an application that uses them. They are not open source and no licence
text is reproduced here.

## Fonts and icons

- Inter and JetBrains Mono: SIL Open Font License 1.1. Bundling is permitted; a *modified*
  font may not keep the reserved name.
- Lucide: ISC, which asks that the copyright notice be retained.

## Keeping this true

The versions above come from `sidecar.json`. Changing that file changes this one, and a
release that omits any of these texts fails its own check in `release.yml` rather than
publishing quietly.
