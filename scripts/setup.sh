#!/usr/bin/env bash
set -euo pipefail

CONFIGURE_CLAUDE=false
CONFIGURE_CODEX=false

for arg in "$@"; do
    case $arg in
        --claude) CONFIGURE_CLAUDE=true ;;
        --codex)  CONFIGURE_CODEX=true ;;
    esac
done

if [ "$CONFIGURE_CLAUDE" = false ] && [ "$CONFIGURE_CODEX" = false ]; then
    echo "用法: ./setup.sh [--claude] [--codex]"
    echo ""
    echo "  --claude   配置 Claude Code skills"
    echo "  --codex    配置 Codex CLI skills"
    echo ""
    echo "示例:"
    echo "  ./setup.sh --claude          # 只配置 Claude Code"
    echo "  ./setup.sh --codex           # 只配置 Codex"
    echo "  ./setup.sh --claude --codex  # 两个都配置"
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"

create_link() {
    local link="$1"
    local target="$2"
    local name
    name="$(basename "$link")"
    if [ -L "$link" ]; then
        rm "$link"
    elif [ -e "$link" ]; then
        mv "$link" "$link.bak"
        echo "  [备份] $name → $name.bak"
    fi
    ln -s "$target" "$link"
}

if [ "$CONFIGURE_CLAUDE" = true ]; then
    CLAUDE_DIR="$HOME/.claude/skills"
    mkdir -p "$CLAUDE_DIR"
    echo ""
    echo "Claude Code  →  $CLAUDE_DIR"
    for skill_path in "$SKILLS_DIR"/*/; do
        skill="$(basename "$skill_path")"
        create_link "$CLAUDE_DIR/$skill" "$skill_path"
        echo "  [✓] $skill"
    done
fi

if [ "$CONFIGURE_CODEX" = true ]; then
    CODEX_DIR="$HOME/.codex/skills"
    mkdir -p "$CODEX_DIR"
    echo ""
    echo "Codex CLI    →  $CODEX_DIR"
    for skill_path in "$SKILLS_DIR"/*/; do
        skill="$(basename "$skill_path")"
        create_link "$CODEX_DIR/$skill" "$skill_path"
        echo "  [✓] $skill"
    done
fi

echo ""
echo "完成。以后更新 skill 只需："
echo "  cd $REPO_ROOT && git pull"
