# Tripo Game Agent Superpowers

FOX 应聘 Tripo Agent Product Manager 的游戏资产方向面试作品。

这个项目借鉴 [`obra/superpowers`](https://github.com/obra/superpowers) 的思想：不是把所有逻辑塞进一个大 prompt，而是用一个 bootstrap skill 强制方法论，再用多个可组合 skill 承载稳定的业务知识和输出契约。

## 这是什么

这是一个本地可安装的 Tripo Game Asset Agent。

它会真实调用 Tripo API 生成游戏资产，同时保留 Superpowers 风格的流程控制。它展示的是：

- 用户如何表达游戏资产目标
- Agent 如何盘点用户已有素材并决定单图/多视图/候选多视图路线
- Agent 如何补齐 Unity / Unreal / Roblox / Godot 约束
- Agent 如何根据目标和素材选择 P1/H3/H2/Turbo/v1.4 等模型路线
- Agent 如何生成制作方案、成本和风险
- Agent 如何在花 credit 前判断还缺什么、补什么最值
- Agent 如何真实调用 Tripo 生成、下载模型、检查、打包
- Agent 如何用 Tripo conversion API 转成 FBX/OBJ/STL 等引擎需要的格式
- Agent 如何在生成图片或 3D 后自动打开文件让用户确认
- Agent 如何把资产记忆保存为后续改稿和系列复用基础

不允许 mock 生成。没有 `TRIPO_API_KEY` 时不能运行真实生成。

## 快速体验

```bash
git clone https://github.com/FoxWzh/tripo-game-agent-superpowers.git
cd tripo-game-agent-superpowers

./bin/tripo-agent setup
./bin/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
```

## 真实生成

先配置 API key 和依赖：

```bash
./bin/tripo-agent setup
```

`setup` 会：

- 检查 `TRIPO_API_KEY`
- 如果缺失，要求用户输入并保存到 `.env.local`
- 检查 Node / npm / curl / zip / Blender
- 如果 Node 依赖缺失，在确认后执行 `npm install`

把参考图放到 `assets/` 后运行：

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --input assets/mecha.png \
  --engine Unity
```

执行结果会写到：

```text
workspace/
outputs/<asset_id>/
```

也可以分步执行：

```bash
./bin/tripo-agent inventory --input assets/mecha.png
./bin/tripo-agent plan --prompt "Unity 里用的机甲角色，quad mesh，15k 面" --engine Unity
./bin/tripo-agent preflight --input assets/mecha.png --engine Unity --poly-budget 15000 --rig-preset unity-humanoid
./bin/tripo-agent generate --input assets/mecha.png
./bin/tripo-agent convert --format FBX
./bin/tripo-agent rig --preset unity-humanoid
./bin/tripo-agent inspect
./bin/tripo-agent deep-check --engine Unity
./bin/tripo-agent package-asset --engine unity
```

如果你有真实多视图：

```bash
./bin/tripo-agent inventory \
  --front assets/mecha_front.png \
  --back assets/mecha_back.png \
  --left assets/mecha_left.png \
  --right assets/mecha_right.png

./bin/tripo-agent plan \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --engine Unity

./bin/tripo-agent generate \
  --front assets/mecha_front.png \
  --back assets/mecha_back.png \
  --left assets/mecha_left.png \
  --right assets/mecha_right.png
```

如果只有一张图，但用户确认愿意先生成候选多视图：

```bash
./bin/tripo-agent synthesize-views --input assets/mecha_front.png
```

生成的图片会自动打开，用户确认后再进入 3D。

`run` 会在创建 Tripo task 前停下来要求确认。确认前可以查看：

```text
workspace/production_plan.json
workspace/preflight_report.md
```

如果你已经确认风险并想录屏时跳过交互，可以加 `--yes`。
如果不想自动打开生成文件，可以加 `--no-open`，或设置 `TRIPO_AGENT_NO_OPEN=1`。

## 安装到 Claude Code

```bash
./bin/tripo-agent install
```

然后在 Claude Code 中运行：

```text
/tripo-agent ask "Unreal 里用的 boss 角色，需要 UE Manny 兼容骨骼"
/tripo-agent ask "给上次那个角色加一套同风格盔甲和一把剑"
/tripo-agent architecture
/tripo-agent about
```

## 安装到 Codex

这个目录包含 Codex plugin manifest：

```text
.codex-plugin/plugin.json
```

可以把整个仓库作为本地 plugin 导入。核心 skill 在：

```text
skills/
```

## Superpowers 结构

```text
tripo-game-agent-superpowers/
├── CLAUDE.md
├── commands/
│   └── tripo-agent.md
├── skills/
│   ├── using-tripo-game-agent/
│   │   └── SKILL.md
│   ├── game-asset-intake/
│   │   └── SKILL.md
│   ├── game-asset-view-strategy/
│   │   └── SKILL.md
│   ├── game-asset-planning/
│   │   └── SKILL.md
│   ├── game-asset-preflight/
│   │   └── SKILL.md
│   ├── game-asset-production/
│   │   └── SKILL.md
│   ├── game-asset-readiness/
│   │   └── SKILL.md
│   └── game-asset-memory/
│       └── SKILL.md
├── bin/
│   ├── tripo-agent
│   └── tripo-agent.sh
├── scripts/
├── workspace/
├── outputs/
├── assets/
└── content/
```

## Skill 分工

### `using-tripo-game-agent`

Bootstrap skill。强制 Agent 按流程工作：

```text
game-asset-intake
  -> game-asset-view-strategy
  -> game-asset-planning
  -> game-asset-preflight
  -> game-asset-production
  -> game-asset-readiness
  -> game-asset-memory
```

它规定不能跳过 view strategy、planning 和 preflight，不能在 readiness 之前打包，且禁止 mock 生成。

### `game-asset-intake`

负责理解需求和补齐约束：

- asset type taxonomy
- Unity / Unreal / Roblox / Godot presets
- clarification policy
- Asset Brief 输出契约

### `game-asset-view-strategy`

负责素材盘点和视角策略：

- text only / single image / user multiview / generated multiview / existing model
- 优先使用用户真实多视图
- 没有多视图时，先问用户是否已有更多角度图
- 用户确认后才调用候选多视图生成

### `game-asset-planning`

负责把 Asset Brief 变成 Production Plan：

- workflow template
- model routing: P1 / H3 / H2 / Turbo / v1.4
- export route: preferred format, fallback format, conversion reason
- rig route: pre-rig check, rig preset, auto-rig confirmation
- cost/time estimate
- execution tiers
- risk points
- fallback policy

### `game-asset-preflight`

负责生成前质量门和 human loop：

- 当前还缺什么
- 补什么输入最能提高这次 Tripo 调用质量
- 哪些风险会浪费 credit
- 是否应该 block / ask_user / proceed

### `game-asset-production`

负责生成和优化阶段的真实系统映射：

- ImageTo3D / TextTo3D / MultiViewTo3D
- Retopo
- UV
- PBR
- Rig
- LOD
- pivot / scale / collider prep

### `game-asset-readiness`

负责游戏可用性验收、修复、降级和打包：

- polycount
- UV overlap
- texture completeness
- rig mapping
- scale
- pivot
- import smoke test
- package schema

## 当前游戏问题覆盖边界

已经真实闭环：

- API key/依赖检查
- image-to-model 真实调用
- multiview input inventory 和 model_route 产物
- generate_multiview_image 候选多视图生成
- multiview_to_model 路线支持
- Tripo task 轮询和下载
- Tripo conversion API 转 FBX/OBJ/STL/GLTF 等格式
- rig precheck / auto-rig 命令入口
- Blender deep readiness / engine import checklist
- GLB/PBR 结果基础检查
- Unity package zip
- 生成前 preflight 和确认门
- 生成图片或 3D 后自动打开产物供用户确认

已纳入流程但未完全自动化：

- Unity Humanoid / UE Manny 的引擎内 retarget 验证
- 贴图 zip 结构和完整 Unity/Unreal import preset
- quad 拓扑和 face budget 的强验证
- LOD/collider 自动生成
- weapon grip pivot / socket 精确验证
- modular asset 与 base character 的真实 fit
- 局部改稿而非整模重生成

### `game-asset-memory`

负责继续改稿和系列复用：

- style lock
- asset versioning
- naming convention
- editable regions
- fallback history

## 面试官 5 分钟路径

1. 跑 `./bin/tripo-agent setup`，配置 API key 和依赖。
2. 跑 `./bin/tripo-agent plan ...` 和 `./bin/tripo-agent preflight ...`，展示生成前如何保护 credit。
3. 跑 `./bin/tripo-agent run --prompt "Unity 里用的机甲角色，quad mesh，15k 面" --input assets/mecha.png --engine Unity`，真实生成。
4. 看 `outputs/<asset_id>/readiness_report.md`，理解为什么“生成模型”不等于“游戏可用资产”。
5. 看 `skills/using-tripo-game-agent/SKILL.md`，理解为什么这是 Superpowers 风格。

## 分发打包

```bash
./bin/tripo-agent package
```

输出：

```text
dist/tripo-game-agent-superpowers.zip
```

## 录屏建议

1. 开场 10 秒：说明这是 Tripo 游戏资产 Agent 的 Superpowers 实执行版本。
2. 40 秒：跑 `setup` 和 `doctor`，展示 API key/依赖检查。
3. 60 秒：跑 `run`，展示 Tripo task 创建、轮询、下载。
4. 30 秒：打开 readiness report 和 package zip。
5. 20 秒：打开 `using-tripo-game-agent`，说明流程控制。
