[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$Workspace
)

$ErrorActionPreference = "Stop"
$pluginRoot = Split-Path $PSScriptRoot -Parent
$target = [System.IO.Path]::GetFullPath($Workspace)

$directories = @(
  "00_基础资料",
  "01_附件库",
  "02_公司",
  "_AI内部"
)
foreach ($directory in $directories) {
  New-Item -ItemType Directory -Path (Join-Path $target $directory) -Force | Out-Null
}

$files = @(
  @{ Source = "模板\工作约定.md"; Target = "AGENTS.md" },
  @{ Source = "模板\个人资料.md"; Target = "00_基础资料\个人资料.md" },
  @{ Source = "模板\求职意向.md"; Target = "00_基础资料\求职意向.md" },
  @{ Source = "模板\投递总览.md"; Target = "90_投递总览.md" }
)

foreach ($file in $files) {
  $destination = Join-Path $target $file.Target
  if (-not (Test-Path -LiteralPath $destination)) {
    Copy-Item -LiteralPath (Join-Path $pluginRoot $file.Source) -Destination $destination
  }
}

Write-Host "Workspace ready: $target"
