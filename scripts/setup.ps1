param(
    [switch]$Claude,
    [switch]$Codex
)

# 不传任何参数时，默认两个都配
if (-not $Claude -and -not $Codex) {
    $Claude = $true
    $Codex = $true
    Write-Host "未指定参数，默认配置 Claude Code + Codex CLI"
    Write-Host "（如只想配一个，请显式传 -Claude 或 -Codex）"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$skillsDir = Join-Path $repoRoot "skills"
$skills = Get-ChildItem $skillsDir -Directory | Select-Object -ExpandProperty Name

function New-SkillJunction {
    param([string]$Link, [string]$Target)
    # 处理已存在的 link / 实体目录（含悬空 junction）
    $existing = Get-Item -LiteralPath $Link -Force -ErrorAction SilentlyContinue
    if ($existing) {
        if ($existing.LinkType) {
            # 已是 junction / symlink（无论是否悬空），直接删
            [System.IO.Directory]::Delete($Link)
        }
        else {
            # 实体目录，备份避免误删用户数据
            Rename-Item -LiteralPath $Link -NewName "$($existing.Name).bak"
            Write-Host "  [备份] $($existing.Name) → $($existing.Name).bak"
        }
    }
    # PowerShell 原生创建 junction，错误信息直观，且 5.0+ 无需管理员
    New-Item -ItemType Junction -Path $Link -Target $Target -ErrorAction Stop | Out-Null
}

if ($Claude) {
    $claudeDir = "$env:USERPROFILE\.claude\skills"
    New-Item -ItemType Directory -Force $claudeDir | Out-Null
    Write-Host ""
    Write-Host "Claude Code  →  $claudeDir"
    foreach ($skill in $skills) {
        New-SkillJunction -Link (Join-Path $claudeDir $skill) -Target (Join-Path $skillsDir $skill)
        Write-Host "  [✓] $skill"
    }
}

if ($Codex) {
    $codexDir = "$env:USERPROFILE\.codex\skills"
    New-Item -ItemType Directory -Force $codexDir | Out-Null
    Write-Host ""
    Write-Host "Codex CLI    →  $codexDir"
    foreach ($skill in $skills) {
        New-SkillJunction -Link (Join-Path $codexDir $skill) -Target (Join-Path $skillsDir $skill)
        Write-Host "  [✓] $skill"
    }
}

Write-Host ""
Write-Host "完成。以后更新 skill 只需："
Write-Host "  cd $repoRoot"
Write-Host "  git pull"
