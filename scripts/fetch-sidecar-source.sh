#!/usr/bin/env bash
#
# Downloads the qbittorrent-nox source archive matching the version pinned in
# sidecar.json, and verifies it against the pinned upstream commit.
#
# The resulting archive must be attached to any release that ships the sidecar
# binary. See licenses/README.md for why.
#
# Usage: scripts/fetch-sidecar-source.sh [output-dir]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$ROOT/dist/licences}"
PIN="$ROOT/sidecar.json"

if [ ! -f "$PIN" ]; then
  echo "error: sidecar.json not found at $PIN" >&2
  exit 1
fi

read_pin () {
  if command -v jq >/dev/null 2>&1; then
    jq -r ".$1" "$PIN"
  else
    # Minimal fallback so this runs on a machine without jq.
    grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$PIN" | head -1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/'
  fi
}

VERSION="$(read_pin version)"
TAG="$(read_pin tag)"
COMMIT="$(read_pin commit)"
URL="$(read_pin sourceArchive)"

if [ -z "$VERSION" ] || [ -z "$URL" ]; then
  echo "error: could not read version or sourceArchive from sidecar.json" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
ARCHIVE="$OUT_DIR/qbittorrent-nox-${VERSION}-source.tar.gz"

echo "sidecar   : qbittorrent-nox $VERSION"
echo "tag       : $TAG"
echo "commit    : $COMMIT"
echo "source    : $URL"
echo "output    : $ARCHIVE"
echo

echo "Verifying the pinned tag still resolves to the pinned commit..."
ACTUAL="$(git ls-remote https://github.com/qbittorrent/qBittorrent.git "refs/tags/$TAG^{}" | cut -f1)"
if [ -z "$ACTUAL" ]; then
  ACTUAL="$(git ls-remote https://github.com/qbittorrent/qBittorrent.git "refs/tags/$TAG" | cut -f1)"
fi

if [ "$ACTUAL" != "$COMMIT" ]; then
  echo "error: tag $TAG now points at $ACTUAL but sidecar.json pins $COMMIT" >&2
  echo "       An upstream tag was moved. Do not ship until this is understood." >&2
  exit 1
fi
echo "ok, tag matches the pinned commit."
echo

echo "Downloading..."
curl -fSL --retry 3 "$URL" -o "$ARCHIVE"

SIZE="$(wc -c <"$ARCHIVE")"
if [ "$SIZE" -lt 1000000 ]; then
  echo "error: archive is only $SIZE bytes, which is too small to be the source tree" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ARCHIVE" > "$ARCHIVE.sha256"
fi

cp "$ROOT/licenses/qbittorrent/COPYING.GPLv3.txt" "$OUT_DIR/"
cp "$ROOT/licenses/qbittorrent/COPYING.GPLv2.txt" "$OUT_DIR/"
cp "$ROOT/licenses/qbittorrent/COPYING.txt"       "$OUT_DIR/qbittorrent-COPYING.txt"

echo
echo "Done. $OUT_DIR now holds the source archive and the licence texts that must"
echo "accompany the binary on the same release."
ls -la "$OUT_DIR"
