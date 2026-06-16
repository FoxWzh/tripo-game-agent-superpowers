# Architecture

## Superpowers Pattern

This plugin follows the `obra/superpowers` pattern:

```text
CLAUDE.md
  -> using-tripo-game-agent
      -> game-asset-intake
      -> game-asset-view-strategy
      -> game-asset-planning
      -> game-asset-preflight
      -> game-asset-production
      -> game-asset-readiness
      -> game-asset-memory
```

`CLAUDE.md` is the boot instruction. `using-tripo-game-agent` is the bootstrap skill that enforces method. The `game-asset-*` skills are composable business capabilities with input/output contracts.

## Why This Shape

The workflow is not split into nine tiny skills. It is split by stable knowledge domain:

- Intake: user intent, asset taxonomy, engine presets, clarification.
- View Strategy: input inventory, single-image vs user multiview vs generated multiview vs existing model.
- Planning: model routing, workflow templates, cost/time, tiers, risks, fallback policy.
- Preflight: missing inputs, high-value extra context, credit-risk gate, user confirmation.
- Production: generation and optimization execution mapping.
- Readiness: game usability checks, repairs, downgrade, package schema.
- Memory: iteration, variants, series reuse.

## Required State Machine

```text
intake
  -> view-strategy
  -> planning
  -> preflight
  -> production
  -> readiness
  -> memory
```

Control rules:

- Do not skip intake.
- Do not choose a model before input inventory and view strategy are known.
- Do not enter planning if blocking info is missing.
- Do not enter production before showing the Production Plan and Preflight Report.
- Do not create a Tripo task if preflight has blockers.
- If preflight says more input would materially improve the run, ask the user to provide it or explicitly accept the risk.
- Do not package final assets before readiness review.
- If readiness fails, repair or fallback before final package.

## Preflight Quality Gate

The expensive step is the Tripo generation call, so the agent must answer three questions before production:

- What is still missing?
- What extra input would most improve this specific call?
- Which game-readiness problems remain unsolved and need confirmation, fallback, or roadmap framing?

Typical high-value inputs:

- Character: front/back/side views, rig preset, poly budget, platform target.
- Prop/weapon: pivot, scale, grip direction, material callouts.
- Environment: modular kit vs set piece, LOD/collider need, scale reference.
- Modular part: base asset id/path, attachment region, fit requirement.

## View Strategy And Model Routing

Routing order:

```text
intent -> input inventory -> view strategy -> model route -> production plan
```

Rules:

- User real multiview beats generated candidate multiview.
- Generated candidate multiview beats single-image 3D only after user confirmation.
- Single-image 3D is allowed, but back/side/rig risks must be explicit.
- Existing models route to conversion, readiness, memory, or revision rather than new generation.

Model families:

- `P1`: default for game runtime assets and topology/low-poly-oriented routes.
- `H3`: high-fidelity / hero asset route.
- `H2`: stable 2.x baseline.
- `Turbo`: draft and fast shape exploration.
- `v1.4`: legacy compatibility only.

## Game Asset Workflow Templates

### GameReadyCharacter

```text
ImageTo3D or MultiViewTo3D
  -> Retopo(mode=quad, target=<poly_budget>)
  -> UVUnwrap
  -> PBRTexture(workflow=metal-rough, size=<texture_size>)
  -> Rig(type=<engine humanoid preset>)
  -> ReadinessReview
  -> ExportFBX(textures=zip)
```

### GameReadyProp

```text
ImageTo3D or TextTo3D
  -> Retopo(mode=tri_or_quad, target=<poly_budget>)
  -> UVUnwrap
  -> PBRTexture(size=<texture_size>)
  -> PivotScaleCheck
  -> ColliderHint
  -> ReadinessReview
  -> ExportFBX or ExportGLB
```

### ModularGameAsset

```text
LoadBaseAsset
  -> StyleLock
  -> GenerateAttachment
  -> FitToBaseMesh
  -> TextureMatch
  -> ReadinessReview
  -> ExportPack
```

## Tool Mapping

Tools are real local scripts. Tripo generation is executed through the public API adapter:

- `scripts/setup.mjs`
- `scripts/doctor.mjs`
- `scripts/tripo_client.mjs`
- `scripts/inventory_game_asset.mjs`
- `scripts/plan_game_asset.mjs`
- `scripts/synthesize_views.mjs`
- `scripts/preflight_game_asset.mjs`
- `scripts/generate_game_asset.mjs`
- `scripts/convert_model.mjs`
- `scripts/rig_model.mjs`
- `scripts/inspect_game_asset.mjs`
- `scripts/deep_readiness_check.mjs`
- `scripts/blender_inspect.py`
- `scripts/package_engine_asset.mjs`

## Current MVP Boundaries

Real today:

- API key and dependency checks.
- Input inventory and model_route generation.
- Candidate multiview image generation path.
- Multiview-to-model payload path when user/generator views exist.
- Real image-to-model task creation, polling, downloads.
- Real convert_model task for FBX/OBJ/STL/GLTF-style export when requested.
- Rig precheck / auto-rig command path with user confirmation.
- GLB/PBR file inspection and package creation.
- Blender deep readiness and engine import checklist path.
- Preflight report and user confirmation before spending credits.
- Auto-open downloaded image/model artifacts for user confirmation.

Not fully automated yet:

- Engine-side humanoid retarget validation and UE Manny compatibility.
- Full texture zip normalization and engine import presets.
- Strong quad topology and face budget verification.
- LOD/collider generation.
- Modular fit to an existing character.
- Localized edits without full regeneration.
