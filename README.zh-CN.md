# Tripo Game Agent Superpowers

[English](./README.md)

一个本地 Superpowers 风格的 Agent 插件，用来把游戏资产目标转成可执行的 Tripo 工作流。

项目借鉴 [`obra/superpowers`](https://github.com/obra/superpowers) 的组织方式：`CLAUDE.md` 是启动指令，`using-tripo-game-agent` 是 bootstrap skill，多个 `game-asset-*` skill 承载稳定的流程知识和输出契约。

这不是只做 mock 的演示。真实生成、格式转换、可选多视图生成、rig precheck 都会调用 Tripo API；如果缺少 `TRIPO_API_KEY`，流程会停在 setup 或 preflight 阶段。

## 项目展示什么

游戏用户通常只会描述目标：

```text
我要一个 Unity 里用的机甲角色，quad mesh，15k 面，带骨骼。
```

他们通常不会自然描述完整生产步骤：

```text
盘点输入 -> 判断单图/多视图路线 -> 选择 P1/H3
-> 生成 3D -> 转 FBX -> rig precheck -> readiness -> package
```

这个插件展示的是 Agent 产品层如何把“用户目标”翻译成“有保护措施的可执行游戏资产工作流”。

当前流程：

```text
Intent Intake
  -> Input Inventory / View Strategy
  -> Model Routing
  -> Export Route
  -> Rig Route
  -> Production Plan
  -> Preflight / Human Confirmation
  -> Tripo Generation
  -> Conversion
  -> Rig Precheck / Auto Rig if confirmed
  -> Basic Readiness
  -> Deep Readiness
  -> Package
  -> Memory
```

## 快速开始

Clone:

```bash
git clone https://github.com/FoxWzh/tripo-game-agent-superpowers.git
cd tripo-game-agent-superpowers
```

先运行不消耗额度的本地 walkthrough：

```bash
./bin/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
./bin/tripo-agent architecture
```

这会展示 Agent 的决策流程，但不会创建 Tripo 任务。

## 配置真实 API 调用

运行：

```bash
./bin/tripo-agent setup
```

`setup` 会：

- 在缺少 `TRIPO_API_KEY` 时要求输入，并保存到 `.env.local`。
- 检查 Node / npm / curl / zip。
- 检查 Blender。Blender 是可选项，但推荐安装，用于 deep readiness。
- 如果依赖缺失，会先询问，再运行 `npm install`。

`.env.local`、`assets/`、`workspace/*.json`、`outputs/` 都已加入 gitignore。

## 本地体验

把参考图放到 `assets/`，例如：

```text
assets/mecha.png
```

运行带保护的完整流程：

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --input assets/mecha.png \
  --engine Unity
```

`run` 会执行：

```text
doctor
  -> inventory
  -> plan / model_route / export_route / rig_route
  -> preflight
  -> 消耗额度前请求确认
  -> generate
  -> convert
  -> inspect
  -> deep-check
  -> package
```

如果已经确认风险、需要录制或自动执行：

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --input assets/mecha.png \
  --engine Unity \
  --yes
```

关闭生成文件自动打开：

```bash
TRIPO_AGENT_NO_OPEN=1 ./bin/tripo-agent run ...
# 或
./bin/tripo-agent run ... --no-open
```

## 分步模式

当你想检查每一步决策时，可以分步运行：

```bash
./bin/tripo-agent inventory --input assets/mecha.png

./bin/tripo-agent plan \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --engine Unity \
  --poly-budget 15000 \
  --rig-preset unity-humanoid

./bin/tripo-agent preflight \
  --input assets/mecha.png \
  --engine Unity \
  --poly-budget 15000 \
  --rig-preset unity-humanoid

./bin/tripo-agent generate --input assets/mecha.png
./bin/tripo-agent convert
./bin/tripo-agent rig --preset unity-humanoid
./bin/tripo-agent inspect
./bin/tripo-agent deep-check --engine Unity
./bin/tripo-agent package-asset --engine Unity
```

`rig` 默认只做 precheck。如果要消耗 rigging 额度并应用 auto-rig：

```bash
./bin/tripo-agent rig --preset unity-humanoid --apply
```

## 多视图流程

如果用户已经有真实多视图图片，优先使用真实多视图：

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

如果用户只有单张图，需要先询问是否生成可选多视图：

```bash
./bin/tripo-agent synthesize-views --input assets/mecha_front.png
```

生成后的多视图会自动打开供用户确认。用户接受前，不应继续进入 3D 生成。

## 安装到 Claude Code

安装 slash command：

```bash
./bin/tripo-agent install
```

然后在这个仓库中打开 Claude Code，运行：

```text
/tripo-agent ask "Unreal 里用的 boss 角色，需要 UE Manny 兼容骨骼"
/tripo-agent architecture
/tripo-agent about
```

slash command 会委托给 `CLAUDE.md` 和 `skills/` 中定义的同一套 Superpowers 风格工作流。

## 安装到 Codex

仓库包含 Codex plugin manifest：

```text
.codex-plugin/plugin.json
```

把该仓库目录作为本地 Codex plugin 导入即可。核心 skills 位于：

```text
skills/
```

## 命令参考

```bash
./bin/tripo-agent setup
./bin/tripo-agent doctor
./bin/tripo-agent ask "<游戏资产目标>"
./bin/tripo-agent architecture
./bin/tripo-agent inventory ...
./bin/tripo-agent plan ...
./bin/tripo-agent preflight ...
./bin/tripo-agent synthesize-views ...
./bin/tripo-agent generate ...
./bin/tripo-agent convert [--format FBX]
./bin/tripo-agent rig [--preset unity-humanoid] [--apply]
./bin/tripo-agent inspect
./bin/tripo-agent deep-check [--engine Unity]
./bin/tripo-agent package-asset [--engine Unity]
./bin/tripo-agent run ...
./bin/tripo-agent package
```

## 输出文件

运行过程中会生成：

```text
workspace/
  input_inventory.json
  asset_brief.json
  production_plan.json
  preflight_report.md
  generation_request.json
  production_result.json
  conversion_result.json
  rig_result.json
  readiness_report.json
  deep_readiness_report.json
  package_result.json

outputs/<asset_id>/
  downloads/
  converted/
  rigged/
  readiness_report.md
  deep_readiness_report.json
  manifest.json
  <asset_id>_Unity_package.zip
```

## Superpowers 结构

```text
tripo-game-agent-superpowers/
├── CLAUDE.md
├── commands/
│   └── tripo-agent.md
├── skills/
│   ├── using-tripo-game-agent/
│   ├── game-asset-intake/
│   ├── game-asset-view-strategy/
│   ├── game-asset-planning/
│   ├── game-asset-preflight/
│   ├── game-asset-production/
│   ├── game-asset-readiness/
│   └── game-asset-memory/
├── bin/
├── scripts/
├── content/
├── workspace/
├── outputs/
└── assets/
```

Skill 调用顺序：

```text
game-asset-intake
  -> game-asset-view-strategy
  -> game-asset-planning
  -> game-asset-preflight
  -> game-asset-production
  -> game-asset-readiness
  -> game-asset-memory
```

## 当前覆盖

已经实现的真实路径：

- API key 和依赖检查。
- 输入盘点和视图策略。
- P1 / H3 / H2 / Turbo / v1.4 模型路由。
- 图生 3D 和多视图生 3D payload 路径。
- 可选多视图图片生成。
- 生成前的成本和缺失信息检查。
- Tripo generation polling 和文件下载。
- Tripo conversion API，支持 FBX/OBJ/STL/GLTF 风格导出。
- Rig precheck / auto-rig 命令路径。
- 基础 GLB/FBX 文件检查。
- Blender deep readiness 路径；如果缺少 Blender，会明确跳过。
- 引擎导入 checklist。
- Unity 风格 package zip。
- 自动打开生成的图片或模型，方便用户确认。

尚未完全自动化：

- Unity Humanoid / UE Manny 在引擎内的 retarget 验证。
- 完整 Unity/Unreal import preset 生成。
- 强 quad topology 和面数预算验证。
- LOD / collider / pivot 后处理。
- 和现有角色模块的拼接适配。
- 不重新生成整体模型的局部网格编辑。

## Walkthrough

五分钟路径：

```bash
./bin/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
./bin/tripo-agent architecture
./bin/tripo-agent setup
./bin/tripo-agent run --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" --input assets/mecha.png --engine Unity
```

然后查看：

```text
workspace/preflight_report.md
outputs/<asset_id>/readiness_report.md
outputs/<asset_id>/deep_readiness_report.json
outputs/<asset_id>/<asset_id>_Unity_package.zip
skills/using-tripo-game-agent/SKILL.md
```

## 打包分享

```bash
./bin/tripo-agent package
```

输出：

```text
dist/tripo-game-agent-superpowers.zip
```
