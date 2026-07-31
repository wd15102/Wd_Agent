# WdClaw × OpenWorker 深度启发 — 完整实施计划

> 基于 OpenWorker 源码级分析（engine.py 45KB + connectors/ 167KB + audit.py + scheduler.py）
> 从"聊天助手"进化为"桌面 AI 同事"的完整路线图。

---

## 📋 总览

| 阶段 | 功能 | 核心来源 | 预估工时 |
|------|------|----------|----------|
| Phase 0 | 🏗️ 事件驱动架构重构 | engine.py TurnEngine | 6-8h |
| Phase 1A | 🔐 权限审批系统 | engine.py PermissionEngine | 2-3h |
| Phase 1B | 📊 可视化执行时间轴 | engine.py Event 流 | 3-4h |
| Phase 1C | 📋 审计日志系统 | audit.py SQLite | 2-3h |
| Phase 2A | 🤖 Agent 类型系统 | agents/base.py | 3-4h |
| Phase 2B | 🔌 MCP 协议支持 ✅ 已完成 | connectors/ 架构 | 4-6h |
| Phase 2C | 📡 消息通道适配器 ✅ 已完成 | connectors/base.py | 4-5h |
| Phase 3A | ⏰ 智能调度器 ✅ 已完成 | automation/scheduler.py | 3-4h |
| Phase 3B | 📋 工作流模板 ✅ 已完成 | agents/ + engine | 3-4h |

---

## Phase 0：🏗️ 事件驱动架构重构 ✅ 已完成

**目标**：将现有线性 SSE 流重构为 OpenWorker 的 TurnEngine 事件驱动模式。

### 为什么先做这个？

OpenWorker 的 `engine.py` 是整个项目的核心。它的 `TurnEngine` 用 async generator + 事件流设计：

```python
# OpenWorker 的核心循环
async for event in self._loop():
    yield Event(EventType.TURN_START, data)
    yield Event(EventType.ASSISTANT_DELTA, {"text": chunk})
    yield Event(EventType.TOOL_CALL, {"tool": name, "args": args})
    yield Event(EventType.TOOL_FINISHED, {"result": result})
    yield Event(EventType.PERMISSION_REQUIRED, {"tool": name})
    yield Event(EventType.TURN_END, {"status": "completed"})
```

**关键特性**：
- 低风险工具（read/search）**并发执行**，高风险工具（write/exec）**严格串行**
- 可在**任意状态中断**（流式传输中、工具执行中、等待审批中）
- **持久化恢复**：挂起的审批在重启后可继续
- **模型切换**：对话中可切换模型，自动处理图片兼容性

### Step 0.1：事件类型定义
- [ ] `shared/types.ts` 新增 `WdClawEvent` 联合类型：
  ```ts
  type WdClawEvent =
    | { type: 'turn_start'; input: string }
    | { type: 'assistant_delta'; text: string }
    | { type: 'reasoning_delta'; text: string }
    | { type: 'tool_call'; toolCall: ToolCall }
    | { type: 'tool_finished'; toolCallId: string; result: string }
    | { type: 'permission_required'; toolName: string; args: any }
    | { type: 'permission_resolved'; toolName: string; outcome: 'once'|'always'|'deny' }
    | { type: 'execution_step'; step: ExecutionStep }
    | { type: 'turn_end'; status: string; iterations: number }
    | { type: 'error'; error: string; errorType: string }
    | { type: 'interrupted'; iterations: number }
  ```

### Step 0.2：Agent 核心重构
- [ ] `agent/index.ts` 从线性 SSE 改为 async generator 事件流：
  ```ts
  async *streamChat(messages, modelConfig, tools): AsyncGenerator<WdClawEvent>
  ```
- [ ] 工具调用策略：
  - 低风险（read/list_dir/web_search/web_fetch）→ `Promise.all` 并发
  - 高风险（write/exec）→ 串行 await
- [ ] 中断机制：`AbortController` + 检查点（每个 tool call 前后检查）

### Step 0.3：IPC 事件桥接
- [ ] `ipc.ts` 新增 `sendEvent(event: WdClawEvent)` 推送
- [ ] preload 新增 `onEvent(callback)` 订阅
- [ ] 前端 `App.tsx` 全局事件总线消费

### Step 0.4：持久化恢复
- [ ] 对话历史保存时记录"未完成的 tool_calls"
- [ ] 重启后检测到未完成的 tool_call → 触发恢复流程
- [ ] 审批请求持久化到收件箱，用户回来后处理

---

## Phase 1A：🔐 权限审批系统 ✅ 已完成

**目标**：独立的 PermissionEngine + 人在回路审批。

### Step 1.1：权限引擎
- [ ] `src/main/permissions/index.ts` — 独立权限引擎
  - 每个工具的默认权限：read→auto, write→ask, exec→ask
  - 用户可在设置面板自定义
  - 支持"永久允许"规则持久化

### Step 1.2：审批 UI
- [ ] `ApprovalModal.tsx` — 弹出式审批卡片
  - 显示：工具名、操作描述、参数预览
  - 三个按钮：✅ 仅此一次 / 🔒 永久允许 / ❌ 拒绝
- [ ] `MessageItem.tsx` 工具调用状态可视化

### Step 1.3：后端审批逻辑
- [ ] `ToolRegistry.execute()` 执行前检查权限
- [ ] `ask` 等级 → 暂停执行，发 `permission_required` 事件
- [ ] 前端审批后回传 `permission_resolved`

---

## Phase 1B：📊 可视化执行时间轴 ✅ 已完成

**目标**：将 Agent 操作变成透明的可视化流程。

### Step 2.1：执行步骤数据结构
- [ ] `ExecutionStep` 接口（已在 Phase 0 定义）
- [ ] Agent 执行过程中通过事件流实时推送步骤

### Step 2.2：时间轴 UI
- [ ] `ExecutionTimeline.tsx`：
  - 左侧：垂直时间轴（圆点 + 竖线）
  - 右侧：步骤卡片（图标 + 标题 + 耗时）
  - 运行中步骤有脉冲动画
- [ ] 嵌入 `ChatPanel.tsx`，在 AI 回复过程中显示

### Step 2.3：步骤类型映射
- [ ] 🧠 思考中 / 🔧 工具调用 / 📖 读取文件 / ✏️ 写入文件 / ✅ 完成 / ❌ 错误

---

## Phase 1C：📋 审计日志系统 ✅ 已完成

**目标**：JSON 文件审计日志，自动脱敏，可追溯。

> OpenWorker 的 `audit.py` 是所有工具调用的审计追踪，自动脱敏敏感信息。

### Step 3.1：审计存储
- [ ] `src/main/audit/store.ts` — SQLite 存储
  - 表：`audit_events` (timestamp, session_id, agent, tool, stage, status, approval, args, result_preview, resource)
  - 自动脱敏：token/secret/password/api_key → `[redacted]`
  - 参数摘要：长文本截断到 500 字符

### Step 3.2：审计 UI
- [ ] SettingsPanel 新增「审计日志」标签页
  - 表格展示：时间、会话、工具、状态、审批结果
  - 筛选：按会话/工具/状态过滤
  - 详情面板：查看完整参数和结果

---

## Phase 2A：🤖 Agent 类型系统 ✅ 已完成

**目标**：不同 Agent 有不同能力、工具集和权限。

> OpenWorker 有 4 种 Agent：Chat（纯对话）、Code（代码）、Cowork（全功能）、MyHelper（个人助手）

### Step 4.1：Agent 定义
- [ ] `Agent` 接口：
  ```ts
  interface Agent {
    id: string;
    name: string;
    family: 'chat' | 'code' | 'cowork' | 'helper';
    systemPrompt: string;
    tools: string[];           // 允许使用的工具
    needsWorkspace: boolean;
    messaging: boolean;        // 是否支持消息通道
    connectors: boolean;       // 是否加载连接器
  }
  ```

### Step 4.2：Agent 管理器
- [ ] `src/main/agents/manager.ts` — CRUD + 持久化
- [ ] 预设 4 个内置 Agent（聊天/代码/协作/助手）
- [ ] 创建对话时选择 Agent，自动加载对应工具集

### Step 4.3：Agent UI
- [ ] 新建对话时显示 Agent 选择器
- [ ] 对话列表显示 Agent 头像/名称
- [ ] Agent 详情面板（已有）增强：显示工具集、权限等级

---

## Phase 2B：🔌 MCP 协议支持 ✅ 已完成

**目标**：兼容 Model Context Protocol，接入社区生态。

### Step 5.1：MCP Client
- [ ] `src/main/mcp/client.ts` — JSON-RPC 2.0 协议
  - 支持 stdio + SSE 传输
  - `tools/list`、`tools/call`、`resources/list`

### Step 5.2：MCP Server 管理
- [ ] `src/main/mcp/manager.ts` — 启动/停止/连接池
- [ ] 配置格式：`{ mcpServers: { name: { command, args, env } } }`

### Step 5.3：工具桥接
- [ ] `ToolRegistry.registerMCPTools()` — MCP → WdClaw ToolDef
- [ ] MCP 工具走权限审批系统
- [ ] 设置面板 MCP 管理 UI

---

## Phase 2C：📡 消息通道适配器 ✅ 已完成

**目标**：BasePlatformAdapter 模式，支持多平台消息接入。

> OpenWorker 的 `connectors/base.py` 定义了平台无关的适配器契约，支持 Slack/Telegram 等。

### Step 6.1：适配器核心
- [ ] `src/main/channels/adapter.ts` — BaseChannelAdapter 抽象类
  - `connect()` / `disconnect()` / `send()`
  - `SessionSource` 身份追踪
  - `MessageEvent` / `InteractionEvent` 结构化事件

### Step 6.2：内置通道
- [ ] 飞书适配器（如果 API 允许）
- [ ] 企业微信适配器
- [ ] Discord 适配器（社区需求大）

### Step 6.3：交互支持
- [ ] 消息内嵌交互按钮（审批/选择/确认）
- [ ] @提及 路由
- [ ] 富文本消息卡片

---

## Phase 3A：⏰ 智能调度器

**目标**：健壮的定时任务调度，支持挂起恢复。

> OpenWorker 的 `scheduler.py` 有 run-once-catch-up + skip-on-overlap 策略。

### Step 7.1：调度核心
- [ ] `src/main/scheduler/index.ts` — 30 秒 tick 循环
  - 错过补偿：启动时执行一次过期任务
  - 重叠保护：同一任务前一次未完成则跳过
  - 审批挂起：遇审批请求不阻塞调度器

### Step 7.2：持久化
- [ ] 任务定义 + 执行历史持久化
- [ ] 执行状态：pending/running/completed/error/suspended

---

## Phase 3B：📋 工作流模板

**目标**：将验证过的操作流程保存为可复用模板。

### Step 8.1：模板引擎
- [ ] `WorkflowTemplate` 接口 + CRUD
- [ ] 从对话历史一键保存为模板
- [ ] 步骤执行引擎（顺序/条件分支）

### Step 8.2：模板市场
- [ ] `WorkflowMarketplace.tsx` — 本地 + 在线模板
- [ ] 分类筛选、搜索、一键使用



```
Phase 0 (架构重构)
  ↓
Phase 1A (审批) + Phase 1B (时间轴) + Phase 1C (审计)  ← 可并行
  ↓
Phase 2A (Agent 类型) → Phase 2B (MCP) → Phase 2C (通道)
  ↓
Phase 3A (调度器) + Phase 3B (工作流模板)
```

## ✅ 验收标准

- [ ] Phase 0：Agent 执行过程全事件流，可中断可恢复
- [ ] Phase 1A：write/exec 弹审批，可选一次/永久/拒绝
- [ ] Phase 1B：实时显示执行步骤时间轴
- [ ] Phase 1C：所有工具调用记录到 SQLite，敏感信息脱敏
- [ ] Phase 2A：4 种内置 Agent，创建对话时可选
- [ ] Phase 2B：连接 3+ MCP Server
- [ ] Phase 2C：至少 1 个消息通道适配器
- [ ] Phase 3A：定时任务支持审批挂起和错过补偿
- [ ] Phase 3B：从对话保存模板，一键执行多步骤任务
- [ ] Phase 4：安装包 < 30MB
