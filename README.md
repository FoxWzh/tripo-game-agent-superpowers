# Tripo Game Agent Superpowers

FOX 应聘 Tripo Agent Product Manager 的游戏资产方向面试作品。

这个项目借鉴 [`obra/superpowers`](https://github.com/obra/superpowers) 的思想：不是把所有逻辑塞进一个大 prompt，而是用一个 bootstrap skill 强制方法论，再用多个可组合 skill 承载稳定的业务知识和输出契约。

## 这是什么

这是一个本地可安装的 Tripo Game Asset Agent demo。

它不调用 Tripo API，也不伪装成真实 3D 生成工具。它展示的是：

- 用户如何表达游戏资产目标
- Agent 如何补齐 Unity / Unreal / Roblox / Godot 约束
- Agent 如何生成制作方案、成本和风险
- Agent 如何 mock 执行生成、优化、检查、修复、打包
- Agent 如何把资产记忆保存为后续改稿和系列复用基础

所有真实生成、优化、检查、导出步骤都标记 `[MOCK]`。

## 快速体验

```bash
git clone https://github.com/FoxWzh/tripo-game-agent-superpowers.git
cd tripo-game-agent-superpowers

./bin/tripo-agent demo game-character
./bin/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面，带骨骼"
```

## 安装到 Claude Code

```bash
./bin/tripo-agent install
```

然后在 Claude Code 中运行：

```text
/tripo-agent demo game-character
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
│   ├── game-asset-planning/
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
├── content/
└── mocks/
```

## Skill 分工

### `using-tripo-game-agent`

Bootstrap skill。强制 Agent 按流程工作：

```text
game-asset-intake
  -> game-asset-planning
  -> game-asset-production
  -> game-asset-readiness
  -> game-asset-memory
```

它规定不能跳过 planning，不能在 readiness 之前打包，mock 边界必须显式暴露。

### `game-asset-intake`

负责理解需求和补齐约束：

- asset type taxonomy
- Unity / Unreal / Roblox / Godot presets
- clarification policy
- Asset Brief 输出契约

### `game-asset-planning`

负责把 Asset Brief 变成 Production Plan：

- workflow template
- cost/time estimate
- execution tiers
- risk points
- fallback policy

### `game-asset-production`

负责生成和优化阶段的 mock/真实系统映射：

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

### `game-asset-memory`

负责继续改稿和系列复用：

- style lock
- asset versioning
- naming convention
- editable regions
- fallback history

## 面试官 5 分钟路径

1. 跑 `/tripo-agent demo game-character`，看完整 Unity-ready 角色资产流程。
2. 跑 `/tripo-agent ask "Unity 里用的机甲角色，quad mesh，15k 面"`，看自然语言 intake 和 planning。
3. 看 `skills/using-tripo-game-agent/SKILL.md`，理解为什么这是 Superpowers 风格。
4. 看 `skills/game-asset-readiness/SKILL.md`，理解为什么“生成模型”不等于“游戏可用资产”。

## 打包

```bash
./bin/tripo-agent package
```

输出：

```text
dist/tripo-game-agent-superpowers.zip
```

## 录屏建议

1. 开场 10 秒：说明这是 Tripo 游戏资产 Agent 的 Superpowers demo。
2. 60 秒：跑 `/tripo-agent demo game-character`，重点展示 intake、planning、readiness。
3. 30 秒：跑 `/tripo-agent ask "给上次角色加同风格盔甲"`，展示 modular / memory。
4. 20 秒：打开 `using-tripo-game-agent`，说明流程控制。
5. 20 秒：打开 `game-asset-readiness`，强调 PM 判断：产物可用性高于单步生成能力。
