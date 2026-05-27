param(
    [switch]$Claude,
    [switch]$Codex
)

if (-not $Claude -and -not $Codex) {
    Write-Host "用法: .\setup.ps1 [-Claude] [-Codex]"
    Write-Host ""
    Write-Host "  -Claude   配置 Claude Code skills"
    Write-Host "  -Codex    配置 Codex CLI skills"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\setup.ps1 -Claude          # 只配置 Claude Code"
    Write-Host "  .\setup.ps1 -Codex           # 只配置 Codex"
    Write-Host "  .\setup.ps1 -Claude -Codex   # 两个都配置"
    exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsDir = Join-Path $repoRoot "skills"
$skills = Get-ChildItem $skillsDir -Directory | Select-Object -ExpandProperty Name

function New-Junction {
    param([string]$Link, [string]$Target)
    if (Test-Path $Link) {
        $item = Get-Item $Link -Force -ErrorAction SilentlyContinue
        if ($item -and $item.LinkType) {
            Remove-Item $Link -Force
        }
        else {
            Rename-Item $Link "$Link.bak"
            Write-Host "  [备份] $(Split-Path $Link -Leaf) → $(Split-Path $Link -Leaf).bak"
        }
    }
    cmd /c mklink /J "`"$Link`"" "`"$Target`"" | Out-Null
}

if ($Claude) {
    $claudeDir = "$env:USERPROFILE\.claude\skills"
    New-Item -ItemType Directory -Force $claudeDir | Out-Null
    Write-Host ""
    Write-Host "Claude Code  →  $claudeDir"
    foreach ($skill in $skills) {
        New-Junction -Link (Join-Path $claudeDir $skill) -Target (Join-Path $skillsDir $skill)
        Write-Host "  [✓] $skill"
    }
}

if ($Codex) {
    $codexDir = "$env:USERPROFILE\.codex\skills"
    New-Item -ItemType Directory -Force $codexDir | Out-Null
    Write-Host ""
    Write-Host "Codex CLI    →  $codexDir"
    foreach ($skill in $skills) {
        New-Junction -Link (Join-Path $codexDir $skill) -Target (Join-Path $skillsDir $skill)
        Write-Host "  [✓] $skill"
    }
}

Write-Host ""
Write-Host "完成。以后更新 skill 只需："
Write-Host "  cd $repoRoot"
Write-Host "  git pull"
