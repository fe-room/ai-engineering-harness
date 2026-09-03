# AI Engineering Harness

面向多 AI、多角色和多技术栈的软件交付 Harness。项目以开放协议、可组合 Skill、薄运行时适配器和可验证反馈循环为核心，让产品、开发、测试与评审工作能够被一致地描述、执行和验收。

当前处于 MVP 阶段。详细范围、架构和路线见 [总体规划](./docs/plan.md)。

## 快速体验

环境要求：Node.js 18 或更高版本。

```bash
node ./bin/harness.mjs help
node ./bin/harness.mjs doctor
node ./bin/harness.mjs validate-skill ./skills/plan-change
node --test
```

## 当前能力

- 任务输入与交付结果 JSON Schema。
- `plan-change`、`diagnose-problem`、`implement-change`、`review-change`、`verify-deliverable` 五个通用 Skill。
- `doctor`、`init`、`sync`、`verify`、`eval` CLI 命令。
- Task/Result 模板创建和运行时协议校验。
- Codex、Claude Code 与 GitHub Copilot 的 Skill 目录适配。
- 前端、后端、产品工作三类 fixture 和五个行为预期场景。

## 设计边界

Harness 定义工作协议、生命周期、权限、证据和验证方式。具体项目继续拥有自己的产品事实、架构决策、构建命令、安全策略和发布流程。

完整接入步骤见 [使用指南](./docs/usage.md)。
