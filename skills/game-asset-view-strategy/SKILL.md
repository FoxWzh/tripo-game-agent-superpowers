---
name: game-asset-view-strategy
description: Use after game-asset-intake to inventory user inputs, decide whether to use single image, user multiview, generated multiview, text-to-model, or existing model routes before model routing and planning.
---

# Game Asset View Strategy

Use this skill after intent intake and before production planning.

The product rule:

```text
User real multiview > generated multiview > single-image 3D with explicit risk
```

Do not generate multiview images automatically. Ask whether the user already has back/side views first.

## Required Command

Run:

```bash
./bin/tripo-agent inventory \
  --input assets/front.png \
  --front assets/front.png \
  --back assets/back.png \
  --left assets/left.png \
  --right assets/right.png
```

This writes:

```text
workspace/input_inventory.json
```

## Output Contract

```json
{
  "input_mode": "text_only|single_image|user_multiview|generated_multiview|existing_model|missing_input",
  "view_strategy": {
    "strategy": "use_user_multiview|ask_user_for_views_or_generate_multiview|text_to_model_or_generate_views_first|reuse_or_revise_existing_model|block_until_input_exists",
    "requires_user_decision": true
  },
  "blockers": []
}
```

## Decision Rules

- If user has `front` plus at least one of `back/left/right`, route to `multiview_to_model`.
- If user only has one image, ask:
  - Do you have more real angle references?
  - If not, do you want to spend a smaller amount first to generate multiview images?
  - Or proceed single-image with back/side/rig risks documented?
- If user has only text, offer text-to-model draft or concept/multiview preparation.
- If user has an existing 3D model, route to memory/revision/conversion/readiness instead of new image-to-model.
- If modular asset depends on a base character, require `--base-asset` before promising fit.

## Optional Candidate Multiview Generation

Only after user confirms:

```bash
./bin/tripo-agent synthesize-views --input assets/front.png
```

Open generated views for confirmation. Do not proceed to 3D until the user accepts them or provides corrections.

## Stop Condition

If inventory has blockers, stop before planning. If view strategy requires a user decision, do not select the final model route until the user chooses a path.
