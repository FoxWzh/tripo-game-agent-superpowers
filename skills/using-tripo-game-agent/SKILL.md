---
name: using-tripo-game-agent
description: Use at the start of any Tripo Game Agent request, especially when the user wants to create, optimize, inspect, repair, package, iterate, or reuse game-ready 3D assets.
---

# Using Tripo Game Agent

You must use this bootstrap before handling game asset requests.

The goal is not to generate arbitrary 3D. The goal is to transform a user's game asset intent into an engine-ready asset workflow with transparent cost, explicit risk, readiness checks, fallback decisions, and reusable asset memory.

## Required Skill Order

Use these skills in order:

```text
1. game-asset-intake
2. game-asset-planning
3. game-asset-production
4. game-asset-readiness
5. game-asset-memory, only if the user asks for iteration, variants, or series reuse
```

## Control Rules

- Do not skip `game-asset-intake`.
- Do not enter `game-asset-planning` if the Asset Brief has blocking `missing_info`.
- Do not enter `game-asset-production` before the user can see the Production Plan.
- Do not package final assets before `game-asset-readiness`.
- If readiness fails, run repair or fallback before final packaging.
- All generation, optimization, inspection, repair, export, and package steps in this portfolio demo must be marked `[MOCK]`.

## Workflow State

Track the workflow state in every substantial response:

```json
{
  "stage": "intake|planning|production|readiness|memory",
  "asset_brief": null,
  "production_plan": null,
  "production_result": null,
  "readiness_report": null,
  "asset_memory": null
}
```

## Standard Demo Path

For `/tripo-agent demo game-character`, use this path:

```text
intake:
  User wants a mecha character for Unity.
planning:
  GameReadyCharacter plan, 15k faces, Unity humanoid, PBR 2K, FBX.
production:
  [MOCK] ImageTo3D -> Retopo -> UV -> PBRTexture -> Rig.
readiness:
  [MOCK] Check polycount, UV, texture maps, humanoid rig, scale, pivot, Unity import.
fallback:
  [MOCK] Texture timeout -> retry -> downgrade 4K to 2K PBR.
package:
  [MOCK] FBX zip with textures, rig mapping, import guide, readiness report.
memory:
  Save style, engine, poly budget, naming, fallback notes for future series assets.
```

## Interview Explanation

If asked why this uses Superpowers:

> This design borrows the Superpowers pattern: a bootstrap skill enforces method, while each business skill owns a stable knowledge domain and output contract. The LLM handles interpretation and judgment; the workflow protocol prevents the agent from jumping straight into black-box generation.
