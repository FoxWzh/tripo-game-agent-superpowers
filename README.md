# Tripo Game Agent Superpowers

[中文说明](./README.zh-CN.md)

A local Superpowers-style agent plugin for turning game-asset goals into protected, engine-ready Tripo workflows.

The project follows the pattern popularized by [`obra/superpowers`](https://github.com/obra/superpowers): `CLAUDE.md` is the boot instruction, `commands/tripo-agent.md` is the slash-command entry, `using-tripo-game-agent` is the bootstrap skill, and the `game-asset-*` skills encode stable workflow knowledge.

The product focus is the agent workflow inside Claude Code or Codex: natural-language intake, cost-aware preflight, readiness checks, fallback decisions, and reusable asset memory. The CLI is the deterministic execution layer the agent calls.

Real generation, format conversion, optional multiview generation, and rig precheck use Tripo APIs. If `TRIPO_API_KEY` is missing, the workflow stops at setup or preflight.

## Quick Start

```bash
git clone https://github.com/FoxWzh/tripo-game-agent-superpowers.git
cd tripo-game-agent-superpowers
./bin/tripo-agent setup
```

`setup` asks for `TRIPO_API_KEY` when missing, checks local dependencies, and installs missing npm packages. The key is stored locally in `.env.local`, which is gitignored; do not commit it. For automation, pass the key through the environment and auto-accept dependency installation:

```bash
TRIPO_API_KEY=tsk_... TRIPO_AGENT_YES=1 ./bin/tripo-agent setup
```

## Use As An Agent Plugin

Use this path when you want Claude Code or Codex to guide the workflow through skills instead of calling individual CLI commands yourself.

### Claude Code

Install the Claude Code plugin from the GitHub marketplace manifest:

```bash
claude plugin marketplace add FoxWzh/tripo-game-agent-superpowers
claude plugin install tripo-game-agent-superpowers@tripo-game-agent-superpowers
```

Then open Claude Code and check `/plugin`. The installed command is namespaced by plugin:

```text
/tripo-game-agent-superpowers:tripo-agent ask "Unity-ready mech character, quad mesh, 15k faces, rigged"
/tripo-game-agent-superpowers:tripo-agent architecture
/tripo-game-agent-superpowers:tripo-agent about
```

For local development without installing from the marketplace, run Claude Code with this repo as a plugin directory:

```bash
claude --plugin-dir .
```

In that mode the command is available directly:

```text
/tripo-agent ask "Unity-ready mech character, quad mesh, 15k faces, rigged"
```

The plugin delegates to the local Superpowers-style files:

```text
.claude-plugin/plugin.json
CLAUDE.md
commands/tripo-agent.md
skills/using-tripo-game-agent/SKILL.md
skills/game-asset-*/SKILL.md
```

For real generation, put reference files under `assets/` and ask the agent to run the guarded workflow:

```text
/tripo-game-agent-superpowers:tripo-agent run --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" --input assets/mecha.png --engine Unity
```

The agent should run intake, input inventory, planning, preflight, user approval, production, readiness review, packaging, and memory capture in order.

If your Claude Code version does not support plugins, install the legacy slash command instead:

```bash
./bin/tripo-agent install-legacy-command
```

### Codex

This repo includes a Codex plugin manifest:

```text
.codex-plugin/plugin.json
```

Import this repository directory as a local Codex plugin. The plugin points Codex at:

```text
skills/
```

After importing, ask Codex for the Tripo game-asset workflow, for example:

```text
Use the Tripo Game Agent workflow to plan a Unity-ready mech character from assets/mecha.png.
```

For real API calls, run `./bin/tripo-agent setup` first so the local `.env.local` and dependencies are ready.

## Use The CLI

Use this path when you want deterministic commands, local files, and explicit checkpoints. It is also the execution layer used by the agent plugin.

`./bin/tripo-agent` is a portable shell launcher that delegates to `bin/tripo-agent.sh`; it does not require a platform-specific binary.

### No-Credit Preview

```bash
./bin/tripo-agent ask "Unity-ready mech character, quad mesh, 15k faces, rigged"
./bin/tripo-agent architecture
```

This shows the decision flow without creating a Tripo task.
It writes `workspace/preview_report.md` and `workspace/preview_report.json` with missing inputs, high-value inputs, route recommendation, credit estimate, and next step.

### Full Guarded Run

Put a reference image under `assets/`:

```text
assets/mecha.png
```

Run:

```bash
./bin/tripo-agent run \
  --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" \
  --input assets/mecha.png \
  --engine Unity
```

`run` defaults to the `Standard` tier:

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
  -> package + memory capture
```

Tiers are explicit:

- `--tier Draft`: generate and inspect only.
- `--tier Standard`: inventory, plan, preflight, generate, convert, inspect, deep-check, package, and memory capture.
- `--tier Full`: Standard plus character rig precheck. Paid auto-rig still requires `rig --apply` after user confirmation.

For automated runs where preflight can proceed and you already accept generation:

```bash
./bin/tripo-agent run \
  --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" \
  --input assets/mecha.png \
  --engine Unity \
  --yes
```

If preflight returns high-value missing inputs, `run --yes` still stops. Continue only after adding the requested inputs or after explicit user approval:

```bash
./bin/tripo-agent run ... --yes --accept-risk
```

Disable auto-opening generated files:

```bash
TRIPO_AGENT_NO_OPEN=1 ./bin/tripo-agent run ...
# or
./bin/tripo-agent run ... --no-open
```

### Step-By-Step Run

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
./bin/tripo-agent convert --format FBX
./bin/tripo-agent rig --preset unity-humanoid
./bin/tripo-agent inspect
./bin/tripo-agent deep-check --engine Unity
./bin/tripo-agent package-asset --engine Unity
```

`run --tier Full` performs character rig precheck only. The standalone `rig` command also defaults to precheck only. To spend rigging credits and apply auto-rig:

```bash
./bin/tripo-agent rig --preset unity-humanoid --apply
```

### Multiview Run

If you already have real multiview images, prefer them:

```bash
./bin/tripo-agent run \
  --prompt "Unity-ready mech character, quad mesh, 15k faces, rigged" \
  --front assets/mecha_front.png \
  --back assets/mecha_back.png \
  --left assets/mecha_left.png \
  --right assets/mecha_right.png \
  --engine Unity
```

If you only have one image, generate optional multiview images only after user confirmation:

```bash
./bin/tripo-agent synthesize-views --input assets/mecha_front.png
```

Generated views are opened for confirmation. Do not proceed to 3D until the user accepts them.

Text-to-model is supported as a real Tripo route when the user only has a prompt, but it is treated as higher risk for game assets. Preflight will ask for explicit approval or better reference inputs before spending credits.

## Command Reference

| Command | Purpose |
| --- | --- |
| `setup` | Configure API key, check dependencies, install npm packages after confirmation. |
| `doctor` | Check local runtime prerequisites. |
| `install` | Install the Claude Code plugin through the marketplace manifest. |
| `install-legacy-command` | Install only the legacy `/tripo-agent` slash command; it will not appear in the plugin list. |
| `ask "<goal>"` | Generate a no-credit agent preview: missing inputs, route, credit estimate, risks, and next step. |
| `architecture` | Explain the Superpowers-style skill architecture. |
| `inventory ...` | Inspect available single-image, multiview, text, or existing-model inputs. |
| `plan ...` | Create asset brief, model route, export route, rig route, and production plan. |
| `preflight ...` | Report missing inputs, cost risk, and user-confirmation gates. |
| `synthesize-views ...` | Generate optional multiview images for confirmation. |
| `generate ...` | Create a Tripo 3D generation task and download outputs. |
| `convert [--format FBX]` | Convert generated model through the Tripo conversion API. |
| `rig [--preset unity-humanoid] [--apply]` | Run rig precheck; apply auto-rig only with explicit confirmation. |
| `inspect` | Run basic local file readiness checks. |
| `deep-check [--engine Unity]` | Run deeper Blender-based readiness checks when Blender is available. |
| `package-asset [--engine Unity]` | Package the generated asset for engine import. |
| `memory [list|show <asset_id>]` | List or inspect reusable asset memory records for variants and series assets. |
| `run ...` | Run the guarded end-to-end workflow. |
| `package` | Create `dist/tripo-game-agent-superpowers.zip` for sharing. |

Run `./bin/tripo-agent --help` for the exact argument forms.

## Output Files

```text
workspace/
  input_inventory.json
  preview_report.json
  preview_report.md
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
  asset_memory/
    index.json
    <asset_id>.json

outputs/<asset_id>/
  downloads/
  converted/
  rigged/
  readiness_report.md
  deep_readiness_report.json
  manifest.json
  <asset_id>_Unity_package.zip
```

`.env.local`, `assets/`, generated `workspace/*.json` / `workspace/*.md`, asset memory records, and `outputs/` are gitignored.

## What The Agent Workflow Covers

Implemented real paths:

- API key and dependency setup.
- Input inventory and view strategy.
- P1 / H3 / H2 / Turbo / v1.4 model routing.
- Image-to-model, multiview-to-model, and text-to-model payload paths.
- Optional multiview image generation.
- Preflight cost and missing-input gate.
- Tripo generation polling and downloads.
- Tripo conversion API for FBX/OBJ/STL/GLTF-style export.
- Rig precheck in guarded runs, plus an explicit auto-rig command path.
- Basic GLB/FBX file inspection.
- Blender deep readiness path, skipped honestly if Blender is missing.
- Engine import checklist.
- Unity-style package zip.
- Auto-open generated images/models for user confirmation.
- Persistent asset memory for same-style variants and series reuse.

Not fully automated yet:

- Unity Humanoid / UE Manny retarget validation inside the engine.
- Full Unity/Unreal import preset generation.
- Strong quad topology and face-budget verification.
- LOD / collider / pivot postprocessing.
- Modular fit to an existing character.
- Localized mesh edits without full regeneration.

## Repository Structure

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
├── workspace/
├── outputs/
└── assets/
```
