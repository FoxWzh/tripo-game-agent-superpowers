# User Stories

## 1. Marcus / Game-Ready 角色资产

上传角色概念图，说“我要在 Unity 里用，带骨骼，预算 15k 面”，直接拿到 Unity-ready FBX 包：quad topology、PBR textures、humanoid rig。

Discord 证据：Quad Mode、FBX to Unity、texture export + FBX zip、perfect Rig。

映射：`GameReadyCharacter`。

## 2. Lisa / 可打印多色模型

上传手办图，说“我要 3D 打印，按颜色分件”，拿到按颜色拆好的 print-ready 文件和支撑预检报告。

Discord 证据：separated by colour for 3D printing、3D print ready models、Slicer/remesh/support。

映射：`PrintableModel`。

## 3. Aki / VRM 虚拟形象

上传多视图角色，说“我要做 VTuber，要能在 VSeeFace 跑表情”，拿到 VRM、humanoid rig、ARKit 52 blendshape。

Discord 证据：Export as VRM、ARKit 52 blendshape、MetaHuman Compatible Face、RIGGING HAIR。

映射：`VRMAvatar`。

## 4. Chen / Modular 资产包

基于之前生成的主角模型，生成盔甲、剑、披风，并保持拓扑兼容和风格一致。

Discord 证据：Modular Outfit Parts、Clothing/Armor from existing base model、Layered 3D Generation。

映射：`ModularAssetPack`。

## 5. Sam / 新手目标导向

只会说“我要做一个 Q 版小恐龙桌面摆件”，Agent 判断或追问真实用途，再选择 HD、Retopo、导出格式。

Discord 证据：How to create HD Model、task 卡住、扣 credit 但无可用产物。

映射：意图澄清 + 成本透明。

## 6. Vlad / 可对话改稿

对第一版结果说“脸再瘦一点”“手指拓扑重做”“这部分换金属材质”，Agent 只重做局部。

Discord 证据：Selectable Mesh Regeneration、Regeneration parts、3D healing brush、Texture setting remember settings。

映射：局部编辑和增量生成。

## 7. Maya / API 集成开发者

通过 API 调用 `GameReadyCharacter` 等复合 Skill，而不是自己串 6 个原子 API。

Discord 证据：API FBX output、ComfyUI Tripo Product、multi-color printable files via API。

映射：Agent API。

## 8. Sara / 意图澄清

“我想做一个小熊给我女儿”需要先问是打印玩具、游戏资产，还是视觉展示，因为工艺完全不同。

映射：主动澄清。

## 9. Tom / 成本透明

执行前看到 credit、时间、风险步骤，以及草稿/完整/跳过某步骤等档位。

映射：成本预估和分级执行。

## 10. Yui / 失败兜底

Texture 生成超时后，Agent 自动重试、降级或换路径，而不是把错误抛给用户。

映射：自愈和 fallback policy。

## 11. Rio / 上下文延续

做系列角色时，Agent 记住风格、拓扑预算、命名规范。用户说“再做一个穿红裙子的姐妹”即可延用参数。

映射：Asset Memory。
