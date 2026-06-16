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
2. game-asset-view-strategy
3. game-asset-planning
4. game-asset-preflight
5. game-asset-production
6. game-asset-readiness
7. game-asset-memory, only if the user asks for iteration, variants, or series reuse
```

## Control Rules

- Do not skip `game-asset-intake`.
- Do not choose a Tripo model before input inventory and view strategy are known.
- Do not enter `game-asset-planning` if the Asset Brief has blocking `missing_info`.
- Do not enter `game-asset-production` before the user can see the Production Plan and Preflight Report.
- Do not create a Tripo task if preflight has blockers.
- If preflight has high-value missing inputs, ask the user to provide them or explicitly accept the risk before spending credits.
- Do not package final assets before `game-asset-readiness`.
- If readiness fails, run repair or fallback before final packaging.
- Do not mock generation. If the user wants real generation, verify `TRIPO_API_KEY` and dependencies first.
- If setup is incomplete, run or instruct the user to run `./bin/tripo-agent setup`.
- Do not claim success unless output files exist under `outputs/<asset_id>/`.

## Workflow State

Track the workflow state in every substantial response:

```json
{
  "stage": "intake|planning|production|readiness|memory",
  "asset_brief": null,
  "input_inventory": null,
  "production_plan": null,
  "preflight_report": null,
  "production_result": null,
  "readiness_report": null,
  "asset_memory": null
}
```

## Standard Demo Path

For real generation, use this path:

```text
intake:
  Write workspace/asset_brief.json.
view-strategy:
  Run ./bin/tripo-agent inventory and decide single-image/user-multiview/generated-multiview/text/existing-model route.
planning:
  Write workspace/production_plan.json, including model_route.
preflight:
  Run ./bin/tripo-agent preflight --input assets/<reference>.png.
production:
  Run ./bin/tripo-agent generate --input assets/<reference>.png
readiness:
  Run ./bin/tripo-agent inspect
package:
  Run ./bin/tripo-agent package-asset --engine unity
memory:
  Save style, engine, poly budget, naming, Tripo task id, and readiness notes.
```

## Interview Explanation

If asked why this uses Superpowers:

> This design borrows the Superpowers pattern: a bootstrap skill enforces method, while each business skill owns a stable knowledge domain and output contract. The LLM handles interpretation and judgment; the workflow protocol prevents the agent from jumping straight into black-box generation.

If asked why preflight exists:

> 3D generation calls are expensive relative to text reasoning. Preflight is the product layer that decides whether this exact call has enough input quality to be worth spending credits, and what the user can add to improve success probability.

If asked why view strategy exists:

> Model routing depends on what material the user already has. The agent should ask for real views before generating candidate views, and should not choose image-to-model or multiview-to-model until the input inventory is known.
