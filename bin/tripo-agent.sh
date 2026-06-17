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
  mkdir -p "$HOME/.claude/commands"
  cp "$ROOT/commands/tripo-agent.md" "$HOME/.claude/commands/tripo-agent.md"
  cat <<EOF
已安装 Claude Code slash command:
  $HOME/.claude/commands/tripo-agent.md

现在可以在 Claude Code 中运行：
  /tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面"

如果你使用 Codex plugin UI，也可以导入整个目录：
  $ROOT
EOF
}

ask_command() {
  local query="${*:-}"
  if [[ -z "$query" ]]; then
    echo "请传入游戏资产需求，例如：./bin/tripo-agent ask \"Unity 里用的机甲角色，quad mesh，15k 面\""
    exit 1
  fi

  local persona="Game asset user / 意图待澄清"
  local workflow="需要先澄清"
  local confidence="0.42"
  local tags=()
  local clarify=("目标游戏引擎是 Unity、Unreal、Roblox 还是 Godot？" "资产类型是角色、道具、武器、场景件还是 modular part？")
  local credits="待澄清后估算"
  local time="待澄清后估算"

  if [[ "$query" =~ (Unity|Unreal|UE|Roblox|Godot|FBX|fbx|GLB|glb|quad|Quad|rig|Rig|骨骼|游戏|game|角色|机甲|character|humanoid) ]]; then
    persona="Marcus / 游戏资产用户"
    workflow="GameReadyCharacter"
    confidence="0.86"
    tags=("downstream=game-engine" "format=fbx" "topology=quad" "rig=humanoid")
    clarify=("目标面数是 15k、8k，还是由 Agent 按平台自动建议？" "需要 Unity humanoid 还是 UE Manny 兼容骨骼？")
    credits="27-34 credits"
    time="6-12 min"
  fi

  if [[ "$query" =~ (武器|剑|枪|刀|斧|weapon|sword|gun|prop|道具|宝箱|药水|pickup) ]]; then
    persona="Game prop / weapon creator"
    workflow="GameReadyWeapon"
    confidence="0.8"
    tags=("asset_type=weapon_or_prop" "pivot=grip_or_center" "format=fbx_or_glb" "texture=pbr")
    clarify=("目标引擎是什么？" "武器需要 grip pivot，还是只是静态展示道具？")
    credits="14-20 credits"
    time="4-8 min"
  fi

  if [[ "$query" =~ (盔甲|披风|装备|modular|Modular|之前|上次|同风格|资产包|outfit|armor|attachment) ]]; then
    persona="Chen / Modular 游戏资产用户"
    workflow="ModularGameAsset"
    confidence="0.73"
    tags=("target=modular-assets" "reference=existing-character" "style=consistent" "fit=topology-aware")
    clarify=("请提供上一个角色的 asset id 或文件路径。" "这些装备是要可替换穿戴，还是只需要视觉上贴合？")
    credits="24-45 credits"
    time="8-18 min"
  fi

  if [[ "$query" =~ (场景|建筑|石头|树|地形|environment|building|rock|terrain|level) ]]; then
    persona="Environment asset creator"
    workflow="GameReadyEnvironment"
    confidence="0.76"
    tags=("asset_type=environment" "lod=required" "collider=hint" "format=glb_or_fbx")
    clarify=("这是单个场景件，还是 modular level kit？" "需要 collider hints 和 LOD 吗？")
    credits="18-30 credits"
    time="6-12 min"
  fi

  if [[ "$query" =~ (随便|不知道|帮我想|都行) ]]; then
    persona="Game asset user / 意图澄清"
    workflow="暂不选择工作流"
    confidence="0.22"
    tags=("intent=ambiguous")
    clarify=("目标游戏引擎是什么？" "资产类型是角色、道具、武器、场景件还是 modular part？")
    credits="不建议估算"
    time="不建议估算"
  fi

  cat <<EOF
# /tripo-agent ask

输入：

> $query

## using-tripo-game-agent

    {
      "stage": "intake",
      "skill_order": [
        "game-asset-intake",
        "game-asset-view-strategy",
        "game-asset-planning",
        "game-asset-preflight",
        "game-asset-production",
        "game-asset-readiness",
        "game-asset-memory"
      ]
    }

## game-asset-intake / Asset Brief

- 用户画像：$persona
- 推荐工作流：$workflow
- 置信度：$confidence
- 抽取 tags：${tags[*]:-"intent=unclear"}

## game-asset-planning / Production Plan

规划前会先运行 `game-asset-view-strategy`，盘点用户是单图、多视图、文字还是已有模型，再决定 image_to_model / multiview_to_model / text_to_model 和 P1 / H3 / H2 / Turbo / v1.4 模型路线。

EOF

  case "$workflow" in
    GameReadyCharacter)
      cat <<'EOF'
```text
ImageTo3D
  -> Retopo(mode=quad)
  -> UVUnwrap
  -> PBRTexture
  -> Rig
  -> ReadinessReview
  -> ExportFBX
```

理由：游戏引擎目标隐含拓扑、骨骼、材质、格式和导入稳定性，不应让用户自己串工具。
EOF
      ;;
    GameReadyWeapon)
      cat <<'EOF'
```text
ImageTo3D or TextTo3D
  -> Retopo(target=engine_budget)
  -> UVUnwrap
  -> PBRTexture
  -> GripPivotCheck
  -> ScaleCheck
  -> ReadinessReview
  -> ExportFBX
```

理由：武器/道具的游戏可用性重点是 pivot、scale、PBR 和导入稳定性，不一定需要 rig。
EOF
      ;;
    GameReadyEnvironment)
      cat <<'EOF'
```text
TextTo3D or ImageTo3D
  -> Segment
  -> OptimizeMesh
  -> GenerateLOD
  -> PBRTexture
  -> ColliderHint
  -> ReadinessReview
  -> ExportGLB or ExportFBX
```

理由：场景件更关注 LOD、collider、scale 和批量导入，不应该套角色工作流。
EOF
      ;;
    ModularGameAsset)
      cat <<'EOF'
```text
LoadExistingCharacter
  -> StyleLock
  -> GenerateAttachment
  -> FitToBaseMesh
  -> TextureMatch
  -> ReadinessReview
  -> ExportPack
```

理由：这里的核心不是单件生成，而是与已有角色保持风格、尺寸和替换关系。
EOF
      ;;
    *)
      cat <<'EOF'
暂不执行。当前需求缺少游戏引擎或资产类型，直接生成会制造 credit 风险。
EOF
      ;;
  esac

  cat <<EOF

## 执行前透明度

- 预计 credit：$credits
- 预计耗时：$time
- 可选档位：Draft / Standard / Full

## 需要澄清

EOF
  for item in "${clarify[@]}"; do
    echo "- $item"
  done

  cat <<'EOF'

## 真实产品映射

这里对应 Tripo Game Agent 的 intake、view-strategy、planning、preflight、production、readiness、memory 七个 Superpowers。`ask` 只做意图和方案预览；真实生成请使用 `run`，它会在创建 Tripo task 前做 input inventory、model routing、preflight 和人工确认。
EOF
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

run_command() {
  local args=("$@")
  local auto_yes="false"
  for arg in "${args[@]}"; do
    if [[ "$arg" == "--yes" || "$arg" == "-y" ]]; then
      auto_yes="true"
    fi
  done

  (cd "$ROOT" && node scripts/doctor.mjs)

  local input_args=()
  local engine_args=()
  local convert_args=()
  local conversion_format=""
  local preflight_args=()
  local inventory_args=()
  local plan_args=()
  local i=0
  while [[ $i -lt ${#args[@]} ]]; do
    case "${args[$i]}" in
      --input|--input-url|--front|--back|--left|--right|--base-asset)
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
        preflight_args+=("${args[$i]}" "${args[$((i+1))]}")
        plan_args+=("${args[$i]}" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --prompt)
        inventory_args+=("${args[$i]}" "${args[$((i+1))]}")
        plan_args+=("${args[$i]}" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --yes|-y)
        i=$((i+1))
        ;;
      --engine)
        engine_args+=("--engine" "${args[$((i+1))]}")
        preflight_args+=("--engine" "${args[$((i+1))]}")
        plan_args+=("--engine" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --format)
        conversion_format="${args[$((i+1))]}"
        convert_args+=("${args[$i]}" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      --texture-format|--fbx-preset)
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
