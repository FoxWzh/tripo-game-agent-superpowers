---
name: game-asset-preflight
description: Use after game-asset-planning and before real Tripo generation to identify missing inputs, judge whether the next 3D call is worth spending credits on, and ask for high-value game-asset context.
---

# Game Asset Preflight

Use this skill after Production Plan and before `game-asset-production`.

The goal is to prevent expensive low-quality Tripo calls. This is the human loop checkpoint: tell the user what is missing, what extra input would improve this specific generation, and what game-readiness risks remain.

## Required Command

Run:

```bash
./bin/tripo-agent preflight --input assets/<reference>.png --engine Unity
```

For characters or modular assets, pass any available optional context:

```bash
./bin/tripo-agent preflight \
  --input assets/char_front.png \
  --front assets/char_front.png \
  --back assets/char_back.png \
  --left assets/char_left.png \
  --right assets/char_right.png \
  --rig-preset unity-humanoid \
  --poly-budget 15000 \
  --tier Full
```

This writes:

```text
workspace/preflight_report.json
workspace/preflight_report.md
```

## Output Contract

Always answer:

```json
{
  "recommendation": "block|ask_user|proceed",
  "blockers": [],
  "improvements": [],
  "credit_risks": [],
  "continue_requires_user_confirmation": true
}
```

## Game-Specific Missing Inputs

Block generation when:

- No reference image or supported input URL exists.
- The reference image path is missing.
- The target game engine is unknown.
- A modular asset request lacks a base asset and promises fit/attachment.

Ask before generation when:

- Character has only one view and user expects rig, face, hands, back details, or consistent outfit.
- Rig target is unclear: Unity Humanoid, UE Manny, custom skeleton, or no rig.
- Poly budget is unclear and the user cares about runtime performance.
- Asset needs exact scale, pivot, socket, collider, or LOD behavior.
- The requested output is FBX but current Tripo result path may only return GLB until conversion is added.

Proceed when:

- User provided enough input for the selected tier, or explicitly accepts the risk/cost tradeoff.

## High-Value Inputs Before Spending Credits

For characters:

- Front/back/side views.
- A pose with separated arms and visible hands.
- Rig target and animation expectation.
- Poly budget and platform target.
- Whether face fidelity or body topology is more important.

For props/weapons:

- Intended size and pivot.
- In-hand orientation for weapons.
- Material callouts: metal, glass, wood, emissive.
- Whether collider hints are needed.

For environments:

- Modular kit vs single set piece.
- LOD and collider needs.
- Scale reference.
- Texture tiling constraints.

For modular parts:

- Base asset path or asset id.
- Attachment region.
- Fit requirement: visual-only, socket-compatible, or topology-compatible.
- Style lock descriptors from previous asset.

## Decision Rule

If preflight says `block`, stop before production.

If preflight says `ask_user`, summarize the risk and ask for either:

1. Missing input, or
2. Explicit approval to spend credits with degraded expectations.

If preflight says `proceed`, still show the Production Plan and ask for confirmation before creating a real Tripo task unless the user passed `--yes`.
