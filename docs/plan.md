# AI Engineering Harness 总体规划

## 1. 项目定位

AI Engineering Harness 是一套面向多 AI 工具、多专业角色和多技术栈的软件工作协议与执行框架。它不替代具体项目的研发规范，也不把某个模型的提示词包装成平台；它负责让工作能够被一致地描述、执行、验证、审查和交付。

核心表达：

```text
项目事实 + 任务意图
        ↓
Harness 工作协议
        ↓
可组合 Skill + 确定性工具 + 权限策略
        ↓
模型或 Agent 执行
        ↓
测试、证据、Review 与反馈
```

## 2. 目标

- 为产品、开发、测试、评审和运维工作提供统一的任务与结果协议。
- 让 Codex、Claude Code、GitHub Copilot 等工具复用同一组核心 Skill。
- 将架构约束、环境检查和验证尽可能转化为可执行工具。
- 支持项目级配置，不把前端、后端或某个业务领域固化进 Kernel。
- 为 Skill 和 Agent 工作流建立可重复的行为评估。
- 逐步支持任务恢复、独立工作区、审计和编排，但不在 MVP 过早建设控制平台。

## 3. 非目标

- 不训练或托管基础模型。
- 不在 MVP 提供多 Agent 调度服务、任务看板或云端控制面。
- 不提供万能开发 Agent 或万能角色 Prompt。
- 不替代项目的 `AGENTS.md`、架构文档、产品文档和发布流程。
- 不绕过各 AI 工具、操作系统或企业环境的权限机制。
- 不假设所有项目使用 Node.js；Node.js 只是 MVP CLI 的实现载体。

## 4. 分层架构

### 4.1 Kernel 协议

Kernel 包含版本化的机器可读协议：

- Task：目标、上下文、验收条件、非目标、限制、交付物、风险和验证要求。
- Result：状态、变更、验证证据、假设、限制和后续事项。
- 后续协议：Permission、Event、Execution Plan 和 Review Finding。

协议使用 JSON Schema 表达，避免绑定 SDK 或实现语言。

### 4.2 Capability Skills

Skill 按任务能力拆分。MVP 提供：

1. `plan-change`：形成可执行且可验证的变更计划。
2. `diagnose-problem`：复现和定位问题，默认不修改。
3. `implement-change`：在项目边界内实现并验证变更。
4. `review-change`：按风险和证据审查已有变更。
5. `verify-deliverable`：独立验证交付物和完成声明。

Skill 只包含会改变 Agent 决策的非显然指导。项目事实留在项目仓库，确定性逻辑留在 CLI 和测试。

### 4.3 Role Packs

角色不是独立提示词副本，而是 Skill、工具、权限与交付物的组合。未来可以提供：

```text
Product  = research + clarify + requirement + acceptance
Engineer = plan + implement + test + verify
QA       = requirement + test-design + diagnose + verify
Reviewer = review + architecture-check + risk-check
```

在真实使用场景验证前不创建角色包实现。

### 4.4 Technology Packs

技术包只在相关任务中加载，例如 Vue、React、Java、Go、API Testing 或 Accessibility。通用 Skill 不内置框架最佳实践。技术包必须有清晰适用范围和至少一个真实采用项目。

### 4.5 Project Adapter

目标项目通过 `harness.project.json` 声明：

- 项目标识和知识入口。
- 安装、检查、测试和构建命令。
- 所需 Skill。
- Skill 适配目录。
- 需要人工批准的动作。

项目配置提供连接信息，不复制中央 Skill，也不能弱化项目自己的安全与架构要求。

### 4.6 Runtime Adapters

适配器负责把开放 Skill 映射到工具能发现的位置：

- Codex：`.agents/skills`。
- Claude Code：`.claude/skills`。
- GitHub Copilot：`.github/skills`，也可读取部分兼容目录。

适配器不实现计划、开发或 Review 逻辑。MVP 使用安全复制：缺失时安装、相同时跳过、冲突时停止；只有显式 `--force` 才覆盖。

### 4.7 Evaluation

Eval 关注可观察行为而非固定文案：

- 是否保持任务范围。
- 是否读取正确的项目事实。
- 是否在缺少关键决策时升级给人类。
- 是否执行并准确报告验证。
- 是否越权修改或访问外部系统。
- 不同模型与版本下是否保持基本稳定。

MVP 先提供结构验证和 CLI 行为测试，后续加入隔离 fixture 项目与模型运行评估。

## 5. CLI

```text
harness init             在目标项目生成待确认配置
harness doctor           检查环境、配置和接入问题
harness sync             安装或检查工具所需 Skill
harness verify           执行项目声明的验证命令
harness eval             验证 Harness 内置 Skill
harness validate-skill   验证单个 Skill 的结构和元数据
```

CLI 默认采用保守行为：不覆盖冲突文件、不安装依赖、不提交代码、不访问网络、不部署。

## 6. 项目生命周期

```text
Understand → Inspect → Plan → Execute → Verify → Review → Deliver → Learn
```

- 小任务可以合并阶段，复杂任务应持久化 Exec Plan。
- Diagnose 和 Review 默认是只读任务。
- Execute 不隐含 Commit、Push、PR、部署或外部写入权限。
- Deliver 必须区分已执行验证与建议验证。
- Learn 将重复失败反馈到文档、Skill、脚本、Lint、测试或项目模板。

## 7. 路线图

### MVP 0.1：协议与本地工具

- Task/Result Schema。
- 五个核心 Skill。
- `init/doctor/sync/verify/eval` CLI。
- CLI 单元测试和 Skill 结构验证。
- 一个项目配置模板。

退出条件：可以在隔离目录初始化配置、同步 Skill、发现冲突、运行验证并产生明确退出码。

### 0.2：真实项目接入

- 以 HR 前端项目作为第一个采用者。
- 增加后端和文档型 fixture 项目。
- 建立任务模板、Review Packet 和 Eval rubric。
- 补充 Windows 与 CI 兼容性。

### 0.3：角色和技术包

- 从真实重复场景提取产品、开发、测试和 Reviewer 角色包。
- 增加首批前端、后端和测试技术包。
- 建立版本兼容矩阵和迁移命令。

### 1.0：稳定协议

- 冻结 v1 Task、Result 和 Permission 协议。
- 提供可发布 CLI 与安装方式。
- 建立多模型行为基线、版本回归和安全审计。
- 根据需求评估任务队列、worktree 管理和外部控制面。

## 8. 关键风险

- 过度抽象：没有两个真实场景验证的规则不进入 Kernel。
- Skill 膨胀：通过精确描述和渐进加载控制上下文。
- 供应商差异：标准字段放核心，专属字段放适配层。
- 权限扩大：Skill 只描述意图，实际授权由 Harness 与宿主共同控制。
- 错误完成声明：Result 必须携带验证证据，未执行检查必须明确标识。
- 规则漂移：项目事实只有一个来源，生成的适配文件必须可检测冲突。

## 9. 当前决策

- 使用独立仓库，而不是依附 HR 前端项目。
- 使用开放 `SKILL.md` 作为能力包装格式。
- 使用 JSON Schema 作为语言无关的协议定义。
- MVP CLI 使用 Node.js 18+ 标准库，不引入运行时依赖。
- 首先解决单 Agent 的可靠工作闭环，再扩展多 Agent 编排。
