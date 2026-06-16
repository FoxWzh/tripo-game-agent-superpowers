# Architecture

## Superpowers Pattern

This plugin follows the `obra/superpowers` pattern:

```text
CLAUDE.md
  -> using-tripo-game-agent
      -> game-asset-intake
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
- Planning: workflow templates, cost/time, tiers, risks, fallback policy.
- Preflight: missing inputs, high-value extra context, credit-risk gate, user confirmation.
- Production: generation and optimization execution mapping.
- Readiness: game usability checks, repairs, downgrade, package schema.
- Memory: iteration, variants, series reuse.

## Required State Machine

```text
intake
  -> planning
  -> preflight
  -> production
  -> readiness
  -> memory
```

Control rules:

- Do not skip intake.
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
- `scripts/plan_game_asset.mjs`
- `scripts/preflight_game_asset.mjs`
- `scripts/generate_game_asset.mjs`
- `scripts/inspect_game_asset.mjs`
- `scripts/package_engine_asset.mjs`

## Current MVP Boundaries

Real today:

- API key and dependency checks.
- Real image-to-model task creation, polling, downloads.
- GLB/PBR file inspection and package creation.
- Preflight report and user confirmation before spending credits.

Not fully automated yet:

- Humanoid rig validation and UE Manny compatibility.
- FBX conversion and texture zip normalization.
- Strong quad topology and face budget verification.
- LOD/collider generation.
- Modular fit to an existing character.
- Localized edits without full regeneration.
