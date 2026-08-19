#!/usr/bin/env bash
#
# Downloads the prebuilt qbittorrent-nox for this machine's target triple and
# puts it where Tauri expects it.
#
# The binary is built once per qBittorrent version by .github/workflows/
# build-sidecar.yml and published to a release named sidecar-<version>. Nothing
# here compiles anything: a normal build, local or CI, is a download.
#
# Usage: scripts/fetch-sidecar-binary.sh [target-triple]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="$ROOT/sidecar.json"
DEST="$ROOT/src-tauri/binaries"

read_pin() {
  if command -v jq >/dev/null 2>&1; then
    jq -r ".$1" "$PIN"
  else
    grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$PIN" | head -1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/'
  fi
}

detect_triple() {
  local os arch
  case "$(uname -s)" in
    Linux*)  os="unknown-linux-gnu" ;;
    Darwin*) os="apple-darwin" ;;
    MINGW*|MSYS*|CYGWIN*) os="pc-windows-msvc" ;;
    *) echo "unsupported OS: $(uname -s)" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) arch="x86_64" ;;
    arm64|aarch64) arch="aarch64" ;;
    *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac
  echo "$arch-$os"
}

VERSION="$(read_pin version)"
TRIPLE="${1:-$(detect_triple)}"
RELEASE="sidecar-$VERSION"

EXT=""
case "$TRIPLE" in *windows*) EXT=".exe" ;; esac
ASSET="qbittorrent-nox-$TRIPLE$EXT"

echo "version : $VERSION"
echo "triple  : $TRIPLE"
echo "release : $RELEASE"
echo "asset   : $ASSET"
echo

mkdir -p "$DEST"
TARGET="$DEST/$ASSET"

if [ -f "$TARGET" ]; then
  echo "Already present at $TARGET"
  exit 0
fi

REPO="${GITHUB_REPOSITORY:-verastack-labs/rigseed-app}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh is required to download from a release" >&2
  exit 1
fi

if ! gh release view "$RELEASE" --repo "$REPO" >/dev/null 2>&1; then
  cat >&2 <<EOF
error: no release named $RELEASE in $REPO

The sidecar for qBittorrent $VERSION has not been built yet. Run the
"Build sidecar" workflow once for this version:

    gh workflow run build-sidecar.yml --repo $REPO

It builds every platform and publishes them to $RELEASE. After that this
script is a download and never compiles anything.
EOF
  exit 1
fi

echo "Downloading..."
gh release download "$RELEASE" --repo "$REPO" --pattern "$ASSET" --dir "$DEST" --clobber
gh release download "$RELEASE" --repo "$REPO" --pattern "$ASSET.sha256" --dir "$DEST" --clobber || true

if [ -f "$TARGET.sha256" ]; then
  echo "Verifying checksum..."
  ( cd "$DEST" && { sha256sum -c "$ASSET.sha256" 2>/dev/null || shasum -a 256 -c "$ASSET.sha256"; } )
fi

chmod +x "$TARGET" 2>/dev/null || true
echo
echo "Ready: $TARGET"
echo "Declare it in tauri.conf.json under bundle.externalBin as binaries/qbittorrent-nox"
