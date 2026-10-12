# Linux packaging metadata

Two files that ship inside the `.deb` and `.rpm`, wired up through
`bundle.linux` in `../tauri.linux.conf.json`, whose paths are relative to
`src-tauri`. Both land on a user's machine, which is why the reasoning lives
here rather than in comments inside them.

## `dev.verastack.rigseed.metainfo.xml`

Installed to `/usr/share/metainfo/`. This is the file a software centre reads.
Without it, rigseed installs and then appears in GNOME Software, KDE Discover
and Linux Mint's Software Manager as a bare name with no description, no
screenshots and no category. That is how it looked up to and including 0.1.7.
It is also the first thing Flathub validates, so no store submission is
possible until this exists and passes `appstreamcli`.

The `<id>` is the reverse-DNS application id and matches `identifier` in
`tauri.conf.json`. It deliberately does **not** match the desktop file: the
bundler names that after `productName`, so it is `rigseed.desktop`. The
`<launchable>` element is what ties the two together, and is the supported way
to do it without renaming the entry.

Screenshots are served from the website's repository rather than copied in
here, because those are the same captures the site publishes and a second copy
is a second thing to forget to update. The captions are the site's own wording
for the same images.

`<content_rating>` is empty on purpose, meaning every OARS attribute is none.
The program carries no content of its own, and what someone chooses to
transfer with it is not something this file can or should rate.

**It goes stale silently.** The `<releases>` list is the one piece of release
metadata not derived from `package.json`, and a software centre will show
whatever the newest entry claims for as long as it is wrong, which looks
finished rather than broken. `release.yml` refuses to build a tag whose
version is not the newest `<release>` here, so adding an entry is part of
cutting a release.

## `rigseed.desktop`

A Handlebars template the bundler fills in, installed to
`/usr/share/applications/`. Tauri generates one of these by itself and it is
nearly right. What it cannot do is `Categories`: that comes from
`bundle.category`, which is a macOS enumeration (Utility, Productivity, Video
and so on) with no entry describing a BitTorrent client. The generated file
therefore shipped `Categories=` empty, so rigseed appeared under no menu
heading and ranked nowhere in a browse-by-category view.
`Network;FileTransfer;P2P` are the freedesktop values that describe it, and
owning the template is the only way to say them.

`Name`, `Comment`, `Exec` and `Icon` stay as variables so they keep following
the configuration rather than being frozen. `StartupWMClass` is restored by
hand because taking over a template means taking over everything in it, and
without it the running window does not associate with the launcher icon and
the dock shows two.

**`MimeType` is deliberately absent.** Registering
`application/x-bittorrent` or `x-scheme-handler/magnet` tells the desktop to
hand rigseed a file path or a URI on the command line, and nothing in
`src-tauri` reads `argv`. Torrents and magnets are added through the in-app
dialog, so the association would open an empty window and look broken. It
belongs here the day argv is handled, and not before.

## What checks these

- `ci.yml` runs `appstreamcli validate` on the metainfo for every pull
  request. It is the same validator a software centre and Flathub run, so a
  file that fails there would be rejected by them.
- `release.yml` unpacks the built `.deb` and fails the release if either file
  is missing from it, if the desktop entry's `Categories` line is not the
  expected one, or if `StartupWMClass` has gone. Present in the repository
  proves nothing; the bundler has to have picked them up.

## Not done yet

The AppImage is built from the deb tree, so these should carry into it, but
that is unverified and nothing checks it. Flathub additionally wants the
desktop file named `dev.verastack.rigseed.desktop` and the in-app updater
disabled, since the store owns updates; neither is needed for the `.deb` and
`.rpm` and both belong with the Flatpak manifest when that is written.
