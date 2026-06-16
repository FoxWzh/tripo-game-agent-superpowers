#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMAND="${1:-}"

usage() {
  cat <<'EOF'
Tripo Game Agent Superpowers portfolio demo

Usage:
  tripo-agent setup
  tripo-agent doctor
  tripo-agent install
  tripo-agent plan --prompt "<游戏资产需求>" [--input assets/ref.png]
  tripo-agent preflight --input assets/ref.png [--front assets/front.png --back assets/back.png]
  tripo-agent generate --input assets/ref.png
  tripo-agent inspect
  tripo-agent package-asset [--engine unity]
  tripo-agent run --prompt "<游戏资产需求>" --input assets/ref.png [--engine Unity] [--yes]
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
这是 FOX 应聘 Tripo Agent PM 岗位的游戏资产作品集。

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
        "game-asset-planning",
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

这里对应 Tripo Game Agent 的 intake、planning、preflight、production、readiness、memory 六个 Superpowers。`ask` 只做意图和方案预览；真实生成请使用 `run`，它会在创建 Tripo task 前做 preflight 和人工确认。
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

候选人：FOX / 吴忠赫

目标岗位：Tripo Agent Product Manager

当前经验：SeaArt SeaSpark 平台与多模态创作 Agent。关注点是把模型能力包装成用户能完成任务的产品工作流。

## 为什么选择插件而不是 PPT

PPT 只能描述方案；这个 Superpowers 风格插件能让面试官亲手体验产品判断：

- `using-tripo-game-agent` 如何强制方法论
- `game-asset-intake` 如何补齐游戏引擎约束
- `game-asset-planning` 为什么要在执行前展示 credit、时间和风险
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
  echo "已生成作品包：$out"
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

generate_command() {
  (cd "$ROOT" && node scripts/generate_game_asset.mjs "$@")
}

preflight_command() {
  (cd "$ROOT" && node scripts/preflight_game_asset.mjs "$@")
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
  (cd "$ROOT" && node scripts/plan_game_asset.mjs "${args[@]}")

  local input_args=()
  local engine_args=()
  local preflight_args=()
  local i=0
  while [[ $i -lt ${#args[@]} ]]; do
    case "${args[$i]}" in
      --input|--input-url|--front|--back|--left|--right|--base-asset|--scale-note|--pivot|--rig-preset|--poly-budget|--tier)
        preflight_args+=("${args[$i]}" "${args[$((i+1))]}")
        if [[ "${args[$i]}" == "--input" || "${args[$i]}" == "--input-url" ]]; then
          input_args+=("${args[$i]}" "${args[$((i+1))]}")
        fi
        i=$((i+2))
        ;;
      --yes|-y)
        i=$((i+1))
        ;;
      --engine)
        engine_args+=("--engine" "${args[$((i+1))]}")
        preflight_args+=("--engine" "${args[$((i+1))]}")
        i=$((i+2))
        ;;
      *)
        i=$((i+1))
      ;;
  esac
  done

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
  (cd "$ROOT" && node scripts/inspect_game_asset.mjs)
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
  generate)
    shift
    generate_command "$@"
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
