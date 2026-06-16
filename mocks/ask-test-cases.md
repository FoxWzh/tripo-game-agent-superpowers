# Ask Test Cases

## 1

Input: 做个皮卡丘当桌面摆件

Expected:

- Persona: Sam
- Confidence: medium
- Ask: 是要 3D 打印、游戏里用，还是只做视觉展示？
- Likely workflow: PrintableModel if print target confirmed

## 2

Input: 我要做个 VRM 形象用 VSeeFace 跑

Expected:

- Persona: Aki
- Workflow: VRMAvatar
- Tags: vrm, humanoid rig, arkit52 blendshape
- Clarify: 是否已有多视图/正侧背参考？

## 3

Input: 给我之前那个角色加套盔甲

Expected:

- Persona: Chen
- Workflow: ModularAssetPack
- Clarify: 上次角色 asset id / 是否保持同一拓扑预算

## 4

Input: Unity 里用的机甲，quad mesh，15k 面

Expected:

- Persona: Marcus
- Workflow: GameReadyCharacter
- High confidence

## 5

Input: 随便做点啥

Expected:

- Persona: Sara / unclear intent
- No execution
- Ask outcome clarification
