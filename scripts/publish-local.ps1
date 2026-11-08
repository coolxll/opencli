[CmdletBinding()]
param(
    [string]$ReleaseDir = "$env:USERPROFILE\scoop\persist\opencli-release",
    [string]$ScoopPkgPath = "$env:USERPROFILE\scoop\apps\nodejs-lts\current\bin\node_modules\@jackwener\opencli",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     OpenCLI Local Production Publish   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repo Root:     $RepoRoot"
Write-Host "Release Dir:   $ReleaseDir"
Write-Host "Scoop Package: $ScoopPkgPath"

# 1. Build
if (-not $SkipBuild) {
    Write-Host "`n[1/4] Building OpenCLI (npm run build)..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "`n[1/4] Skipping build (-SkipBuild specified)..." -ForegroundColor DarkGray
}

# 2. Prepare Release Dir
Write-Host "`n[2/4] Ensuring release directory exists..." -ForegroundColor Yellow
if (!(Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
}

# 3. Copy production assets
Write-Host "`n[3/4] Syncing production assets to $ReleaseDir..." -ForegroundColor Yellow

function Sync-Folder {
    param([string]$Source, [string]$Dest)
    if (Test-Path $Source) {
        if (!(Test-Path $Dest)) {
            New-Item -ItemType Directory -Path $Dest -Force | Out-Null
        }
        robocopy $Source $Dest /MIR /NP /NFL /NDL /R:1 /W:1 /NJH /NJS | Out-Null
        if ($LASTEXITCODE -ge 8) {
            throw "Robocopy failed from $Source to $Dest with code $LASTEXITCODE"
        }
    }
}

Write-Host "  -> Syncing dist..."
Sync-Folder "$RepoRoot\dist" "$ReleaseDir\dist"

Write-Host "  -> Syncing clis..."
Sync-Folder "$RepoRoot\clis" "$ReleaseDir\clis"

if (Test-Path "$RepoRoot\skills") {
    Write-Host "  -> Syncing skills..."
    Sync-Folder "$RepoRoot\skills" "$ReleaseDir\skills"
}

if (Test-Path "$RepoRoot\scripts") {
    Write-Host "  -> Syncing scripts..."
    Sync-Folder "$RepoRoot\scripts" "$ReleaseDir\scripts"
}

Write-Host "  -> Syncing node_modules..."
Sync-Folder "$RepoRoot\node_modules" "$ReleaseDir\node_modules"

Write-Host "  -> Copying metadata files..."
Copy-Item "$RepoRoot\package.json" "$ReleaseDir\package.json" -Force
Copy-Item "$RepoRoot\cli-manifest.json" "$ReleaseDir\cli-manifest.json" -Force
if (Test-Path "$RepoRoot\README.md") { Copy-Item "$RepoRoot\README.md" "$ReleaseDir\README.md" -Force }
if (Test-Path "$RepoRoot\README.zh-CN.md") { Copy-Item "$RepoRoot\README.zh-CN.md" "$ReleaseDir\README.zh-CN.md" -Force }
if (Test-Path "$RepoRoot\LICENSE") { Copy-Item "$RepoRoot\LICENSE" "$ReleaseDir\LICENSE" -Force }

# 4. Switch Scoop Package Junction
Write-Host "`n[4/4] Updating Scoop package junction..." -ForegroundColor Yellow
$ScoopParent = Split-Path $ScoopPkgPath -Parent
if (!(Test-Path $ScoopParent)) {
    New-Item -ItemType Directory -Path $ScoopParent -Force | Out-Null
}

if (Test-Path $ScoopPkgPath) {
    $item = Get-Item $ScoopPkgPath -Force
    if ($item.LinkType) {
        Write-Host "  Removing existing junction (target was: $($item.Target))..."
        # Safely remove junction without touching target files
        cmd.exe /c rmdir "$ScoopPkgPath"
    } else {
        $backupPath = "$($ScoopPkgPath).bak-$((Get-Date).ToString('yyyyMMddHHmmss'))"
        Write-Host "  Moving existing directory to $backupPath..."
        Rename-Item -Path $ScoopPkgPath -NewName (Split-Path $backupPath -Leaf) -Force
    }
}

Write-Host "  Creating junction: $ScoopPkgPath -> $ReleaseDir"
New-Item -ItemType Junction -Path $ScoopPkgPath -Target $ReleaseDir -Force | Out-Null

$finalItem = Get-Item $ScoopPkgPath -Force
Write-Host "`nVerification:" -ForegroundColor Green
Write-Host "  Junction Path:   $ScoopPkgPath"
Write-Host "  Junction Target: $($finalItem.Target)"

Write-Host "`nRestarting running daemon (if any) to apply new release..." -ForegroundColor Yellow
try {
    & "$env:USERPROFILE\scoop\apps\nodejs-lts\current\bin\opencli.cmd" daemon restart
} catch {
    Write-Host "  Daemon restart skipped or daemon not running." -ForegroundColor DarkGray
}

Write-Host "`n=== Local Publish Complete ===" -ForegroundColor Green
