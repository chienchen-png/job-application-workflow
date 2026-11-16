[CmdletBinding()]
param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "JobApplicationWorkflow\EdgeControl"),
  [switch]$ValidateOnly,
  [switch]$PrepareOnly
)

$ErrorActionPreference = "Stop"

$Version = "0.1.7"
$ArchiveName = "edge-control-v$Version-quick-deploy.zip"
$ExpectedSha256 = "81d16ff1dfcafcdd54a449d271eaa65daf9d7f0a445881ea4158a0389ebf943d"
$ReleaseUrl = "https://github.com/C4AL/codex-edge-control-bridge/releases/download/v$Version/$ArchiveName"
$VersionRoot = Join-Path $InstallRoot "edge-control-$Version"
$ReadyMarker = Join-Path $VersionRoot ".job-application-workflow-ready"

Write-Host "Checking Edge Control requirements..."

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCommand) {
  throw "Node.js 18+ is required. Install Node.js, reopen the terminal, then rerun this script."
}

$NodeVersion = (& $NodeCommand.Source --version).Trim()
if ($NodeVersion -notmatch "^v(?<major>\d+)\." -or [int]$Matches.major -lt 18) {
  throw "Node.js 18+ is required. Current version: $NodeVersion"
}
Write-Host "Node.js: $NodeVersion"

$CodexCommand = Get-Command codex -ErrorAction SilentlyContinue
if (-not $CodexCommand) {
  throw "Codex CLI is required. Install or repair the Codex desktop app, then rerun this script."
}

$CodexVersion = (& $CodexCommand.Source --version).Trim()
Write-Host "Codex: $CodexVersion"
Write-Host "Edge Control target: $VersionRoot"

if ($ValidateOnly) {
  Write-Host "Validation passed. No files were downloaded or changed."
  exit 0
}

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath $ReadyMarker)) {
  if (Test-Path -LiteralPath $VersionRoot) {
    throw "The target directory exists but is incomplete: $VersionRoot. Choose a new -InstallRoot or remove that incomplete managed directory."
  }

  $ArchivePath = Join-Path $InstallRoot $ArchiveName
  Write-Host "Downloading Edge Control v$Version..."
  Invoke-WebRequest -UseBasicParsing -Uri $ReleaseUrl -OutFile $ArchivePath

  $ActualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ArchivePath).Hash.ToLowerInvariant()
  if ($ActualHash -ne $ExpectedSha256) {
    throw "SHA-256 mismatch. Expected $ExpectedSha256, received $ActualHash."
  }

  $StagingRoot = Join-Path $InstallRoot (".edge-control-staging-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $StagingRoot | Out-Null
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $StagingRoot

  $QuickDeploy = Join-Path $StagingRoot "scripts\quick-deploy.ps1"
  if (-not (Test-Path -LiteralPath $QuickDeploy)) {
    throw "The release archive does not contain scripts/quick-deploy.ps1."
  }

  Set-Content -LiteralPath (Join-Path $StagingRoot ".job-application-workflow-ready") -Value $Version -Encoding ascii
  Move-Item -LiteralPath $StagingRoot -Destination $VersionRoot
}

if ($PrepareOnly) {
  Write-Host "Edge Control v$Version is downloaded and verified."
  Write-Host "Prepared files: $VersionRoot"
  exit 0
}

$QuickDeploy = Join-Path $VersionRoot "scripts\quick-deploy.ps1"
Write-Host "Deploying bridge, edge-browser-ops Skill, and edge-control MCP..."
& $QuickDeploy

$McpConfig = & $CodexCommand.Source mcp get edge-control --json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $McpConfig) {
  throw "edge-control MCP registration was not found after deployment."
}

$ExtensionPath = Join-Path $VersionRoot "extension"
$ConfigPath = Join-Path $env:APPDATA "CodexEdgeControl\config.json"

Write-Host ""
Write-Host "Edge Control is configured."
Write-Host "MCP server: edge-control"
Write-Host "Bridge config: $ConfigPath"
Write-Host "Extension path: $ExtensionPath"
Write-Host ""
Write-Host "First use:"
Write-Host "1. Open edge://extensions in Microsoft Edge."
Write-Host "2. Enable Developer mode."
Write-Host "3. Load the unpacked extension from the Extension path above."
Write-Host "4. Reload the Codex MCP configuration or start a new Codex session."
Write-Host "5. Verify edge_bridge_status and edge_list_tabs."
