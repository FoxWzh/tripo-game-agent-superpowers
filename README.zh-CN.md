# Tripo Game Agent Superpowers

[English](./README.md)

一个本地 Superpowers 风格的 Agent 插件，用来把游戏资产目标转成有保护措施、面向引擎可用性的 Tripo 工作流。

项目借鉴 [`obra/superpowers`](https://github.com/obra/superpowers) 的组织方式：`CLAUDE.md` 是启动指令，`commands/tripo-agent.md` 是 slash command 入口，`using-tripo-game-agent` 是 bootstrap skill，多个 `game-asset-*` skill 承载稳定的工作流知识。

产品重点是 Claude Code 或 Codex 里的 agent workflow：自然语言 intake、费用感知 preflight、可用性检查、降级决策和可复用 asset memory。CLI 是 agent 调用的确定性执行层。

真实生成、格式转换、可选多视图生成、rig precheck 都会调用 Tripo API；如果缺少 `TRIPO_API_KEY`，流程会停在 setup 或 preflight 阶段。

## 快速开始

```bash
git clone https://github.com/FoxWzh/tripo-game-agent-superpowers.git
cd tripo-game-agent-superpowers
./bin/tripo-agent setup
```

`setup` 会在缺少 `TRIPO_API_KEY` 时要求输入，检查本地依赖，并安装缺失的 npm 依赖。Key 会保存在本地 `.env.local`，该文件已 gitignore；不要提交它。自动化场景可以通过环境变量传入 key，并自动确认依赖安装：

```bash
TRIPO_API_KEY=tsk_... TRIPO_AGENT_YES=1 ./bin/tripo-agent setup
```

## 作为 Agent 插件使用

当你希望 Claude Code 或 Codex 通过 skills 引导工作流，而不是自己逐条调用 CLI 命令时，用这一部分。

### Claude Code

从 GitHub marketplace manifest 安装 Claude Code plugin：

```bash
claude plugin marketplace add FoxWzh/tripo-game-agent-superpowers
claude plugin install tripo-game-agent-superpowers@tripo-game-agent-superpowers
```

然后打开 Claude Code，用 `/plugin` 检查插件是否已安装。安装后的命令会带 plugin namespace：

```text
/tripo-game-agent-superpowers:tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
/tripo-game-agent-superpowers:tripo-agent architecture
/tripo-game-agent-superpowers:tripo-agent about
```

如果是本地开发，不想从 marketplace 安装，可以从仓库根目录直接加载 plugin：

```bash
claude --plugin-dir .
```

这种模式下可以直接使用：

```text
/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
```

插件会委托给本地 Superpowers 风格文件：

```text
.claude-plugin/plugin.json
CLAUDE.md
commands/tripo-agent.md
skills/using-tripo-game-agent/SKILL.md
skills/game-asset-*/SKILL.md
```

如果要真实生成，把参考文件放到 `assets/`，然后让 agent 运行带保护的工作流：

```text
/tripo-game-agent-superpowers:tripo-agent run --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" --input assets/mecha.png --engine Unity
```

Agent 应按顺序执行意图理解、输入盘点、方案规划、preflight、用户确认、生产、可用性检查、打包和 memory 记录。

如果你的 Claude Code 版本不支持 plugins，可以安装 legacy slash command：

```bash
./bin/tripo-agent install-legacy-command
```

### Codex

仓库包含 Codex plugin manifest：

```text
.codex-plugin/plugin.json
```

把这个仓库目录作为本地 Codex plugin 导入。插件会指向：

```text
skills/
```

导入后可以这样让 Codex 使用 Tripo 游戏资产工作流：

```text
Use the Tripo Game Agent workflow to plan a Unity-ready mech character from assets/mecha.png.
```

如果要真实调用 API，先运行 `./bin/tripo-agent setup`，确保本地 `.env.local` 和依赖已准备好。

## 使用 CLI

当你需要确定性的命令、本地文件和明确检查点时，用这一部分。它也是 agent plugin 调用的执行层。

`./bin/tripo-agent` 是 portable shell launcher，会委托给 `bin/tripo-agent.sh`；不再依赖平台相关二进制文件。

### 不消耗额度的预览

```bash
./bin/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
./bin/tripo-agent architecture
```

这会展示决策流程，但不会创建 Tripo 任务。
它会写入 `workspace/preview_report.md` 和 `workspace/preview_report.json`，包含缺失输入、高价值补充输入、推荐路线、credit 估算和下一步。

### 完整保护流程

把参考图放到 `assets/`：

```text
assets/mecha.png
```

运行：

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --input assets/mecha.png \
  --engine Unity
```

`run` 默认使用 `Standard` 档位：

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
  -> package + memory capture
```

档位是显式的：

- `--tier Draft`：只生成并 inspect。
- `--tier Standard`：inventory、plan、preflight、generate、convert、inspect、deep-check、package 和 memory capture。
- `--tier Full`：在 Standard 基础上，对角色执行 rig precheck。真正消耗 rigging credit 的 auto-rig 仍需要用户确认后单独执行 `rig --apply`。

如果 preflight 可以继续，并且已经接受生成，需要自动执行：

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --input assets/mecha.png \
  --engine Unity \
  --yes
```

如果 preflight 发现高价值缺失输入，`run --yes` 仍会停住。只有补齐输入，或用户明确接受风险后，才继续：

```bash
./bin/tripo-agent run ... --yes --accept-risk
```

关闭生成文件自动打开：

```bash
TRIPO_AGENT_NO_OPEN=1 ./bin/tripo-agent run ...
# 或
./bin/tripo-agent run ... --no-open
```

### 分步运行

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
./bin/tripo-agent convert --format FBX
./bin/tripo-agent rig --preset unity-humanoid
./bin/tripo-agent inspect
./bin/tripo-agent deep-check --engine Unity
./bin/tripo-agent package-asset --engine Unity
```

`run --tier Full` 对角色只做 rig precheck。`rig` 命令默认也只做 precheck。如果要消耗 rigging 额度并应用 auto-rig：

```bash
./bin/tripo-agent rig --preset unity-humanoid --apply
```

### 多视图运行

如果已经有真实多视图图片，优先使用真实多视图：

```bash
./bin/tripo-agent run \
  --prompt "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼" \
  --front assets/mecha_front.png \
  --back assets/mecha_back.png \
  --left assets/mecha_left.png \
  --right assets/mecha_right.png \
  --engine Unity
```

如果只有单张图，必须在用户确认后再生成可选多视图：

```bash
./bin/tripo-agent synthesize-views --input assets/mecha_front.png
```

生成后的多视图会自动打开供用户确认。用户接受前，不应继续进入 3D 生成。

纯文本生成也是真实 Tripo 路线，但对游戏资产风险更高。preflight 会要求用户明确接受风险，或补充更好的参考图/多视图后再消耗 credit。

## 命令参考

| 命令 | 作用 |
| --- | --- |
| `setup` | 配置 API key、检查依赖，并在确认后安装 npm 包。 |
| `doctor` | 检查本地运行环境。 |
| `install` | 通过 marketplace manifest 安装 Claude Code plugin。 |
| `install-legacy-command` | 只安装 legacy `/tripo-agent` slash command；它不会出现在 plugin 列表里。 |
| `ask "<目标>"` | 生成不消耗额度的 agent preview：缺失输入、路线、credit 估算、风险和下一步。 |
| `architecture` | 解释 Superpowers 风格的 skill 架构。 |
| `inventory ...` | 检查单图、多视图、文本或已有模型输入。 |
| `plan ...` | 生成 asset brief、模型路线、导出路线、rig 路线和制作方案。 |
| `preflight ...` | 报告缺失输入、成本风险和用户确认点。 |
| `synthesize-views ...` | 生成可选多视图图片供用户确认。 |
| `generate ...` | 创建 Tripo 3D 生成任务并下载输出。 |
| `convert [--format FBX]` | 通过 Tripo conversion API 转换模型格式。 |
| `rig [--preset unity-humanoid] [--apply]` | 运行 rig precheck；只有显式确认后才应用 auto-rig。 |
| `inspect` | 运行基础本地文件检查。 |
| `deep-check [--engine Unity]` | 如果有 Blender，运行更深的可用性检查。 |
| `package-asset [--engine Unity]` | 打包生成资产，方便导入游戏引擎。 |
| `memory [list|show <asset_id>]` | 查看可复用 asset memory，用于变体和系列资产。 |
| `run ...` | 运行带保护的端到端流程。 |
| `package` | 创建 `dist/tripo-game-agent-superpowers.zip` 分享包。 |

运行 `./bin/tripo-agent --help` 查看精确参数形式。

## 输出文件

```text
workspace/
  input_inventory.json
  preview_report.json
  preview_report.md
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
  asset_memory/
    index.json
    <asset_id>.json

outputs/<asset_id>/
  downloads/
  converted/
  rigged/
  readiness_report.md
  deep_readiness_report.json
  manifest.json
  <asset_id>_Unity_package.zip
```

`.env.local`、`assets/`、生成的 `workspace/*.json` / `workspace/*.md`、asset memory 记录、`outputs/` 都已加入 gitignore。

## Agent 工作流覆盖范围

已经实现的真实路径：

- API key 和依赖检查。
- 输入盘点和视图策略。
- P1 / H3 / H2 / Turbo / v1.4 模型路由。
- 图生 3D、多视图生 3D、文生 3D payload 路径。
- 可选多视图图片生成。
- 生成前的成本和缺失信息检查。
- Tripo generation polling 和文件下载。
- Tripo conversion API，支持 FBX/OBJ/STL/GLTF 风格导出。
- 带保护流程里的 rig precheck，以及显式 auto-rig 命令路径。
- 基础 GLB/FBX 文件检查。
- Blender deep readiness 路径；如果缺少 Blender，会明确跳过。
- 引擎导入 checklist。
- Unity 风格 package zip。
- 自动打开生成的图片或模型，方便用户确认。
- 持久化 asset memory，支持同风格变体和系列复用。

尚未完全自动化：

- Unity Humanoid / UE Manny 在引擎内的 retarget 验证。
- 完整 Unity/Unreal import preset 生成。
- 强 quad topology 和面数预算验证。
- LOD / collider / pivot 后处理。
- 和现有角色模块的拼接适配。
- 不重新生成整体模型的局部网格编辑。

## 仓库结构

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
├── workspace/
├── outputs/
└── assets/
```
