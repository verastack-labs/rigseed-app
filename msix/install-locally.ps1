<#
.SYNOPSIS
  Signs an MSIX with a throwaway certificate and installs it, for testing.

.DESCRIPTION
  build.ps1 does not sign, because the Store signs for us. That leaves no way
  to install the package yourself and look at it, which you want to do at
  least once before submitting: certification failures are slow and vague,
  and most of what they catch is visible in thirty seconds on your own
  machine.

  This fills that gap. It creates a self-signed certificate matching the
  package's own Publisher, signs with it, trusts it, and installs.

  It changes two things about your machine, and both are the reason it asks
  rather than assumes:

    - a certificate is added to LocalMachine\TrustedPeople, which tells
      Windows to trust anything signed by it
    - Developer Mode must be on, which permits installing apps from outside
      the Store

  Neither is something to leave switched on indefinitely. -Uninstall reverses
  the first and removes the app; Developer Mode is yours to turn back off.

.PARAMETER Msix
  The package to install. Defaults to the newest .msix under target/msix.

.PARAMETER Uninstall
  Removes the app and the certificate instead of installing.

.EXAMPLE
  # From an elevated PowerShell, after ./msix/build.ps1
  ./msix/install-locally.ps1

.EXAMPLE
  ./msix/install-locally.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [string] $Msix,
  [switch] $Uninstall
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Must equal the Publisher that build.ps1 writes for a stand-in identity. If
# the two drift, the install fails with 0x800B0109, which reads as a broken
# certificate chain and sends you looking anywhere but at a mismatched name.
$subject = 'CN=UnsubmittableTest'
$friendly = 'rigseed local MSIX testing'

# Matched exactly, never as `rigseed*`. A wildcard works fine today and becomes
# destructive the moment rigseed is actually on the Store: -Uninstall would
# find the real installed app and remove it, taking somebody's working copy
# with it. This script only ever touches the package it installed.
$packageName = 'rigseed.unsubmittable.test'

function Fail($text) { Write-Host "error: $text" -ForegroundColor Red; exit 1 }

# Appx lives in Windows PowerShell. In PowerShell 7 it has to be imported
# through the compatibility layer or the cmdlets simply are not there, which
# reports as "Add-AppxPackage is not recognized" and looks like a typo.
Import-Module Appx -UseWindowsPowerShell -WarningAction SilentlyContinue 2>$null

$elevated = (New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent()
  )).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# ------------------------------------------------------------ uninstall ----
if ($Uninstall) {
  $installed = Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue
  foreach ($p in $installed) {
    Write-Host "removing $($p.PackageFullName)"
    Remove-AppxPackage -Package $p.PackageFullName
  }
  if (-not $installed) { Write-Host 'no rigseed package installed' }

  if ($elevated) {
    Get-ChildItem Cert:\LocalMachine\TrustedPeople -ErrorAction SilentlyContinue |
      Where-Object { $_.Subject -eq $subject } |
      ForEach-Object { Write-Host "removing certificate $($_.Thumbprint)"; Remove-Item $_.PSPath -Force }
  } else {
    Write-Host 'not elevated, so the trusted certificate was left in place. Re-run as administrator to remove it.'
  }
  exit 0
}

# ------------------------------------------------------------- the file ----
if (-not $Msix) {
  $candidates = Get-ChildItem (Join-Path $PSScriptRoot '..\target\msix') -Filter *.msix -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending
  if (-not $candidates) { Fail 'no .msix found under target/msix. Run ./msix/build.ps1 first, or pass -Msix.' }
  $Msix = $candidates[0].FullName
}
if (-not (Test-Path $Msix)) { Fail "no such file: $Msix" }
Write-Host "package: $Msix"

# ------------------------------------------------------------ the gates ----
if (-not $elevated) {
  Fail 'this needs an elevated PowerShell. Trusting a signing certificate writes to the machine store, which is not something a normal user may do, and it is not something to work around.'
}

$devMode = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock' -ErrorAction SilentlyContinue)
if (-not $devMode -or $devMode.AllowDevelopmentWithoutDevLicense -ne 1) {
  Fail 'Developer Mode is off, so Windows will refuse to install this. Settings > Update & Security > For developers on Windows 10, or Settings > Privacy & security > For developers on Windows 11. Turn it back off when you have finished.'
}

# ---------------------------------------------------------- the publisher --
# The certificate subject must equal the package's Publisher exactly. When it
# does not, the install fails with 0x800B0109, which reads as a certificate
# chain problem and sends you looking in entirely the wrong place.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($Msix)
try {
  $entry = $zip.GetEntry('AppxManifest.xml')
  if (-not $entry) { Fail 'the package has no AppxManifest.xml, which should be impossible for something makeappx produced' }
  $reader = New-Object System.IO.StreamReader($entry.Open())
  $xml = [xml]$reader.ReadToEnd()
  $reader.Dispose()
} finally { $zip.Dispose() }

$publisher = $xml.Package.Identity.Publisher
Write-Host "publisher in package: $publisher"
if ($publisher -ne $subject) {
  Fail "this package is built for publisher '$publisher', and the certificate here is '$subject'. A package carrying a real Partner Center identity cannot be signed with a local certificate; rebuild with ./msix/build.ps1 -AllowPlaceholderIdentity, or sign it elsewhere."
}

# ------------------------------------------------------------- sign it ----
$temp = Join-Path $env:TEMP "rigseed-msix-$(Get-Random)"
New-Item -ItemType Directory -Force $temp | Out-Null
try {
  $cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $subject } | Select-Object -First 1
  if (-not $cert) {
    Write-Host 'creating a throwaway code-signing certificate'
    $cert = New-SelfSignedCertificate `
      -Type Custom `
      -Subject $subject `
      -KeyUsage DigitalSignature `
      -FriendlyName $friendly `
      -CertStoreLocation 'Cert:\CurrentUser\My' `
      -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}')
  } else {
    Write-Host "reusing certificate $($cert.Thumbprint)"
  }

  $cer = Join-Path $temp 'local.cer'
  Export-Certificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $cer | Out-Null
  Import-Certificate -FilePath $cer -CertStoreLocation 'Cert:\LocalMachine\TrustedPeople' | Out-Null

  $pfx = Join-Path $temp 'local.pfx'
  $password = ConvertTo-SecureString -String 'local' -Force -AsPlainText
  Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" -FilePath $pfx -Password $password | Out-Null

  $kit = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^10\.' } |
    Sort-Object { [version]$_.Name } -Descending |
    Select-Object -First 1
  if (-not $kit) { Fail 'no Windows 10 SDK found. signtool comes from it.' }
  $signtool = Join-Path $kit.FullName 'x64\signtool.exe'

  & $signtool sign /fd SHA256 /a /f $pfx /p 'local' $Msix
  if ($LASTEXITCODE -ne 0) { Fail "signtool failed with $LASTEXITCODE" }
} finally {
  Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------- install it ----
Get-AppxPackage -Name $packageName -ErrorAction SilentlyContinue |
  ForEach-Object { Write-Host "removing previous $($_.PackageFullName)"; Remove-AppxPackage -Package $_.PackageFullName }

Add-AppxPackage -Path $Msix

$pkg = Get-AppxPackage -Name $packageName | Select-Object -First 1
if (-not $pkg) { Fail 'the package is not registered after Add-AppxPackage' }

Write-Host ''
Write-Host "installed : $($pkg.PackageFullName)"
Write-Host "location  : $($pkg.InstallLocation)"
Write-Host "launch    : explorer.exe shell:appsFolder\$($pkg.PackageFamilyName)!rigseed"
Write-Host ''
Write-Host 'When you have finished: ./msix/install-locally.ps1 -Uninstall, then turn Developer Mode back off.'
