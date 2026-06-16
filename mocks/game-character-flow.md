# Mock Flow: Game Character

Scenario: Marcus has a mecha concept image and wants a Unity-ready character.

## Intent Parse

```json
{
  "persona": "Marcus / indie game artist",
  "downstream_target": "Unity",
  "workflow": "GameReadyCharacter",
  "tags": {
    "topology": "quad",
    "poly_budget": "15k",
    "format": "fbx",
    "texture": "pbr-metal-rough",
    "rig": "humanoid"
  },
  "confidence": 0.86
}
```

## Cost Estimate

Full path: 34 credits / 8-12 minutes.

- ImageTo3D: 6 credits
- Retopo: 10 credits
- UV + PBRTexture: 9 credits
- Rig: 7 credits
- Export packaging: 2 credits

## Execution Log

```text
[MOCK] ImageTo3D completed. Cost 6 credits.
[MOCK] Retopo(mode=quad,target=15k) completed. Cost 10 credits.
[MOCK] Segment completed. Cost included.
[MOCK] UVUnwrap completed.
[MOCK] PBRTexture timed out after 90s. Agent decision: retry once.
[MOCK] PBRTexture retry exceeded risk threshold. Agent decision: downgrade texture resolution from 4K to 2K PBR.
[MOCK] Rig(type=humanoid) completed. Cost 7 credits.
[MOCK] ExportFBX(textures=zip) completed. Cost 2 credits.
```

## Output

```text
mecha_marcus_unity_fbx.zip
├── mecha_marcus.fbx
├── textures/
│   ├── basecolor_2k.png
│   ├── normal_2k.png
│   ├── metallic_roughness_2k.png
│   └── ao_2k.png
├── rig/
│   └── humanoid_mapping.json
└── report/
    ├── cost_breakdown.md
    ├── import_unity.md
    └── fallback_log.md
```
