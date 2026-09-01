#!/usr/bin/env bash
#
# Downloads the prebuilt qbittorrent-nox for this machine's target triple,
# along with the Qt libraries it needs, and puts both where Tauri expects them.
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

# The binary cannot run alone. -DGUI=OFF still links Qt Core, Network, Sql and
# Xml, none of which are on an end user's machine, and Linux needs ICU beside
# them while Windows needs the MSVC runtime. Collected per platform by the
# build workflow and published as a second asset.
RUNTIME="runtime-$TRIPLE.tar.gz"

echo "version : $VERSION"
echo "triple  : $TRIPLE"
echo "release : $RELEASE"
echo "asset   : $ASSET"
echo

mkdir -p "$DEST"
TARGET="$DEST/$ASSET"

# Both, or neither. A binary present without its libraries looks fine to every
# check up to the moment it is launched, which is the failure this whole
# arrangement exists to avoid.
if [ -f "$TARGET" ] && [ -d "$DEST/lib" ]; then
  echo "Already present at $TARGET, with its runtime libraries"
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

verify() {
  local asset="$1"
  gh release download "$RELEASE" --repo "$REPO" --pattern "$asset.sha256" --dir "$DEST" --clobber || return 0
  echo "Verifying $asset..."
  ( cd "$DEST" && { sha256sum -c "$asset.sha256" 2>/dev/null || shasum -a 256 -c "$asset.sha256"; } )
}

echo "Downloading the binary..."
gh release download "$RELEASE" --repo "$REPO" --pattern "$ASSET" --dir "$DEST" --clobber
verify "$ASSET"
chmod +x "$TARGET" 2>/dev/null || true

echo "Downloading the runtime libraries..."
if gh release download "$RELEASE" --repo "$REPO" --pattern "$RUNTIME" --dir "$DEST" --clobber; then
  verify "$RUNTIME"
  # Extracted in place. On macOS the binary's install names are rewritten to
  # @executable_path/../lib by the build workflow, and on Windows the loader
  # searches the executable's own directory first, which is why that tarball
  # has no lib subdirectory.
  #
  # Linux is NOT set up this way, despite what this comment used to claim.
  # readelf on the published binary shows its RUNPATH is still the Qt path
  # from the machine that built it, /home/runner/work/rigseed-app/Qt/..., so
  # it finds nothing on a user's system. That is one of three reasons Linux is
  # excluded from releases; see the matrix comment in release.yml.
  tar -xzf "$DEST/$RUNTIME" -C "$DEST"
  rm -f "$DEST/$RUNTIME" "$DEST/$RUNTIME.sha256"
else
  cat >&2 <<EOF

error: $RELEASE has no $RUNTIME

The binary was published before the runtime libraries were collected, or the
build for this platform failed. qbittorrent-nox will not start without them.
Rebuild with:

    gh workflow run build-sidecar.yml --repo $REPO -f force=true
EOF
  exit 1
fi

echo
echo "Ready: $TARGET"
if [ -d "$DEST/lib" ]; then
  echo "Runtime: $DEST/lib ($(find "$DEST/lib" -maxdepth 1 -mindepth 1 | wc -l | tr -d " ") entries)"
else
  echo "Runtime: alongside the binary in $DEST"
fi
