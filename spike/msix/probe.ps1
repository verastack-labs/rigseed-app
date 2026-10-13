<#
.SYNOPSIS
  Answers the four questions MSIX packaging puts to rigseed.

.DESCRIPTION
  Runs the app twice on the same machine: once unpackaged as a control, once
  from the installed MSIX. Comparing the two is the point. A packaged failure
  only means something if the same build succeeds unpackaged minutes earlier
  on the same runner, otherwise we are looking at a broken build or a headless
  CI quirk and drawing conclusions about packaging that are not there.

  The questions:

    1. sidecar   does qbittorrent-nox spawn from a read-only WindowsApps dir
    2. loopback  can the app reach the daemon on 127.0.0.1, which is the one
                 that kills the whole route if the answer is no
    3. config    where do writes land, the real AppData or a package-private
                 copy, and does the daemon agree with the app about it
    4. keyring   can Windows Credential Manager still be reached, since
                 rigseed keeps the WebUI password there

  Nothing here asserts a pass. It reports what happened and leaves the reading
  to a person, because a spike that lies by rounding its own results up is
  worse than no spike.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $RepoRoot,
  [Parameter(Mandatory)] [string] $WorkDir
)

$ErrorActionPreference = 'Continue'
Set-StrictMode -Version Latest

$results = [ordered]@{}

function Stop-Everything {
  Get-Process rigseed, qbittorrent-nox -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 1200
}

function Wait-For($block, $seconds) {
  $deadline = (Get-Date).AddSeconds($seconds)
  while ((Get-Date) -lt $deadline) {
    $value = & $block
    if ($value) { return $value }
    Start-Sleep -Milliseconds 400
  }
  return $null
}

# Every listening socket the daemon owns, not just the first.
#
# The first run of this spike took the first one and tested that, which was the
# BitTorrent listen port rather than the WebUI: the control's own log said the
# WebUI was on 43880 while the probe was knocking on 58871. rigseed picks a
# random high port for the WebUI, so neither a fixed 8080 nor "whatever is
# first" identifies it. Trying all of them removes the guess entirely.
function Get-DaemonPorts($daemonProcess) {
  if (-not $daemonProcess) { return @() }
  return @(
    Get-NetTCPConnection -State Listen -OwningProcess $daemonProcess.Id -ErrorAction SilentlyContinue |
      Where-Object { $_.LocalAddress -in '127.0.0.1', '0.0.0.0', '::', '::1' } |
      Select-Object -ExpandProperty LocalPort -Unique |
      Sort-Object
  )
}

function Test-Loopback($ports) {
  if (-not $ports -or $ports.Count -eq 0) { return 'no listening port to test' }

  $seen = @()
  foreach ($port in $ports) {
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 10
      $seen += "${port}: HTTP $($r.StatusCode)"
    } catch {
      # Strict mode turns a missing property into a thrown error, so the
      # response is fished out defensively. The previous version read
      # .Exception.Response directly, which threw on any non-HTTP failure and
      # made this function return nothing at all: the result came back null and
      # the question the whole spike exists to answer went unanswered.
      $status = $null
      try {
        $ex = $_.Exception
        if ($ex.PSObject.Properties.Name -contains 'Response' -and $ex.Response) {
          $status = [int]$ex.Response.StatusCode
        }
      } catch { $status = $null }

      if ($status) {
        # 401 and 403 are the daemon refusing to log us in, which still proves
        # the socket was reached. Only a transport failure means loopback is
        # blocked.
        $seen += "${port}: HTTP $status (reachable)"
      } else {
        $seen += "${port}: unreachable ($($_.Exception.GetType().Name))"
      }
    }
  }
  return $seen -join ' | '
}

function Find-ConfigRoots {
  $roots = @()
  $real = Join-Path $env:APPDATA 'dev.verastack.rigseed'
  if (Test-Path $real) { $roots += "real: $real" }
  $pkgRoot = Join-Path $env:LOCALAPPDATA 'Packages'
  if (Test-Path $pkgRoot) {
    Get-ChildItem $pkgRoot -Directory -Filter '*rigseed*' -ErrorAction SilentlyContinue | ForEach-Object {
      Get-ChildItem $_.FullName -Recurse -Directory -Filter 'dev.verastack.rigseed' -ErrorAction SilentlyContinue |
        ForEach-Object { $roots += "virtualized: $($_.FullName)" }
    }
  }
  if ($roots.Count -eq 0) { return @('none found') }
  return $roots
}

function Probe($label, $launch) {
  Write-Host "::group::Probe: $label"
  Stop-Everything

  $before = Find-ConfigRoots
  & $launch

  $rig = Wait-For { Get-Process rigseed -ErrorAction SilentlyContinue | Select-Object -First 1 } 60
  $qbt = $null; $ports = @(); $loopback = 'not tested, app never started'

  if ($rig) {
    $qbt = Wait-For { Get-Process qbittorrent-nox -ErrorAction SilentlyContinue | Select-Object -First 1 } 45
    if ($qbt) {
      $ports = Wait-For { $p = Get-DaemonPorts $qbt; if ($p.Count -gt 0) { , $p } else { $null } } 45
      if (-not $ports) { $ports = @() }
      $loopback = Test-Loopback $ports
    } else {
      $loopback = 'not tested, sidecar never spawned'
    }
  }

  $results[$label] = [ordered]@{
    'app started'   = [bool]$rig
    'sidecar spawned' = [bool]$qbt
    'sidecar path'  = if ($qbt) { try { $qbt.Path } catch { 'access denied (expected under WindowsApps)' } } else { 'n/a' }
    'daemon ports'  = if ($ports.Count -gt 0) { $ports -join ', ' } else { 'none listening' }
    'loopback'      = $loopback
    'config roots'  = (Find-ConfigRoots) -join ' | '
  }

  foreach ($k in $results[$label].Keys) { Write-Host ("  {0,-16}: {1}" -f $k, $results[$label][$k]) }
  Stop-Everything
  Write-Host '::endgroup::'
}

# ------------------------------------------------------------- control ----
# Same binary, no package identity. If this fails, nothing below means anything.
Probe 'unpackaged (control)' {
  $exe = Join-Path $RepoRoot 'src-tauri\target\release\rigseed.exe'
  Start-Process $exe -RedirectStandardOutput (Join-Path $WorkDir 'control-out.txt') -RedirectStandardError (Join-Path $WorkDir 'control-err.txt') | Out-Null
}

# ------------------------------------------------------------- packaged ----
$aumid = (Get-Content (Join-Path $WorkDir 'aumid.txt') -Raw).Trim()
Write-Host "AUMID: $aumid"

Probe 'packaged (MSIX)' {
  # Activation through the shell rather than by running the exe directly: only
  # this path gives the process package identity, and package identity is the
  # entire subject of the experiment.
  Start-Process "shell:appsFolder\$aumid" | Out-Null
}

# -------------------------------------------------------------- keyring ----
Write-Host '::group::Credential Manager'
$creds = cmdkey /list 2>&1 | Select-String -Pattern 'rigseed' -SimpleMatch
if ($creds) { $creds | ForEach-Object { Write-Host "  $_" } } else { Write-Host '  no rigseed credential found' }
Write-Host '::endgroup::'

# --------------------------------------------------------------- report ----
Write-Host ''
Write-Host '=============================================================='
Write-Host ' MSIX spike results'
Write-Host '=============================================================='
foreach ($label in $results.Keys) {
  Write-Host ''
  Write-Host "  $label"
  foreach ($k in $results[$label].Keys) { Write-Host ("    {0,-16}: {1}" -f $k, $results[$label][$k]) }
}
Write-Host ''

$control = $results['unpackaged (control)']
$packaged = $results['packaged (MSIX)']

if (-not $control['app started']) {
  Write-Host '::error::the control run failed, so this tells us nothing about MSIX. Fix the build before reading anything above.'
  exit 1
}

$verdict = @()
if (-not $packaged['app started']) { $verdict += 'the packaged app does not start at all' }
elseif (-not $packaged['sidecar spawned']) { $verdict += 'the app starts but the sidecar does not spawn from WindowsApps' }
elseif ($packaged['loopback'] -like 'UNREACHABLE*') { $verdict += 'loopback to the daemon is blocked under package identity' }

if ($verdict.Count -gt 0) {
  Write-Host "::warning::MSIX route has a problem: $($verdict -join '; ')"
} else {
  Write-Host 'Packaged run matched the control on every question that can kill the route.'
}

$results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $WorkDir 'results.json')
exit 0
