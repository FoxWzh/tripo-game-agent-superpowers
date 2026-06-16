---
name: game-asset-memory
description: Use when the user wants to revise an asset, regenerate a local part, create variants, or reuse style and constraints for a series of game assets.
---

# Game Asset Memory

Use this skill after a package exists, or when the user refers to a previous asset, same series, same style, or localized edits.

## Input

Previous Asset Brief, Production Plan, Readiness Report, package manifest, and new user instruction.

## Output: Asset Memory Record

```json
{
  "asset_id": "",
  "series_id": "",
  "style_lock": {},
  "engine_constraints": {},
  "naming_convention": "",
  "poly_budget": "",
  "texture_policy": "",
  "rig_policy": "",
  "fallback_history": [],
  "editable_regions": [],
  "next_variant_prompt": ""
}
```

## Iteration Types

- Local visual edit: "脸再瘦一点", "肩甲更大".
- Technical repair: "手指拓扑重做", "骨骼不对".
- Material edit: "这部分换金属材质".
- Variant: "再做一个红色版本".
- Series reuse: "再做一个同风格敌人".
- Modular expansion: "给这个角色加盔甲和披风".

## Localized Edit Policy

Prefer localized regeneration when:

- The requested change is confined to a known part.
- Existing topology and rig can be preserved.
- The cost of full regeneration is materially higher.

Require full or partial replanning when:

- The edit changes asset type.
- Engine target changes.
- Rig or topology assumptions change.
- Previous readiness issues would be amplified.

## Series Reuse Policy

Carry forward:

- Engine target.
- Format.
- Poly budget.
- Texture workflow and size.
- Naming convention.
- Style descriptors.
- Known fallback history.

Do not blindly carry forward:

- Rig type if the new body is non-humanoid.
- Pivot rule if asset type changes.
- Collider assumptions if usage changes.
