<#
.SYNOPSIS
  Stages, packs, signs and installs a throwaway MSIX of rigseed.

.DESCRIPTION
  Throwaway. The point is to find out whether rigseed works at all once it has
  package identity, before anyone builds a real pipeline around the idea.

  This installs properly rather than using `Add-AppxPackage -Register` on a
  loose manifest. That matters: loose registration leaves the app running from
  wherever it was built, so it never exercises the read-only, ACL-restricted
  `C:\Program Files\WindowsApps` directory the daemon would really have to
  spawn from. A signed install is the only way to test the real thing, and it
  needs a machine where we are administrator, which is why this runs in CI
  rather than on a laptop.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $RepoRoot,
  [Parameter(Mandatory)] [string] $Version,
  [Parameter(Mandatory)] [string] $WorkDir
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Step($text) { Write-Host "::group::$text" }
function EndStep { Write-Host '::endgroup::' }
function Fail($text) { Write-Host "::error::$text"; exit 1 }

$payload = Join-Path $WorkDir 'payload'
$release = Join-Path $RepoRoot 'src-tauri\target\release'
$binaries = Join-Path $RepoRoot 'src-tauri\binaries'
$icons = Join-Path $RepoRoot 'src-tauri\icons'

# ---------------------------------------------------------------- stage ----
Step 'Stage the payload'

New-Item -ItemType Directory -Force $payload | Out-Null
New-Item -ItemType Directory -Force (Join-Path $payload 'Assets') | Out-Null

$exe = Join-Path $release 'rigseed.exe'
if (-not (Test-Path $exe)) { Fail "no rigseed.exe at $exe. Did the build step run?" }
Copy-Item $exe $payload

# The sidecar is named for its target triple on disk, because that is how Tauri
# tells several platforms' binaries apart in one directory. Tauri strips the
# triple when it bundles, so the app looks for a plain `qbittorrent-nox.exe`
# beside itself and we have to do the same rename by hand here.
$triple = 'x86_64-pc-windows-msvc'
$sidecar = Join-Path $binaries "qbittorrent-nox-$triple.exe"
if (-not (Test-Path $sidecar)) { Fail "no sidecar at $sidecar. Did the fetch step run?" }
Copy-Item $sidecar (Join-Path $payload 'qbittorrent-nox.exe')

# Mirrors the resource map in tauri.windows.conf.json. Kept in the same order
# so the two can be read side by side when one of them changes.
Copy-Item (Join-Path $binaries 'Qt6*.dll') $payload
Copy-Item (Join-Path $binaries 'msvcp140*.dll') $payload
Copy-Item (Join-Path $binaries 'vcruntime140*.dll') $payload
foreach ($dir in 'sqldrivers', 'tls', 'networkinformation') {
  $src = Join-Path $binaries $dir
  if (Test-Path $src) { Copy-Item -Recurse $src $payload }
  else { Write-Host "::warning::no $dir plugin directory; Qt may fail to find a backend" }
}

foreach ($logo in 'Square44x44Logo.png', 'Square150x150Logo.png', 'StoreLogo.png') {
  Copy-Item (Join-Path $icons $logo) (Join-Path $payload 'Assets')
}

$staged = (Get-ChildItem -Recurse $payload -File | Measure-Object Length -Sum).Sum / 1MB
Write-Host ('staged {0:N1} MB' -f $staged)
EndStep

# ------------------------------------------------------------- manifest ----
Step 'Write the manifest'

# Four parts, last one 0: what the Store requires, and `0.1.7` on its own is
# not a legal package version.
$parts = $Version.Split('.')
if ($parts.Count -lt 3) { Fail "version '$Version' is not major.minor.patch" }
$pkgVersion = "{0}.{1}.{2}.0" -f $parts[0], $parts[1], $parts[2]

$template = Join-Path $PSScriptRoot 'AppxManifest.xml'
(Get-Content $template -Raw).Replace('__VERSION__', $pkgVersion) |
  Set-Content (Join-Path $payload 'AppxManifest.xml') -NoNewline -Encoding UTF8

Write-Host "package version $pkgVersion"
EndStep

# ----------------------------------------------------------------- pack ----
Step 'Pack'

# Newest SDK on the runner, rather than a pinned one that may not be installed.
$kit = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Directory |
  Where-Object { $_.Name -match '^10\.' } |
  Sort-Object { [version]$_.Name } -Descending |
  Select-Object -First 1
$makeappx = Join-Path $kit.FullName 'x64\makeappx.exe'
$signtool = Join-Path $kit.FullName 'x64\signtool.exe'
if (-not (Test-Path $makeappx)) { Fail "no makeappx.exe under $($kit.FullName)" }
Write-Host "using SDK $($kit.Name)"

$msix = Join-Path $WorkDir 'rigseed-spike.msix'
& $makeappx pack /d $payload /p $msix /o
if ($LASTEXITCODE -ne 0) { Fail "makeappx failed with $LASTEXITCODE" }
Write-Host ('package {0:N1} MB' -f ((Get-Item $msix).Length / 1MB))
EndStep

# ----------------------------------------------------------------- sign ----
Step 'Sign with a throwaway certificate'

# The subject has to match the manifest's Publisher exactly or the install is
# rejected for a signature/identity mismatch, which reports as a confusing
# 0x800B0109 rather than as a name problem.
$cert = New-SelfSignedCertificate `
  -Type Custom `
  -Subject 'CN=RigseedSpike' `
  -KeyUsage DigitalSignature `
  -FriendlyName 'rigseed MSIX spike' `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}')

$pfx = Join-Path $WorkDir 'spike.pfx'
$pw = ConvertTo-SecureString -String 'spike' -Force -AsPlainText
Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $pfx -Password $pw | Out-Null

& $signtool sign /fd SHA256 /a /f $pfx /p 'spike' $msix
if ($LASTEXITCODE -ne 0) { Fail "signtool failed with $LASTEXITCODE" }

# Trusting our own certificate machine-wide. Acceptable only because this is a
# disposable CI runner; it would be a bad thing to do to a real machine.
$cer = Join-Path $WorkDir 'spike.cer'
Export-Certificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $cer | Out-Null
Import-Certificate -FilePath $cer -CertStoreLocation 'Cert:\LocalMachine\TrustedPeople' | Out-Null
Write-Host 'signed and trusted'
EndStep

# -------------------------------------------------------------- install ----
Step 'Install'

Get-AppxPackage -Name 'VerastackLabs.rigseed.spike' -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-AppxPackage -Package $_.PackageFullName }

Add-AppxPackage -Path $msix

$pkg = Get-AppxPackage -Name 'VerastackLabs.rigseed.spike'
if (-not $pkg) { Fail 'package is not registered after Add-AppxPackage' }

Write-Host "InstallLocation : $($pkg.InstallLocation)"
Write-Host "Status          : $($pkg.Status)"

# The whole reason for signing rather than loose-registering. If this is not
# under WindowsApps then the probe is measuring the wrong thing and its results
# should not be believed.
if ($pkg.InstallLocation -notmatch 'WindowsApps') {
  Fail "installed to $($pkg.InstallLocation), not WindowsApps. The read-only install directory is the thing being tested, so this run proves nothing."
}
Write-Host 'installed into WindowsApps, which is what we wanted to test against'
EndStep

"$($pkg.PackageFamilyName)!rigseed" | Set-Content (Join-Path $WorkDir 'aumid.txt') -NoNewline
Write-Host 'done'
