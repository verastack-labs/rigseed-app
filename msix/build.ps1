<#
.SYNOPSIS
  Builds the Microsoft Store package from an existing Tauri build.

.DESCRIPTION
  Assembles the payload, fills the manifest from msix/identity.json and
  package.json, and packs it. It does not sign: the Store re-signs every MSIX
  with a Microsoft certificate after certification, which is the entire reason
  this route was chosen over submitting the NSIS installer, where every PE
  file in the bundle would have needed a certificate we cannot buy from India.

  Expects `tauri build` to have run already, so target/release holds the
  binary and src-tauri/binaries holds the sidecar and the Qt libraries.

.PARAMETER AllowPlaceholderIdentity
  Packs even though identity.json still carries its placeholders. For testing
  the pipeline before the Store reservation exists. The resulting package can
  be installed locally if you sign it yourself; it can never be submitted.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $RepoRoot,
  [Parameter(Mandatory)] [string] $OutDir,
  [switch] $AllowPlaceholderIdentity
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Fail($text) { Write-Host "::error::$text"; exit 1 }

$payload = Join-Path $OutDir 'payload'
$release = Join-Path $RepoRoot 'src-tauri\target\release'
$binaries = Join-Path $RepoRoot 'src-tauri\binaries'
$icons = Join-Path $RepoRoot 'src-tauri\icons'

# ------------------------------------------------------------- identity ----
$identity = Get-Content (Join-Path $PSScriptRoot 'identity.json') -Raw | ConvertFrom-Json

$placeholders = @($identity.name, $identity.publisher) | Where-Object { $_ -match '^__.*__$' }
if ($placeholders.Count -gt 0) {
  if (-not $AllowPlaceholderIdentity) {
    Fail "msix/identity.json still holds placeholders ($($placeholders -join ', ')). Fill them from Partner Center > Product identity, or pass -AllowPlaceholderIdentity to build an unsubmittable test package."
  }

  # Stand-ins rather than the placeholders themselves. A package Name must
  # match [-.A-Za-z0-9]+, so the underscored markers cannot be packed at all
  # and the flag would be useless with them: makeappx rejects the manifest
  # before anything about the payload has been exercised. These are obviously
  # fake, valid, and will never match a real reservation.
  $identity.name = 'rigseed.unsubmittable.test'
  $identity.publisher = 'CN=UnsubmittableTest'
  Write-Host '::warning::building with a stand-in identity. This package exercises the pipeline and can be installed locally if you sign it, but it can never be submitted to the Store.'
}

$version = (Get-Content (Join-Path $RepoRoot 'package.json') -Raw | ConvertFrom-Json).version
$parts = $version.Split('.')
if ($parts.Count -lt 3) { Fail "version '$version' in package.json is not major.minor.patch" }
# Four parts, and the Store requires the last to be 0 on submission.
$packageVersion = "{0}.{1}.{2}.0" -f $parts[0], $parts[1], $parts[2]

# ---------------------------------------------------------------- stage ----
Write-Host "::group::Stage"
if (Test-Path $payload) { Remove-Item -Recurse -Force $payload }
New-Item -ItemType Directory -Force $payload | Out-Null
New-Item -ItemType Directory -Force (Join-Path $payload 'Assets') | Out-Null

$exe = Join-Path $release 'rigseed.exe'
if (-not (Test-Path $exe)) { Fail "no rigseed.exe at $exe. Run 'tauri build' first." }
Copy-Item $exe $payload

# Named for its target triple on disk, because that is how Tauri tells several
# platforms' binaries apart in one directory. Tauri strips the triple when it
# bundles, so the app looks for a plain qbittorrent-nox.exe beside itself and
# the same rename has to happen here.
$triple = 'x86_64-pc-windows-msvc'
$sidecar = Join-Path $binaries "qbittorrent-nox-$triple.exe"
if (-not (Test-Path $sidecar)) { Fail "no sidecar at $sidecar. Run scripts/fetch-sidecar-binary.sh first." }
Copy-Item $sidecar (Join-Path $payload 'qbittorrent-nox.exe')

# Mirrors the resource map in src-tauri/tauri.windows.conf.json, in the same
# order, so the two can be read side by side when either changes. If a Qt
# library is added there and not here, the Store build breaks in a way the
# NSIS build does not.
Copy-Item (Join-Path $binaries 'Qt6*.dll') $payload
Copy-Item (Join-Path $binaries 'msvcp140*.dll') $payload
Copy-Item (Join-Path $binaries 'vcruntime140*.dll') $payload
foreach ($dir in 'sqldrivers', 'tls', 'networkinformation') {
  $src = Join-Path $binaries $dir
  if (-not (Test-Path $src)) { Fail "no $dir plugin directory in $binaries. Qt cannot find its backends without it, and the TLS one is why the daemon can reach a tracker at all." }
  Copy-Item -Recurse $src $payload
}

# Tauri already generates the whole Store tile set, so there is nothing to
# draw and nothing to keep in sync by hand.
foreach ($logo in 'Square44x44Logo.png', 'Square71x71Logo.png', 'Square150x150Logo.png', 'StoreLogo.png') {
  $from = Join-Path $icons $logo
  if (-not (Test-Path $from)) { Fail "no $logo in src-tauri/icons. The manifest names it, so the package will not validate without it." }
  Copy-Item $from (Join-Path $payload 'Assets')
}

Write-Host ("staged {0:N1} MB" -f ((Get-ChildItem -Recurse $payload -File | Measure-Object Length -Sum).Sum / 1MB))
Write-Host '::endgroup::'

# ------------------------------------------------------------- manifest ----
Write-Host "::group::Manifest"
$manifest = Get-Content (Join-Path $PSScriptRoot 'AppxManifest.xml') -Raw
$substitutions = @{
  '__IDENTITY_NAME__'          = $identity.name
  '__IDENTITY_PUBLISHER__'     = $identity.publisher
  '__PUBLISHER_DISPLAY_NAME__' = $identity.publisherDisplayName
  '__DISPLAY_NAME__'           = $identity.displayName
  '__DESCRIPTION__'            = $identity.description
  '__VERSION__'                = $packageVersion
}

# Checked against the template before anything is replaced, not against the
# result afterwards. Scanning the output cannot tell a token nobody gave a
# value to from a placeholder identity value that was substituted in on
# purpose, and it also trips over the word written in this file's own comment.
# Reading the template answers the question actually being asked: does every
# token in it have a value here.
$inTemplate = [regex]::Matches($manifest, '__[A-Z_]+__') |
  ForEach-Object { $_.Value } |
  Sort-Object -Unique
$missing = $inTemplate | Where-Object { -not $substitutions.ContainsKey($_) }
if ($missing) { Fail "AppxManifest.xml uses tokens with no value in build.ps1: $($missing -join ', ')" }

foreach ($token in $substitutions.Keys) { $manifest = $manifest.Replace($token, $substitutions[$token]) }

Set-Content (Join-Path $payload 'AppxManifest.xml') -Value $manifest -NoNewline -Encoding UTF8
Write-Host "identity : $($identity.name)"
Write-Host "publisher: $($identity.publisher)"
Write-Host "version  : $packageVersion"
Write-Host '::endgroup::'

# ----------------------------------------------------------------- pack ----
Write-Host "::group::Pack"
$kit = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^10\.' } |
  Sort-Object { [version]$_.Name } -Descending |
  Select-Object -First 1
if (-not $kit) { Fail 'no Windows 10 SDK found. makeappx comes from it.' }

$makeappx = Join-Path $kit.FullName 'x64\makeappx.exe'
if (-not (Test-Path $makeappx)) { Fail "no makeappx.exe under $($kit.FullName)" }

$msix = Join-Path $OutDir "rigseed_${version}_x64.msix"
& $makeappx pack /d $payload /p $msix /o
if ($LASTEXITCODE -ne 0) { Fail "makeappx failed with $LASTEXITCODE" }

Write-Host ("package {0:N1} MB -> $msix" -f ((Get-Item $msix).Length / 1MB))
Write-Host '::endgroup::'

if ($env:GITHUB_OUTPUT) { "msix=$msix" | Out-File $env:GITHUB_OUTPUT -Append }
