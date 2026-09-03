# 项目目录结构

本文说明 AI Engineering Harness 当前仓库的实际目录、每部分职责、主要依赖关系，以及接入其他项目后生成的文件。未实现的 Role Pack、Technology Pack 和云端编排不包含在当前结构中。

## 1. 当前目录总览

```text
ai-engineering-harness/
├── AGENTS.md
├── README.md
├── package.json
├── harness.project.json
├── bin/
│   └── harness.mjs
├── src/
│   ├── cli.mjs
│   ├── config.mjs
│   ├── doctor.mjs
│   ├── documents.mjs
│   ├── eval.mjs
│   ├── schema.mjs
│   ├── skills.mjs
│   ├── sync.mjs
│   └── verify.mjs
├── schemas/
│   ├── project.schema.json
│   ├── task.schema.json
│   ├── result.schema.json
│   ├── eval-scenario.schema.json
│   └── skill-lock.schema.json
├── skills/
│   ├── plan-change/
│   │   └── SKILL.md
│   ├── diagnose-problem/
│   │   └── SKILL.md
│   ├── implement-change/
│   │   └── SKILL.md
│   ├── review-change/
│   │   └── SKILL.md
│   └── verify-deliverable/
│       └── SKILL.md
├── templates/
│   ├── harness.project.json
│   ├── task.json
│   ├── result.json
│   └── review-packet.md
├── evals/
│   ├── fixtures/
│   │   ├── frontend-project/
│   │   ├── backend-project/
│   │   └── product-project/
│   └── scenarios/
│       ├── plan-ambiguous-contract.json
│       ├── diagnose-package-manager.json
│       ├── implement-regression.json
│       ├── review-security-boundary.json
│       └── verify-unavailable-check.json
├── test/
│   ├── cli.test.mjs
│   ├── config.test.mjs
│   ├── documents.test.mjs
│   ├── skills.test.mjs
│   └── verify.test.mjs
└── docs/
    ├── plan.md
    ├── usage.md
    └── project-structure.md
```

## 2. 根目录文件

### `README.md`

项目入口，回答“这是什么、目前有什么能力、如何快速运行”。它只保留概览，详细设计和使用步骤分别链接到 `docs/plan.md` 与 `docs/usage.md`。

### `AGENTS.md`

Harness 仓库自身的 AI 开发约定。它约束在这个仓库中工作的 Codex、Claude 或其他 Agent，例如：

- Kernel 不包含具体业务和技术栈知识。
- Skill 按能力拆分，禁止万能 Skill。
- 确定性行为优先使用代码、Schema 和测试。
- 未经授权不 Commit、Push、发布或修改外部系统。

它不是分发给目标项目的通用 Skill，也不会替代目标项目自己的 `AGENTS.md`。

### `package.json`

定义本地 CLI 入口、Node.js 版本和质量命令。当前实现只使用 Node.js 标准库，没有运行时第三方依赖。

```text
npm run check
  ├── harness eval
  └── node --test
```

### `harness.project.json`

Harness 对自己的项目接入配置，用于自举验证。它声明：

- 项目名称。
- 知识入口和规划文档。
- 自身验证命令。
- 可用 Skill。
- 人工审批动作。

中央 Harness 本身不是 Skill 消费项目，所以这里的 `adapters.skillDirectories` 为空。

## 3. `bin/`：命令行入口

```text
bin/
└── harness.mjs
```

职责非常薄：接收命令行参数，调用 `src/cli.mjs`，并把返回值设置为进程退出码。

它不包含配置、同步或验证逻辑，目的是让未来改变安装方式时不影响核心实现。

## 4. `src/`：CLI 与 Kernel 实现

### `src/cli.mjs`

命令路由和用户输出层。它识别以下命令，并把工作交给对应模块：

```text
init / doctor / sync / verify / eval
validate-skill
create-task / validate-task
create-result / validate-result
```

这里不实现具体校验算法，避免 CLI 入口变成所有逻辑的堆积点。

### `src/config.mjs`

项目配置模块，负责：

- 创建 `harness.project.json`。
- 读取和解析项目配置。
- 按 `project.schema.json` 校验结构。
- 检查知识路径与 Skill 输出目录不能逃逸目标项目。
- 根据项目锁文件推断 `pnpm`、`yarn` 或 `npm` 验证命令。

它是 `doctor`、`sync` 和 `verify` 共用的项目配置入口。

### `src/doctor.mjs`

项目接入诊断模块。当前检查：

- Node.js 版本。
- 多包管理器锁文件冲突。
- Harness 项目配置是否合法。
- 知识入口和文档是否存在。
- 是否配置验证命令。
- 中央 Skill 是否存在。
- 各 AI 适配目录是否完成 Skill 同步。

`doctor` 只诊断，不自动删除文件、安装依赖或覆盖项目配置。

### `src/schema.mjs`

零依赖 JSON Schema 子集校验器，是协议层的底层能力。当前支持本项目 Schema 使用到的：

- `type`
- `const`
- `enum`
- `required`
- `properties`
- `additionalProperties`
- `items`
- `minItems`
- `minLength`
- `pattern`

它不是完整 JSON Schema 实现。未来 Schema 使用更多关键字时，要么扩展并测试该模块，要么引入经过评审的标准校验器。

### `src/documents.mjs`

Task 和 Result 协议文档模块，负责：

- 从模板创建 Task/Result JSON。
- 使用对应 Schema 做运行时校验。
- 执行 Schema 难以直接表达的语义校验。

例如：Result 声明为 `completed` 时，不能同时包含 `failed` 或 `not-run` 的验证项。

### `src/skills.mjs`

检查一个 Skill 是否符合基础约定：

- 存在 `SKILL.md`。
- 包含 YAML Frontmatter。
- `name` 使用小写 kebab-case。
- Skill 名称与目录名称一致。
- `description` 足够明确，可用于 Agent 自动路由。
- Skill 正文不为空。

它验证结构和元数据，不判断模型执行效果。

### `src/sync.mjs`

把中央 `skills/` 同步到目标项目的 AI 工具目录。同步规则：

```text
目标不存在                      → 安装
目标与中央版本相同              → 跳过
目标是未修改的旧受管版本        → 安全升级
目标被项目本地修改              → 冲突并停止
用户显式提供 --force            → 覆盖本地版本
```

同步状态记录在目标项目的 `.harness/skill-lock.json`，用于区分中央旧版本和项目本地修改。

### `src/verify.mjs`

执行目标项目在 `harness.project.json` 中声明的 `commands.verify`：

- 按顺序执行。
- 遇到第一个失败立即停止。
- 保留失败命令的退出码。
- 没有配置验证命令时返回非成功状态，而不是错误宣称完成。

Harness 不决定项目应该用 Jest、Gradle、pytest 还是其他工具，项目自己声明权威验证命令。

### `src/eval.mjs`

聚合 Harness 自检：

- 校验全部核心 Skill。
- 检查 Schema 元数据。
- 校验 Task/Result 模板。
- 校验前端、后端和产品 fixture。
- 校验行为场景定义。

当前是静态和确定性 Eval，还没有调用真实模型执行场景。

## 5. `schemas/`：跨语言协议

Schema 是 Harness 的机器可读公共协议，不依赖 Node.js API。

| 文件 | 用途 |
|---|---|
| `project.schema.json` | 目标项目如何接入 Harness |
| `task.schema.json` | 工作目标、验收条件、范围和风险 |
| `result.schema.json` | 完成状态、变更、证据和剩余限制 |
| `eval-scenario.schema.json` | 行为评估场景及预期边界 |
| `skill-lock.schema.json` | 受管 Skill 同步锁格式 |

所有公共协议包含 `schemaVersion` 和版本化 `$id`。破坏性变化不能直接覆盖 v1，需要迁移策略。

## 6. `skills/`：通用工作能力

这里是所有目标项目复用的中央 Skill 源。

| Skill | 职责 | 默认工作区模式 |
|---|---|---|
| `plan-change` | 读取事实，形成实现或交付计划 | 只读 |
| `diagnose-problem` | 复现、定位和解释根因 | 只读 |
| `implement-change` | 在项目范围内实现和验证变更 | 可写 |
| `review-change` | 检查缺陷、风险、架构和测试 | 只读 |
| `verify-deliverable` | 独立验证完成声明和证据 | 只读 |

Skill 不保存具体项目事实，也不包含 Vue、Java 或某个业务领域知识。每个 Skill 只在相关任务中加载，控制上下文占用。

## 7. `templates/`：可复制交付模板

| 文件 | 用途 |
|---|---|
| `harness.project.json` | 新项目接入配置示例 |
| `task.json` | 标准任务文档起点 |
| `result.json` | 标准交付结果起点 |
| `review-packet.md` | 面向人类或 Agent Reviewer 的交付摘要 |

模板提供结构，不代表项目事实。生成后必须由使用者或 Agent 根据真实任务填写。

## 8. `evals/`：评估输入

### `evals/fixtures/`

包含三种不同类型的最小项目样例：

- `frontend-project`：验证前端任务、状态和包管理器场景。
- `backend-project`：验证后端错误映射、安全和 Gradle 工作流表达。
- `product-project`：验证非代码交付、未确认需求和文档验证。

这些目录不是可运行的完整应用，也不是项目脚手架。它们只用于证明 Harness 协议不依赖单一技术栈或代码角色。

### `evals/scenarios/`

每个 JSON 描述一个未来可以交给真实模型运行的测试场景：

- 使用哪个 Skill。
- 给 Agent 的输入是什么。
- 工作区应为只读还是可写。
- 必须出现的行为。
- 禁止出现的行为。

当前 `eval` 只检查场景结构；未来 Model Runner 会实际执行并由 Rubric 评分。

## 9. `test/`：确定性自动测试

| 文件 | 覆盖范围 |
|---|---|
| `cli.test.mjs` | 命令路由、退出码、创建和校验协议文档 |
| `config.test.mjs` | 配置生成、环境诊断和路径安全 |
| `documents.test.mjs` | Task/Result Schema 与语义规则 |
| `skills.test.mjs` | Skill 格式、同步、冲突和安全升级 |
| `verify.test.mjs` | 验证命令成功、失败和未配置状态 |

测试只使用临时目录，不修改真实采用项目。

## 10. `docs/`：人类与 Agent 的知识入口

| 文件 | 回答的问题 |
|---|---|
| `plan.md` | 为什么建设、边界是什么、后续做什么 |
| `usage.md` | 如何把 Harness 接入并用于一个项目 |
| `project-structure.md` | 代码和资料分别放在哪里、为什么 |

文档描述事实和决策，Skill 描述按需执行的流程，两者不能互相复制。

## 11. 主要依赖方向

```text
bin/harness.mjs
      ↓
src/cli.mjs
      ├── config.mjs ─────→ schema.mjs
      ├── doctor.mjs ─────→ config.mjs
      ├── documents.mjs ──→ schema.mjs
      ├── skills.mjs
      ├── sync.mjs ───────→ config.mjs
      ├── verify.mjs ─────→ config.mjs
      └── eval.mjs ───────→ config/documents/schema/skills

schemas/   ← 公共协议事实源
skills/    ← 通用能力事实源
templates/ ← 新文档和项目配置起点
evals/     ← 评估输入
test/      ← 对实现与边界做确定性验证
```

`src/` 可以读取 Schema、Skill、Template 和 Eval 输入；这些数据目录不反向依赖 CLI 实现。

## 12. 接入目标项目后生成什么

假设一个项目启用了 Codex、Claude Code 和 GitHub Copilot，执行 `harness sync` 后会出现：

```text
target-project/
├── AGENTS.md                         项目自己的事实和约束
├── harness.project.json              项目接入配置
├── .harness/
│   └── skill-lock.json               Harness 管理的 Skill 版本
├── .agents/skills/                   Codex Skill
├── .claude/skills/                   Claude Code Skill
└── .github/skills/                   GitHub Copilot Skill
```

如果团队只使用一个或两个 AI 工具，可以在 `adapters.skillDirectories` 中移除不需要的目录，避免生成无用副本。

Task 和 Result 文件位置由项目自己决定，推荐放在项目的 `.harness/` 或版本化任务目录中：

```text
.harness/
├── task.json
├── result.json
└── skill-lock.json
```

## 13. 尚未存在的规划目录

以下能力仍处于规划阶段，因此仓库当前没有创建对应空目录：

- `roles/`：产品、开发、测试、Reviewer 角色组合。
- `packs/`：Vue、Java、Go、API Testing 等技术包。
- `adapters/`：需要专属转换逻辑时才建立的供应商适配实现。
- `orchestrator/`：任务队列、多 Agent、worktree 和控制面。
- `model-runner/`：真实调用不同模型执行 Eval 场景。

只有真实采用场景证明需要这些边界后才创建，避免提前形成无法验证的抽象。
