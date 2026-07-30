# ============================================================
# WdClaw — 吴东的Claw智能助手
# ============================================================
# Windows 桌面 AI Agent 工具，仿 QClaw 架构
# Electron + React + Vite + TypeScript + Ant Design
# ============================================================

## ✨ 功能特性

### 🤖 核心能力
- **GLM 流式对话** — 基于智谱 GLM 的 SSE 流式对话，支持多模型切换
- **多模型管理** — 支持 GLM、LongCat、DeepSeek 等多个模型，独立配置 baseUrl/apiKey
- **工具调用** — 内置 web_search、web_fetch、exec、filesystem 等工具
- **图片理解** — 多模态模型直接看图，非多模态模型自动调用 GLM-4V 描述图片

### 🧩 技能系统
- **技能广场** — 本地技能管理 + 远程技能市场（ClawHub）
- **技能安装/卸载** — 一键安装，支持选择目标 Agent
- **MCP 协议** — 支持 JSON-RPC 2.0 的 stdio/SSE 传输，桥接外部工具

### 👥 专家系统
- **4 种 Agent 类型** — 聊天助手、代码专家、协作专家、个人助手
- **专家广场** — 本地专家 + 远程专家市场
- **Agent 详情面板** — 简介/记忆/日记/技能 4 Tab 展示
- **工具白名单** — 每个 Agent 可配置可用工具集

### ⏰ 自动化
- **定时任务** — Cron 表达式调度，30秒精度，错过自动补偿
- **工作流模板** — 从对话历史保存为可复用模板，支持条件分支和并行步骤
- **执行历史** — 完整的任务执行记录和状态追踪

### 🎨 界面与体验
- **深色/浅色主题** — 8 套内置主题（含 CodexSkin 复刻）
- **QClaw 风格侧边栏** — 专家分组对话列表，快速创建对话
- **审计日志** — 工具调用记录、自动脱敏、导出功能
- **消息通道** — Discord 适配器（可扩展飞书/微信/Telegram）

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 30+ |
| 前端 | React 18 + Vite 5 + TypeScript 5 |
| UI 库 | Ant Design 5 |
| 状态管理 | React Hooks + Context |
| 后端服务 | Node.js HTTP (Gateway :3210) |
| 模型通信 | SSE 流式 + OpenAI 兼容 API |
| 持久化 | JSON 文件 + 文件系统 |

## 📁 项目结构

```
WdClaw/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 入口、窗口管理、IPC 注册
│   │   ├── ipc.ts               # IPC 路由处理器
│   │   ├── agent/               # Agent 核心（GLM 流式调用）
│   │   ├── gateway/             # HTTP 服务（:3210）
│   │   ├── experts/             # 专家管理
│   │   ├── cron/                # 定时任务调度器
│   │   ├── workflow/            # 工作流引擎
│   │   ├── mcp/                 # MCP 协议客户端
│   │   ├── channels/            # 消息通道适配器
│   │   ├── tools/               # 工具注册表
│   │   ├── audit/               # 审计日志
│   │   └── skills/              # 技能管理
│   ├── renderer/                # 渲染进程（React）
│   │   ├── App.tsx              # 主应用、路由
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar、Header
│   │   │   ├── chat/            # ChatPanel、MessageList、InputArea
│   │   │   ├── settings/        # SettingsPanel、主题、MCP、通道
│   │   │   ├── experts/         # 专家广场、Agent 详情
│   │   │   ├── cron/            # 定时任务面板
│   │   │   ├── workflow/        # 工作流市场
│   │   │   └── skills/          # 技能广场
│   │   └── hooks/               # 自定义 Hooks
│   ├── preload/                 # 预加载脚本（IPC 桥接）
│   └── shared/                  # 共享类型和常量
├── resources/                   # 应用图标和静态资源
├── electron-builder.yml         # 打包配置
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 9+
- Windows 10/11 (x64)

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 全量开发（Electron + Vite + Gateway）
npm run dev

# 仅前端
npm run dev:vite

# 仅 Electron（需先单独跑 vite）
npm run dev:electron
```

### 打包发布
```bash
# Windows 打包（需要 npmmirror 镜像）
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm run package
```

## ⚙️ 配置说明

### 模型配置
在「设置 → 模型」中添加：
- **GLM 系列** — baseUrl: `https://open.bigmodel.cn/api/paas/v4`
- **LongCat** — baseUrl: `https://api.longcat.chat/v1`
- **DeepSeek** — baseUrl: `https://api.deepseek.com/v1`

### 定时任务 Cron 表达式
- `*/30 * * * *` — 每 30 分钟
- `0 9 * * *` — 每日 9:00
- `0 9 * * 1` — 每周一 9:00
- `0 9 1 * *` — 每月 1 号 9:00

### MCP 服务器
在「设置 → MCP 服务器」中配置：
- 支持 stdio（本地进程）和 SSE（远程服务）两种传输
- 工具自动桥接为 `mcp_{serverName}_{toolName}`

## 📊 开发进度

```
Phase 0  ✅ 事件驱动架构
Phase 1A ✅ 权限审批
Phase 1B ✅ 执行时间轴
Phase 1C ✅ 审计日志
Phase 2A ✅ Agent 类型系统
Phase 2B ✅ MCP 协议支持
Phase 2C ✅ 消息通道适配器
Phase 3A ✅ 智能调度器
Phase 3B ✅ 工作流模板
Phase 4  ⏳ Tauri 迁移（远期）
```

## 🧠 融入的 AI 规则

- [Ponytail](https://github.com/DietrichGebert/ponytail) — YAGNI 懒开发原则，融入所有专家 system prompt、工作流引擎、定时任务调度器
  - 实测效果：代码量减少 54%、Token 消耗减少 22%、成本降低 20%、时间缩短 27%

## 📝 参考项目

- [QClaw](https://github.com/openclaw/openclaw) — 架构设计参考
- [CodexSkin](https://github.com/seeyouintokyo/codexskin) — 主题复刻灵感

## 📄 许可证

MIT License

---

> ⚠️ **开发备忘**：PowerShell `Set-Content`/`Get-Content` 默认用 GBK 编码，写入 UTF-8 文件会损坏中文。永远不要用 PowerShell 处理 UTF-8 文本文件。
