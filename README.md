# Tripo Game Agent Superpowers

FOX 应聘 Tripo Agent Product Manager 的游戏资产方向面试作品。

这个项目借鉴 [`obra/superpowers`](https://github.com/obra/superpowers) 的思想：`CLAUDE.md` 是启动指令，`using-tripo-game-agent` 是 bootstrap skill，多个 `game-asset-*` skill 承载稳定的业务知识、工作流和输出契约。

它不是一个 mock demo。真实生成、格式转换、候选多视图、rig precheck 都走 Tripo API；没有 `TRIPO_API_KEY` 时会停在 setup / preflight 阶段。

## What This Demonstrates

游戏用户通常只会描述目标：

```text
我要一个 Unity 里用的机甲角色，quad mesh，15k 面，带骨骼。
```

他们不会自然说出：

```text
先盘点素材 -> 判断单图/多视图 -> 选 P1/H3 -> 生成 3D
-> 转 FBX -> rig precheck -> readiness -> package
```

这个插件展示的就是 Agent 产品层如何把“目标”翻译成“可执行游戏资产工作流”。

当前流程：

```text
Intent Intake
  -> Input Inventory / View Strategy
  -> Model Routing
  -> Export Route
  -> Rig Route
  -> Production Plan
  -> Preflight / Human Confirmation
  -> Tripo Generation
  -> Conversion
  -> Rig Precheck / Auto Rig if confirmed
  -> Basic Readiness
  -> Deep Readiness
  -> Package
  -> Memory
```

## Quick Start

Clone:

```bash
git clone https://github.com/FoxWzh/tripo-game-agent-superpowers.git
cd tripo-game-agent-superpowers
```

Run the no-credit local walkthrough first:

```bash
./bin/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
./bin/tripo-agent architecture
```

This shows the Agent decision flow without creating a Tripo task.

## Setup For Real API Calls

Run:

```bash
./bin/tripo-agent setup
```

`setup` will:

- Ask for `TRIPO_API_KEY` if missing and save it to `.env.local`.
- Check Node / npm / curl / zip.
- Check Blender, optional but recommended for deep readiness.
- Ask before running `npm install` if dependencies are missing.

`.env.local`, `assets/`, `workspace/*.json`, and `outputs/` are gitignored.

## Try It Locally

Put a reference image under `assets/`, for example:

```text
assets/mecha.png
```

Run the full guarded workflow:

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --input assets/mecha.png \
  --engine Unity
```

`run` does:

```text
doctor
  -> inventory
  -> plan / model_route / export_route / rig_route
  -> preflight
  -> asks for confirmation before spending credits
  -> generate
  -> convert
  -> inspect
  -> deep-check
  -> package
```

If you are recording and already accept the risk:

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --input assets/mecha.png \
  --engine Unity \
  --yes
```

Disable auto-opening generated files:

```bash
TRIPO_AGENT_NO_OPEN=1 ./bin/tripo-agent run ...
# or
./bin/tripo-agent run ... --no-open
```

## Step-By-Step Mode

Use this when you want to inspect every decision:

```bash
./bin/tripo-agent inventory --input assets/mecha.png

./bin/tripo-agent plan \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --engine Unity \
  --poly-budget 15000 \
  --rig-preset unity-humanoid

./bin/tripo-agent preflight \
  --input assets/mecha.png \
  --engine Unity \
  --poly-budget 15000 \
  --rig-preset unity-humanoid

./bin/tripo-agent generate --input assets/mecha.png
./bin/tripo-agent convert
./bin/tripo-agent rig --preset unity-humanoid
./bin/tripo-agent inspect
./bin/tripo-agent deep-check --engine Unity
./bin/tripo-agent package-asset --engine Unity
```

Important: `rig` defaults to precheck only. To spend rigging credits and apply auto-rig:

```bash
./bin/tripo-agent rig --preset unity-humanoid --apply
```

## Multiview Workflow

If the user already has real multiview images, prefer those:

```bash
./bin/tripo-agent inventory \
  --front assets/mecha_front.png \
  --back assets/mecha_back.png \
  --left assets/mecha_left.png \
  --right assets/mecha_right.png

./bin/tripo-agent plan \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --engine Unity

./bin/tripo-agent generate \
  --front assets/mecha_front.png \
  --back assets/mecha_back.png \
  --left assets/mecha_left.png \
  --right assets/mecha_right.png
```

If the user only has one image, ask before generating candidate views:

```bash
./bin/tripo-agent synthesize-views --input assets/mecha_front.png
```

The generated views are opened for confirmation. Do not proceed to 3D until the user accepts them.

## Install Into Claude Code

Install the slash command:

```bash
./bin/tripo-agent install
```

Then open Claude Code in this repository and run:

```text
/tripo-agent ask "Unreal 里用的 boss 角色，需要 UE Manny 兼容骨骼"
/tripo-agent architecture
/tripo-agent about
```

The slash command delegates to the same Superpowers-style workflow defined in `CLAUDE.md` and `skills/`.

## Install Into Codex

This repo includes a Codex plugin manifest:

```text
.codex-plugin/plugin.json
```

Import the repository directory as a local Codex plugin. The core skills live under:

```text
skills/
```

## Command Reference

```bash
./bin/tripo-agent setup
./bin/tripo-agent doctor
./bin/tripo-agent ask "<游戏资产需求>"
./bin/tripo-agent architecture
./bin/tripo-agent inventory ...
./bin/tripo-agent plan ...
./bin/tripo-agent preflight ...
./bin/tripo-agent synthesize-views ...
./bin/tripo-agent generate ...
./bin/tripo-agent convert [--format FBX]
./bin/tripo-agent rig [--preset unity-humanoid] [--apply]
./bin/tripo-agent inspect
./bin/tripo-agent deep-check [--engine Unity]
./bin/tripo-agent package-asset [--engine Unity]
./bin/tripo-agent run ...
./bin/tripo-agent package
```

## Output Files

During a run:

```text
workspace/
  input_inventory.json
  asset_brief.json
  production_plan.json
  preflight_report.md
  generation_request.json
  production_result.json
  conversion_result.json
  rig_result.json
  readiness_report.json
  deep_readiness_report.json
  package_result.json

outputs/<asset_id>/
  downloads/
  converted/
  rigged/
  readiness_report.md
  deep_readiness_report.json
  manifest.json
  <asset_id>_Unity_package.zip
```

## Superpowers Structure

```text
tripo-game-agent-superpowers/
├── CLAUDE.md
├── commands/
│   └── tripo-agent.md
├── skills/
│   ├── using-tripo-game-agent/
│   ├── game-asset-intake/
│   ├── game-asset-view-strategy/
│   ├── game-asset-planning/
│   ├── game-asset-preflight/
│   ├── game-asset-production/
│   ├── game-asset-readiness/
│   └── game-asset-memory/
├── bin/
├── scripts/
├── content/
├── workspace/
├── outputs/
└── assets/
```

Skill order:

```text
game-asset-intake
  -> game-asset-view-strategy
  -> game-asset-planning
  -> game-asset-preflight
  -> game-asset-production
  -> game-asset-readiness
  -> game-asset-memory
```

## Current Coverage

Implemented real paths:

- API key / dependency setup.
- Input inventory and view strategy.
- P1 / H3 / H2 / Turbo / v1.4 model routing.
- Image-to-model and multiview-to-model payload paths.
- Candidate multiview image generation.
- Preflight cost and missing-input gate.
- Tripo generation polling and downloads.
- Tripo conversion API for FBX/OBJ/STL/GLTF-style export.
- Rig precheck / auto-rig command path.
- Basic GLB/FBX file inspection.
- Blender deep readiness path, skipped honestly if Blender is missing.
- Engine import checklist.
- Unity-style package zip.
- Auto-open generated images/models for user confirmation.

Still not fully automated:

- Unity Humanoid / UE Manny retarget validation inside the engine.
- Full Unity/Unreal import preset generation.
- Strong quad topology and face-budget verification.
- LOD / collider / pivot postprocessing.
- Modular fit to an existing character.
- Localized mesh edits without full regeneration.

## Interview Walkthrough

Five-minute path:

```bash
./bin/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
./bin/tripo-agent architecture
./bin/tripo-agent setup
./bin/tripo-agent run --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" --input assets/mecha.png --engine Unity
```

Then open:

```text
workspace/preflight_report.md
outputs/<asset_id>/readiness_report.md
outputs/<asset_id>/deep_readiness_report.json
outputs/<asset_id>/<asset_id>_Unity_package.zip
skills/using-tripo-game-agent/SKILL.md
```

## Package For Sharing

```bash
./bin/tripo-agent package
```

Output:

```text
dist/tripo-game-agent-superpowers.zip
```
