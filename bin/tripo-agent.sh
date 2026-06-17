#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMAND="${1:-}"

usage() {
  cat <<'EOF'
Tripo Game Agent Superpowers

Usage:
  tripo-agent setup
  tripo-agent doctor
  tripo-agent install
  tripo-agent install-legacy-command
  tripo-agent inventory [--input assets/front.png|--front assets/front.png --back assets/back.png]
  tripo-agent plan --prompt "<游戏资产需求>" [--input assets/ref.png]
  tripo-agent synthesize-views --input assets/front.png
  tripo-agent preflight --input assets/ref.png [--front assets/front.png --back assets/back.png]
  tripo-agent generate --input assets/ref.png
  tripo-agent convert --format FBX
  tripo-agent rig [--preset unity-humanoid] [--apply]
  tripo-agent deep-check [--engine Unity]
  tripo-agent inspect
  tripo-agent package-asset [--engine unity]
  tripo-agent run --prompt "<游戏资产需求>" --input assets/ref.png [--engine Unity] [--format FBX] [--yes]
  tripo-agent run --prompt "<游戏资产需求>" --front assets/f.png --back assets/b.png [--left assets/l.png --right assets/r.png]
  tripo-agent ask "<游戏资产需求>"
  tripo-agent memory [list|show <asset_id>]
  tripo-agent stories [id]
  tripo-agent architecture [skill-pool|composite|routing|eval]
  tripo-agent why [discord-summary|personas|method]
  tripo-agent roadmap
  tripo-agent about
  tripo-agent package
EOF
}

onboarding() {
  cat <<'EOF'
这是一个本地 Superpowers 风格的 Tripo 游戏资产 Agent 插件。

这个插件借鉴 obra/superpowers 的结构：
CLAUDE.md 是启动指令，using-tripo-game-agent 是 bootstrap skill，game-asset-* 是游戏资产能力模块。

建议走查路径：
- /tripo-agent ask "<你的游戏资产需求>"
- /tripo-agent stories
- /tripo-agent architecture
- /tripo-agent why
- /tripo-agent roadmap
- /tripo-agent about

本地离线预览：
- ./bin/tripo-agent ask "Unity 里用的机甲，quad mesh，15k 面"

真实生成：
- ./bin/tripo-agent setup
- ./bin/tripo-agent run --prompt "Unity 里用的机甲角色，quad mesh，15k 面" --input assets/mecha.png --engine Unity
EOF
}

install_command() {
  if ! command -v claude >/dev/null 2>&1; then
    cat <<EOF
未找到 Claude Code CLI。

请先安装 Claude Code，然后运行：
  claude plugin marketplace add FoxWzh/tripo-game-agent-superpowers
  claude plugin install tripo-game-agent-superpowers@tripo-game-agent-superpowers

也可以安装 legacy slash command：
  ./bin/tripo-agent install-legacy-command
EOF
    exit 1
  fi

  claude plugin validate "$ROOT"
  claude plugin marketplace add FoxWzh/tripo-game-agent-superpowers
  claude plugin install tripo-game-agent-superpowers@tripo-game-agent-superpowers

  cat <<EOF
已安装 Claude Code plugin:
  tripo-game-agent-superpowers@tripo-game-agent-superpowers

在 Claude Code 中可检查：
  /plugin
  /tripo-game-agent-superpowers:tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面"

本地开发调试也可以直接运行：
  claude --plugin-dir "$ROOT"

如果你的 Claude Code 版本不支持 plugin marketplace，仍可安装传统 slash command：
  ./bin/tripo-agent install-legacy-command
EOF
}

install_legacy_command() {
  mkdir -p "$HOME/.claude/commands"
  cp "$ROOT/commands/tripo-agent.md" "$HOME/.claude/commands/tripo-agent.md"
  cat <<EOF
已安装 legacy Claude Code slash command:
  $HOME/.claude/commands/tripo-agent.md

现在可以在 Claude Code 中运行：
  /tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面"

注意：legacy slash command 不会出现在 Claude Code 的 plugin 列表里。
EOF
}

ask_command() {
  local query="${*:-}"
  if [[ -z "$query" ]]; then
    echo "请传入游戏资产需求，例如：./bin/tripo-agent ask \"Unity 里用的机甲角色，quad mesh，15k 面\""
    exit 1
  fi

  (cd "$ROOT" && node scripts/preview_game_asset.mjs --prompt "$query")
}

stories_command() {
  local id="${1:-}"
  if [[ -z "$id" ]]; then
    sed -n '1,220p' "$ROOT/content/stories/index.md"
    return
  fi
  awk -v id="$id" '
    $0 ~ "^## " id "\\." {printing=1}
    printing && $0 ~ "^## [0-9]+\\." && $0 !~ "^## " id "\\." {exit}
    printing {print}
  ' "$ROOT/content/stories/index.md"
}

architecture_command() {
  local topic="${1:-overview}"
  case "$topic" in
    skill-pool|composite|routing|eval|overview)
      sed -n '1,260p' "$ROOT/content/architecture/overview.md"
      ;;
    *)
      echo "未知 architecture topic: $topic"
      exit 1
      ;;
  esac
}

why_command() {
  sed -n '1,240p' "$ROOT/content/discord-insights/summary.md"
}

roadmap_command() {
  sed -n '1,220p' "$ROOT/content/roadmap.md"
}

about_command() {
  cat <<'EOF'
# About

Tripo Game Agent Superpowers 是一个本地 Agent 插件，用来把游戏资产目标转成可执行的 Tripo 工作流。

## 为什么是插件

这个 Superpowers 风格插件把稳定的游戏资产知识拆进 `skills/`，把真实执行路径放进 CLI，让用户可以直接体验产品判断：

- `using-tripo-game-agent` 如何强制方法论
- `game-asset-intake` 如何补齐游戏引擎约束
- `game-asset-planning` 为什么要在执行前展示 credit、时间和风险
- Tripo conversion API 如何补齐 FBX 等游戏导出格式
- Rig precheck / auto-rig 路线如何保护角色资产 credit
- Blender / engine import readiness 如何补齐游戏验收
- `game-asset-readiness` 如何把生成结果验收为游戏可用资产
- `game-asset-memory` 如何支持改稿和系列复用

## 2 分钟导览

1. 运行 `./bin/tripo-agent setup`：配置 Tripo API key 和依赖。
2. 运行 `./bin/tripo-agent run --prompt "Unity 里用的机甲角色，quad mesh，15k 面" --input assets/mecha.png --engine Unity`：真实生成。
3. 打开 `outputs/<asset_id>/readiness_report.md`：看游戏可用性验收。
4. 打开 `skills/using-tripo-game-agent/SKILL.md`：看 Superpowers bootstrap。

Blog: https://foxwzh.github.io
EOF
}

package_command() {
  mkdir -p "$ROOT/dist"
  local out="$ROOT/dist/tripo-game-agent-superpowers.zip"
  rm -f "$out"
  (cd "$ROOT/.." && zip -qr "$out" "tripo-game-agent-superpowers" \
    -x "tripo-game-agent-superpowers/dist/*" \
    -x "tripo-game-agent-superpowers/.git/*" \
    -x "tripo-game-agent-superpowers/node_modules/*" \
    -x "tripo-game-agent-superpowers/workspace/*.json" \
    -x "tripo-game-agent-superpowers/outputs/*" \
    -x "tripo-game-agent-superpowers/assets/*" \
    -x "tripo-game-agent-superpowers/.env" \
    -x "tripo-game-agent-superpowers/.env.local")
  echo "已生成插件包：$out"
}

setup_command() {
  (cd "$ROOT" && node scripts/setup.mjs)
}

doctor_command() {
  (cd "$ROOT" && node scripts/doctor.mjs "$@")
}

plan_command() {
  (cd "$ROOT" && node scripts/plan_game_asset.mjs "$@")
}

inventory_command() {
  (cd "$ROOT" && node scripts/inventory_game_asset.mjs "$@")
}

synthesize_views_command() {
  (cd "$ROOT" && node scripts/synthesize_views.mjs "$@")
}

generate_command() {
  (cd "$ROOT" && node scripts/generate_game_asset.mjs "$@")
}

convert_command() {
  (cd "$ROOT" && node scripts/convert_model.mjs "$@")
}

preflight_command() {
  (cd "$ROOT" && node scripts/preflight_game_asset.mjs "$@")
}

rig_command() {
  (cd "$ROOT" && node scripts/rig_model.mjs "$@")
}

deep_check_command() {
  (cd "$ROOT" && node scripts/deep_readiness_check.mjs "$@")
}

inspect_command() {
  (cd "$ROOT" && node scripts/inspect_game_asset.mjs "$@")
}

package_asset_command() {
  (cd "$ROOT" && node scripts/package_engine_asset.mjs "$@")
}

memory_command() {
  (cd "$ROOT" && node scripts/memory_game_asset.mjs "$@")
}

run_command() {
  local args=("$@")
  local auto_yes="false"
  for arg in "${args[@]}"; do
    if [[ "$arg" == "--yes" || "$arg" == "-y" ]]; then
      auto_yes="true"
    fi
  done

  local input_args=()
  local engine_args=()
  local convert_args=()
  local conversion_format=""
  local preflight_args=()
  local inventory_args=()
  local plan_args=()
  local i=0
  require_value() {
    local flag="$1"
    local value="${2:-}"
    if [[ -z "$value" || "$value" == --* ]]; then
      echo "Missing value for $flag" >&2
      exit 2
    fi
  }
  while [[ $i -lt ${#args[@]} ]]; do
    case "${args[$i]}" in
      --input|--input-url|--front|--back|--left|--right|--base-asset)
        require_value "${args[$i]}" "${args[$((i+1))]:-}"
        inventory_args+=("${args[$i]}" "${args[$((i+1))]}")
        preflight_args+=("${args[$i]}" "${args[$((i+1))]}")
        if [[ "${args[$i]}" == "--input" || "${args[$i]}" == "--input-url" ]]; then
          input_args+=("${args[$i]}" "${args[$((i+1))]}")
        fi
        if [[ "${args[$i]}" == "--front" || "${args[$i]}" == "--back" || "${args[$i]}" == "--left" || "${args[$i]}" == "--right" ]]; then
          input_args+=("${args[$i]}" "${args[$((i+1))]}")
        fi
        i=$((i+2))
        ;;
      --scale-note|--pivot|--rig-preset|--poly-budget|--tier|--model|--model-family|--asset-type)
        require_value "${args[$i]}" "${args[$((i+1))]:-}"
        preflight_args+=("${args[$i]}" "${args[$((i+1))]}")
        plan_args+=("${args[$i]}" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --prompt)
        require_value "${args[$i]}" "${args[$((i+1))]:-}"
        inventory_args+=("${args[$i]}" "${args[$((i+1))]}")
        plan_args+=("${args[$i]}" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --yes|-y)
        i=$((i+1))
        ;;
      --engine)
        require_value "${args[$i]}" "${args[$((i+1))]:-}"
        engine_args+=("--engine" "${args[$((i+1))]}")
        preflight_args+=("--engine" "${args[$((i+1))]}")
        plan_args+=("--engine" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --format)
        require_value "${args[$i]}" "${args[$((i+1))]:-}"
        conversion_format="${args[$((i+1))]}"
        convert_args+=("${args[$i]}" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --texture-format|--fbx-preset)
        require_value "${args[$i]}" "${args[$((i+1))]:-}"
        convert_args+=("${args[$i]}" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --no-convert|--no-open)
        convert_args+=("${args[$i]}")
        if [[ "${args[$i]}" == "--no-open" ]]; then
          input_args+=("${args[$i]}")
        fi
        i=$((i+1))
        ;;
      *)
        i=$((i+1))
      ;;
  esac
	  done

  (cd "$ROOT" && node scripts/doctor.mjs)

  set +e
  (cd "$ROOT" && node scripts/inventory_game_asset.mjs "${inventory_args[@]}")
  local inventory_code=$?
  set -e
  if [[ $inventory_code -eq 2 ]]; then
    echo "Inventory found blocking input issues. Fix them before planning."
    exit 2
  elif [[ $inventory_code -ne 0 ]]; then
    exit "$inventory_code"
  fi

  (cd "$ROOT" && node scripts/plan_game_asset.mjs "${plan_args[@]}")

  set +e
  (cd "$ROOT" && node scripts/preflight_game_asset.mjs "${preflight_args[@]}")
  local preflight_code=$?
  set -e
  if [[ $preflight_code -eq 2 ]]; then
    echo "Preflight found blocking issues. Fix them before creating a Tripo task."
    exit 2
  elif [[ $preflight_code -ne 0 ]]; then
    exit "$preflight_code"
  fi

  echo
  echo "Generation will create a real Tripo task and may spend credits."
  echo "Review workspace/preflight_report.md and workspace/production_plan.json before continuing."
  if [[ "$auto_yes" != "true" ]]; then
    if [[ ! -t 0 ]]; then
      echo "Non-interactive session detected. Stop after preflight."
      echo "After user approval, re-run the same command with --yes."
      exit 0
    fi
    read -r -p "Continue with real generation? [y/N] " answer
    case "$answer" in
      y|Y|yes|YES) ;;
      *)
        echo "Stopped before generation."
        exit 0
        ;;
    esac
  fi

  (cd "$ROOT" && node scripts/generate_game_asset.mjs "${input_args[@]}")
  if [[ ! " ${args[*]} " =~ " --no-convert " ]]; then
    set +e
    if [[ -n "$conversion_format" ]]; then
      (cd "$ROOT" && node scripts/convert_model.mjs --format "$conversion_format" "${convert_args[@]}")
    else
      (cd "$ROOT" && node scripts/convert_model.mjs "${convert_args[@]}")
    fi
    local convert_code=$?
    set -e
    if [[ $convert_code -ne 0 ]]; then
      echo "Conversion failed; continuing with downloaded source model as fallback."
    fi
  fi
  (cd "$ROOT" && node scripts/inspect_game_asset.mjs)
  set +e
  (cd "$ROOT" && node scripts/deep_readiness_check.mjs "${engine_args[@]}")
  local deep_code=$?
  set -e
  if [[ $deep_code -ne 0 ]]; then
    echo "Deep readiness check failed; continuing with basic readiness report."
  fi
  (cd "$ROOT" && node scripts/package_engine_asset.mjs "${engine_args[@]}")
}

case "$COMMAND" in
  "")
    onboarding
    ;;
  -h|--help|help)
    usage
    ;;
  install)
    install_command
    ;;
  install-legacy-command)
    install_legacy_command
    ;;
  setup)
    setup_command
    ;;
  doctor)
    shift
    doctor_command "$@"
    ;;
  plan)
    shift
    plan_command "$@"
    ;;
  inventory)
    shift
    inventory_command "$@"
    ;;
  synthesize-views)
    shift
    synthesize_views_command "$@"
    ;;
  generate)
    shift
    generate_command "$@"
    ;;
  convert)
    shift
    convert_command "$@"
    ;;
  rig)
    shift
    rig_command "$@"
    ;;
  deep-check)
    shift
    deep_check_command "$@"
    ;;
  preflight)
    shift
    preflight_command "$@"
    ;;
  inspect)
    shift
    inspect_command "$@"
    ;;
  package-asset)
    shift
    package_asset_command "$@"
    ;;
  run)
    shift
    run_command "$@"
    ;;
  ask)
    shift
    ask_command "$@"
    ;;
  stories)
    stories_command "${2:-}"
    ;;
  architecture)
    architecture_command "${2:-overview}"
    ;;
  why)
    why_command "${2:-}"
    ;;
  roadmap)
    roadmap_command
    ;;
  memory)
    shift
    memory_command "$@"
    ;;
  about)
    about_command
    ;;
  package)
    package_command
    ;;
  *)
    usage
    exit 1
    ;;
esac
