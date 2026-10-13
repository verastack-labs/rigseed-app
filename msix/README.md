# The Microsoft Store package

rigseed ships to the Store as an **MSIX**, not as the NSIS installer.

That was not the obvious choice. The Store does accept a plain `.exe` or
`.msi`: you host it and hand Partner Center a versioned URL. But it requires
that *"the binary and all of its Portable Executable (PE) files"* carry an
Authenticode signature chaining to a certificate authority in the Microsoft
Trusted Root Program. For rigseed that means `rigseed.exe`, `qbittorrent-nox.exe`
and every self-built `Qt6*.dll`. Azure Artifact Signing is the affordable way
to get such a certificate and Microsoft limits individual developers to the
United States and Canada, which leaves a traditional certificate at roughly
$200 to $400 a year on a hardware token.

MSIX gets *"free Microsoft code signing and CDN hosting"*: the Store re-signs
the package itself after certification. Hence nothing here signs anything.

## What was verified before any of this was built

An MSIX runs with **package identity**, and three of rigseed's assumptions
could have failed under it. A spike on a CI runner installed a real signed
package into `C:\Program Files\WindowsApps` and compared it against the same
build running unpackaged on the same machine:

| | unpackaged | packaged |
|---|---|---|
| daemon spawns | yes | yes, from `WindowsApps` |
| loopback to the WebUI | `HTTP 200` | `HTTP 200` |
| config directory | real `AppData\Roaming` | real `AppData\Roaming` |

Loopback was the one that could have killed the route outright, and config
virtualization was the one most likely to bite quietly. Neither did.

## Before the first submission

`identity.json` carries placeholders. `build.ps1` refuses to produce a
submittable package while they survive, because an MSIX built with the wrong
identity installs and runs perfectly and is rejected at the end of the upload.

1. Reserve the app name at <https://storedeveloper.microsoft.com>. Start there
   and nowhere else: it is the only entry point to the free onboarding, and
   going in through Partner Center directly shows the legacy flow with a fee.
2. Copy all three values from **Product management > Product identity** into
   `identity.json`.
3. Push. The workflow stops using a stand-in and names the artifact `msix-store`.

## Running it

The `MSIX` workflow builds on every published release and on demand, and
uploads the package as an artifact. It never submits: that is a manual step in
Partner Center.

Locally, with a build already done:

```powershell
./msix/build.ps1 -RepoRoot . -OutDir ./target/msix -AllowPlaceholderIdentity
```

`-AllowPlaceholderIdentity` substitutes a valid stand-in. It is needed because
a package `Name` must match `[-.A-Za-z0-9]+`, so the underscored placeholders
cannot be packed at all and the flag would otherwise do nothing useful.

To install that package yourself you must sign it and trust the certificate,
which needs administrator rights:

```powershell
# from an elevated PowerShell
./msix/install-locally.ps1
./msix/install-locally.ps1 -Uninstall
```

It refuses rather than guesses when it cannot work: without elevation, without
Developer Mode, or when the package carries a real Partner Center identity that
a local certificate can never match. Worth doing once before the first
submission, because certification failures are slow and vague, and most of what
they catch is visible in thirty seconds on your own machine.

## Things to watch

**WebView2.** rigseed needs the Evergreen runtime. It ships with Windows 11 and
reached Windows 10 through Windows Update during 2021, but `MinVersion` is
10.0.17763 and MSIX cannot declare a dependency on Evergreen. A long-unpatched
1809 machine could install this and fail to open a window. It is a listing
requirement and a certification risk, not something the manifest can fix.

**The payload mirrors `tauri.windows.conf.json`.** The resource map there and
the copy list in `build.ps1` are maintained by hand in the same order. Add a Qt
library to one and not the other and the Store build breaks where the NSIS
build does not. `build.ps1` fails loudly on a missing plugin directory rather
than shipping a daemon that cannot reach a tracker.

**Updates.** A packaged copy must not run the updater, and the NSIS copy must.
`src-tauri/src/packaging.rs` tells them apart by asking Windows for package
identity. The two live on the same platform, so getting it backwards breaks one
of them.
