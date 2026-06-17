# Tripo Game Agent Superpowers

[中文说明](./README.zh-CN.md)

A local Superpowers-style agent plugin for turning game-asset goals into executable Tripo workflows.

The project follows the pattern popularized by [`obra/superpowers`](https://github.com/obra/superpowers): `CLAUDE.md` is the boot instruction, `using-tripo-game-agent` is the bootstrap skill, and the `game-asset-*` skills encode stable workflow knowledge and output contracts.

This is not a mock-only project. Real generation, format conversion, optional multiview generation, and rig precheck use Tripo APIs. If `TRIPO_API_KEY` is missing, the workflow stops at setup or preflight.

## What It Demonstrates

Game users usually describe outcomes:

```text
I need a Unity-ready mech character, quad mesh, 15k faces, with rigging.
```

They do not naturally describe the production pipeline:

```text
inventory inputs -> choose single-image or multiview route -> choose P1/H3
-> generate 3D -> convert to FBX -> rig precheck -> readiness -> package
```

This plugin shows how an agent product layer can translate a user goal into a guarded, executable game-asset workflow.

Current flow:

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
./bin/tripo-agent ask "Unity-ready mech character, quad mesh, 15k faces, rigged"
./bin/tripo-agent architecture
```

This shows the decision flow without creating a Tripo task.

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

Run the guarded workflow:

```bash
./bin/tripo-agent run \
  --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" \
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

For automated runs where you already accept the risk:

```bash
./bin/tripo-agent run \
  --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" \
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
  --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" \
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

`rig` defaults to precheck only. To spend rigging credits and apply auto-rig:

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
  --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" \
  --engine Unity

./bin/tripo-agent generate \
  --front assets/mecha_front.png \
  --back assets/mecha_back.png \
  --left assets/mecha_left.png \
  --right assets/mecha_right.png
```

If the user only has one image, ask before generating optional multiview images:

```bash
./bin/tripo-agent synthesize-views --input assets/mecha_front.png
```

Generated views are opened for confirmation. Do not proceed to 3D until the user accepts them.

## Install Into Claude Code

Install the slash command:

```bash
./bin/tripo-agent install
```

Then open Claude Code in this repository and run:

```text
/tripo-agent ask "Unreal boss character, UE Manny compatible rig"
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
./bin/tripo-agent ask "<game asset goal>"
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

- API key and dependency setup.
- Input inventory and view strategy.
- P1 / H3 / H2 / Turbo / v1.4 model routing.
- Image-to-model and multiview-to-model payload paths.
- Optional multiview image generation.
- Preflight cost and missing-input gate.
- Tripo generation polling and downloads.
- Tripo conversion API for FBX/OBJ/STL/GLTF-style export.
- Rig precheck / auto-rig command path.
- Basic GLB/FBX file inspection.
- Blender deep readiness path, skipped honestly if Blender is missing.
- Engine import checklist.
- Unity-style package zip.
- Auto-open generated images/models for user confirmation.

Not fully automated yet:

- Unity Humanoid / UE Manny retarget validation inside the engine.
- Full Unity/Unreal import preset generation.
- Strong quad topology and face-budget verification.
- LOD / collider / pivot postprocessing.
- Modular fit to an existing character.
- Localized mesh edits without full regeneration.

## Walkthrough

Five-minute path:

```bash
./bin/tripo-agent ask "Unity-ready mech character, quad mesh, 15k faces, rigged"
./bin/tripo-agent architecture
./bin/tripo-agent setup
./bin/tripo-agent run --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" --input assets/mecha.png --engine Unity
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
