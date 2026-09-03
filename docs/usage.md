# 使用指南

当前 CLI 尚未发布为全局包，以下示例直接调用本地入口：

```bash
HARNESS="node /Users/y20/Code/ai-engineering-harness/bin/harness.mjs"
```

## 接入项目

初始化配置：

```bash
$HARNESS init --project /path/to/project
```

检查生成的 `harness.project.json`，尤其是知识入口、验证命令、启用的 Skill、适配目录和人工审批动作。然后运行：

```bash
$HARNESS doctor --project /path/to/project
$HARNESS sync --project /path/to/project
```

`sync` 在 `.harness/skill-lock.json` 记录受管版本。缺失内容会安装，相同内容会跳过，未被项目修改的旧受管版本会安全升级；项目本地修改会产生冲突。确认中央版本应覆盖本地修改时才使用 `--force`。

## 创建任务协议

```bash
$HARNESS create-task .harness/task.json --project /path/to/project
$HARNESS validate-task .harness/task.json --project /path/to/project
```

任务描述目标、上下文、验收条件、非目标、限制、交付物、验证方式和风险，不包含模型或厂商专属字段。

## 使用 Skill

- Codex：明确提及 `$plan-change`、`$implement-change` 等 Skill。
- Claude Code：使用 `/plan-change`、`/diagnose-problem` 等 Skill。
- GitHub Copilot：让 Agent 自动匹配，或明确要求使用指定 Skill。

Diagnose、Review 和独立 Verify 默认只读。Implement 允许在项目范围内修改，但不隐含安装依赖、Commit、Push、部署或外部写入权限。

## 验证项目

`verify` 按顺序执行项目配置中的 `commands.verify`，第一个失败命令会停止流程并保留退出码：

```bash
$HARNESS verify --project /path/to/project
```

## 创建交付结果

```bash
$HARNESS create-result .harness/result.json --project /path/to/project
$HARNESS validate-result .harness/result.json --project /path/to/project
```

状态为 `completed` 时，所有列出的验证必须为 `passed`。失败或未执行检查必须携带说明，不能隐藏在完成声明中。

人工或 Agent Review 可以使用 [Review Packet 模板](../templates/review-packet.md) 汇总目标、交付内容、证据、决策、风险和后续事项。

## Harness 自检

```bash
cd /Users/y20/Code/ai-engineering-harness
npm run check
node ./bin/harness.mjs doctor
node ./bin/harness.mjs eval
```

当前 `eval` 验证 Skill 元数据、协议 Schema、模板、三类 fixture 和五个行为场景的结构。它还没有实际调用不同模型评分；模型级 Eval 属于后续阶段。
