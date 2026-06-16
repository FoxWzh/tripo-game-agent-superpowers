#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMAND="${1:-}"

usage() {
  cat <<'EOF'
Tripo Game Agent Superpowers portfolio demo

Usage:
  tripo-agent install
  tripo-agent demo game-character
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
- /tripo-agent demo game-character
- /tripo-agent ask "<你的游戏资产需求>"
- /tripo-agent stories
- /tripo-agent architecture
- /tripo-agent why
- /tripo-agent roadmap
- /tripo-agent about

本地离线预览：
- ./bin/tripo-agent demo game-character
- ./bin/tripo-agent ask "Unity 里用的机甲，quad mesh，15k 面"
EOF
}

install_command() {
  mkdir -p "$HOME/.claude/commands"
  cp "$ROOT/commands/tripo-agent.md" "$HOME/.claude/commands/tripo-agent.md"
  cat <<EOF
已安装 Claude Code slash command:
  $HOME/.claude/commands/tripo-agent.md

现在可以在 Claude Code 中运行：
  /tripo-agent demo game-character
  /tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面"

如果你使用 Codex plugin UI，也可以导入整个目录：
  $ROOT
EOF
}

demo_game_character() {
  cat <<'EOF'
# /tripo-agent demo game-character

这是一段 [MOCK] 产品演示，不调用 Tripo API。目标是展示 Tripo Game Agent Superpowers 如何把游戏资产目标翻译成可执行工作流。

## 1. 用户意图

用户说：

> 我有一张机甲角色概念图，想在 Unity 里用。

## 2. using-tripo-game-agent 启动

```json
{
  "stage": "intake",
  "skill_order": [
    "game-asset-intake",
    "game-asset-planning",
    "game-asset-production",
    "game-asset-readiness",
    "game-asset-memory"
  ],
  "rule": "do_not_skip_planning_or_readiness"
}
```

## 3. game-asset-intake / Asset Brief

```json
{
  "persona": "Marcus / 独立游戏美术",
  "downstream_target": "Unity",
  "recommended_workflow": "GameReadyCharacter",
  "tags": {
    "format": "FBX",
    "topology": "quad",
    "poly_budget": "15k",
    "texture": "PBR metal-rough",
    "rig": "humanoid"
  },
  "confidence": 0.86
}
```

为什么不是直接 ImageTo3D：

- Unity 是下游场景，不是导出格式本身。
- "能在 Unity 用"隐含 rig、PBR、FBX、拓扑预算和导入说明。
- 用户不应该自己知道 Retopo、UV、Rig 的顺序。

## 4. Agent 主动澄清

1. 目标面数按 15k 走，还是更偏手游的 8k？
2. 是否需要标准 humanoid rig，方便直接接 Unity Animator？

本 demo 采用：15k + humanoid rig。

## 5. game-asset-planning / Production Plan

```text
GameReadyCharacter
ImageTo3D
  -> Retopo(mode=quad, target=15k)
  -> Segment
  -> UVUnwrap
  -> PBRTexture(workflow=metal-rough)
  -> Rig(type=humanoid)
  -> ExportFBX(textures=zip)
```

## 6. 执行前成本透明

| 档位 | 内容 | 预计 credit | 预计时间 |
| --- | --- | ---: | ---: |
| Draft | ImageTo3D + GLB preview | 6 | 2-3 min |
| No-rig | 到 PBR + FBX，不绑骨 | 27 | 6-8 min |
| Full | PBR + humanoid rig + FBX zip | 34 | 8-12 min |

Full 估算拆分：

- ImageTo3D: 6 credits
- Retopo: 10 credits
- UV + PBRTexture: 9 credits
- Rig: 7 credits
- Export packaging: 2 credits

## 7. game-asset-production / [MOCK] 执行可观测

```text
[MOCK] Step 1/7 ImageTo3D started. Estimated 90s. Reserved 6 credits.
[MOCK] Step 1/7 ImageTo3D completed. Preview GLB ready.
[MOCK] Step 2/7 Retopo(mode=quad,target=15k) completed. Mesh budget: 14.8k faces.
[MOCK] Step 3/7 Segment completed. Parts: head, torso, arms, legs, armor plates.
[MOCK] Step 4/7 UVUnwrap completed. UV overlap risk: low.
[MOCK] Step 5/7 PBRTexture(workflow=metal-rough) timed out after 90s.
[MOCK] Agent fallback: retry once because texture is critical for Unity import.
[MOCK] Retry still unstable. Agent decision: downgrade from 4K PBR to 2K PBR to protect delivery certainty and credit burn.
[MOCK] Step 5/7 PBRTexture completed with 2K maps.
[MOCK] Step 6/7 Rig(type=humanoid) completed. Unity humanoid mapping generated.
[MOCK] Step 7/7 ExportFBX(textures=zip) completed.
```

## 8. game-asset-readiness / [MOCK] 可用性检查

```text
[MOCK] Polycount check passed: 14.8k / target 15k.
[MOCK] UV overlap check passed: low risk.
[MOCK] PBR maps present: basecolor, normal, metallic_roughness, ao.
[MOCK] Unity humanoid mapping passed with warning: shoulder armor may clip.
[MOCK] Scale check passed: meter.
[MOCK] Pivot check passed: bottom center.
[MOCK] Unity import smoke test passed.
```

## 9. [MOCK] 产物交付

```text
mecha_marcus_unity_fbx.zip
├── mecha_marcus.fbx
├── textures/
│   ├── basecolor_2k.png
│   ├── normal_2k.png
│   ├── metallic_roughness_2k.png
│   └── ao_2k.png
├── rig/
│   └── humanoid_mapping.json
└── report/
    ├── cost_breakdown.md
    ├── import_unity.md
    └── fallback_log.md
```

## 10. game-asset-memory / 系列复用记录

```json
{
  "series_id": "mecha_unity_demo",
  "engine": "Unity",
  "poly_budget": "15k",
  "texture_policy": "PBR 2K metal-rough",
  "rig_policy": "Unity humanoid",
  "fallback_history": ["PBR 4K timeout -> 2K fallback"]
}
```

## 11. 产品判断

Studio 里用户要自己理解 Image-to-3D、Retopo、UV、PBR、Rig、Readiness、Export 的先后关系。Game Agent 的价值不是替代生成模型，而是把游戏引擎约束变成稳定的资产生产协议。
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

这里对应 Tripo Game Agent 的 intake、planning、production、readiness、memory 五个 Superpowers。本地 demo 不执行真实生成。
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

1. 运行 `/tripo-agent demo game-character`：看一次完整 Unity-ready 角色资产流程。
2. 运行 `/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面"`：看自由输入解析。
3. 打开 `skills/using-tripo-game-agent/SKILL.md`：看 Superpowers bootstrap。
4. 打开 `skills/game-asset-readiness/SKILL.md`：看游戏可用性验收。

Blog: https://foxwzh.github.io
EOF
}

package_command() {
  mkdir -p "$ROOT/dist"
  local out="$ROOT/dist/tripo-game-agent-superpowers.zip"
  rm -f "$out"
  (cd "$ROOT/.." && zip -qr "$out" "tripo-game-agent-superpowers" -x "tripo-game-agent-superpowers/dist/*" -x "tripo-game-agent-superpowers/.git/*")
  echo "已生成作品包：$out"
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
  demo)
    if [[ "${2:-}" == "game-character" ]]; then
      demo_game_character
    else
      echo "支持的 demo: game-character"
      exit 1
    fi
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
