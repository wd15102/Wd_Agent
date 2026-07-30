# WdClaw 项目计划 v2

> 目标：开发一个类似腾讯 QClaw 0.2.33 的 Windows AI Agent 桌面工具
> 技术栈：Electron + React + Vite + Ant Design + WebSocket
> 模型：云端 GLM（通过 OpenAI 兼容 API）

---

## QClaw 架构分析（基于源码逆向）

### 技术栈
- **Electron** + Vite 构建，主进程代码编译为 V8 字节码（.cjsc）
- **React** + Ant Design（CSS 中大量 ant- 类名）
- **OpenClaw Gateway**：内嵌在 Electron 中，通过 `openclaw-bootstrap.mjs` 启动
- **WebSocket** 通信：前端 ↔ Gateway
- **better-sqlite3**：本地会话/消息存储
- **electron-updater**：自动更新
- **koffi**：原生 FFI 调用
- 核心依赖：`@guanjia-openclaw/*`（腾讯内部包）、`@tencent/*`（腾讯 SDK）

### 界面结构（QClaw 0.2.33）
1. **左侧边栏**：会话列表、新建会话、设置入口
2. **主聊天区**：消息流（用户/AI/工具调用）、Markdown 渲染、代码高亮
3. **输入区**：文本输入框、附件上传、发送按钮
4. **设置面板**：模型配置、API Key、技能管理
5. 系统托盘、全局快捷键

### 不需要的功能
- 登录/注册（微信/企业微信）
- 积分系统
- 分享功能
- 自动更新（electron-updater）
- 腾讯特有 SDK（qimei、guid-native、smh-js-sdk 等）

---

## 开发阶段

### 第一阶段：UI 框架重建（1-2天）
**目标：完全复刻 QClaw 的 UI 布局和交互**

- [ ] 安装 Ant Design（`npm install antd @ant-design/icons`）
- [ ] 替换 Tailwind 为 Ant Design 组件库
- [ ] 实现三栏布局：
  - 左：Sidebar（会话列表 + 新建按钮 + 设置按钮）
  - 中：ChatPanel（消息列表 + 输入区）
  - 右：可选抽屉（设置/详情）
- [ ] 实现深色/浅色主题（QClaw 默认浅色）
- [ ] 实现消息气泡组件：
  - 用户消息（右对齐，蓝/绿色背景）
  - AI 消息（左对齐，灰色背景，Markdown 渲染）
  - 工具调用卡片（可折叠，显示工具名+参数+结果）
  - 思考过程（可折叠，灰色斜体）
- [ ] 实现输入区：
  - 自适应高度文本框
  - 发送按钮（Enter 发送，Shift+Enter 换行）
  - 附件上传按钮
  - 停止生成按钮
- [ ] 实现会话列表：
  - 会话标题 + 时间
  - 右键菜单（重命名/删除/置顶）
  - 搜索框

### 第二阶段：Agent 核心引擎（2-3天）
**目标：实现 AI 对话 + 工具调用**

- [ ] Gateway 服务（Electron 主进程内嵌 HTTP + WS 服务）
  - `/chat` 流式对话接口（SSE/WebSocket）
  - `/sessions` 会话 CRUD
  - `/config` 配置读写
- [ ] 模型对接：
  - OpenAI 兼容 API 调用（GLM、GPT、Claude 等）
  - 流式响应处理
  - 系统提示词管理
- [ ] 会话管理：
  - SQLite 存储会话和消息
  - 会话标题自动生成
  - 上下文窗口管理
- [ ] 工具系统：
  - 工具注册机制（name, description, parameters, handler）
  - 工具调用流程（模型 → tool_call → 执行 → 结果返回 → 模型继续）
  - 内置工具：
    - `exec`：执行 shell 命令
    - `web_search`：网页搜索
    - `web_fetch`：抓取网页
    - `read_file` / `write_file`：文件读写
    - `list_directory`：目录浏览

### 第三阶段：高级功能（3-5天）
**目标：对标 QClaw 的高级特性**

- [ ] **Markdown 渲染**：
  - 代码块语法高亮（highlight.js / Prism）
  - 表格、列表、图片
  - 流式渲染（打字机效果）
- [ ] **技能系统**（参考 OpenClaw Skills）：
  - SKILL.md 约定格式
  - 技能发现和加载
  - 技能目录管理
- [ ] **记忆系统**：
  - MEMORY.md 长期记忆
  - 每日笔记 memory/YYYY-MM-DD.md
  - 语义搜索（可选，依赖 embedding）
- [ ] **定时任务**（Cron）：
  - 定时执行 Agent 任务
  - 提醒功能
- [ ] **多 Agent 协作**：
  - 子 Agent 生成（isolated session）
  - 任务分发和结果收集
- [ ] **上下文压缩**：
  - 长对话自动摘要
  - LCM 风格的无损上下文管理

### 第四阶段：打包与优化（1-2天）
- [ ] Electron 打包（electron-builder，NSIS 安装包）
- [ ] 系统托盘集成
- [ ] 全局快捷键唤起
- [ ] 开机自启动（可选）
- [ ] 性能优化（首屏加载、消息渲染）
- [ ] 错误处理和日志

---

## 技术选型更新

| 组件 | 原方案 | 新方案 | 原因 |
|------|--------|--------|------|
| UI 库 | Tailwind CSS | Ant Design 5 | QClaw 使用 Ant Design |
| 图标 | lucide-react | @ant-design/icons | 与 Ant Design 一致 |
| Markdown | react-markdown | react-markdown + rehype-highlight | QClaw 有代码高亮 |
| 状态管理 | useState | Zustand | 轻量，适合中等规模 |
| 数据库 | 无 | better-sqlite3 | QClaw 用 SQLite 存会话 |
| 路由 | 无 | react-router | 多页面（设置/聊天） |
| 主题 | Tailwind dark mode | Ant Design ConfigProvider | 主题切换 |

## 颜色方案（参考 QClaw）

- 主色：`#1677FF`（Ant Design 默认蓝）
- 背景：`#FFFFFF`（浅色）/ `#1F1F1F`（深色）
- 侧边栏背景：`#F7F7F7`（浅色）/ `#1A1A1A`（深色）
- 用户消息气泡：`#E6F4FF`（浅蓝背景）
- AI 消息气泡：透明 / `#F0F0F0`（灰背景）
- 边框：`#F0F0F0`

---

## 文件结构

```
WdClaw/
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── index.ts           # 入口
│   │   ├── gateway.ts         # 内嵌 HTTP+WS 服务
│   │   ├── agent/             # Agent 核心
│   │   │   ├── engine.ts      # 对话引擎
│   │   │   ├── tools/         # 工具系统
│   │   │   └── prompt.ts      # 系统提示词
│   │   ├── db/                # SQLite 数据层
│   │   │   ├── index.ts
│   │   │   └── schema.ts
│   │   └── tray.ts            # 系统托盘
│   ├── preload/               # 预加载脚本
│   │   └── index.ts
│   └── renderer/              # 前端 React
│       ├── App.tsx            # 根组件
│       ├── main.tsx           # 入口
│       ├── components/
│       │   ├── Sidebar/       # 侧边栏
│       │   ├── Chat/          # 聊天区
│       │   │   ├── ChatPanel.tsx
│       │   │   ├── MessageList.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── ToolCallCard.tsx
│       │   │   └── InputArea.tsx
│       │   ├── Settings/      # 设置面板
│       │   └── common/        # 通用组件
│       ├── stores/            # Zustand 状态
│       ├── hooks/             # 自定义 Hooks
│       ├── types/             # 类型定义
│       └── styles/            # 全局样式
├── resources/
│   └── icon.svg
├── electron-builder.yml
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.main.json
```
