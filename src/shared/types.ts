// ============================================================
// 共享类型定义
// ============================================================

// --- 消息 ---
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | any[];
  timestamp: number;
  toolCalls?: ToolCall[];
  thinking?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

// --- 会话 ---
export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
  expertId?: string;
  pinned?: boolean;
}

// --- 配置 ---
export interface WdClawConfig {
  models: ModelConfig;
  tools: ToolsConfig;
  sessions: SessionsConfig;
  ui: UIConfig;
  system: SystemConfig;
  cron: CronConfig;
  mcpServers: MCPServerConfig[];
  channels: ChannelConfigMap;
  workflows: WorkflowsConfig;
}

export interface ModelConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  models: ModelInfo[];
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  baseUrl?: string;
  apiKey?: string;
  free?: boolean;
  provider?: string;
  maxTokens?: number;
  temperature?: number;
  description?: string;
  emoji?: string;
  multimodal?: boolean;
}

export interface ToolsConfig {
  exec: { enabled: boolean };
  webSearch: { enabled: boolean; provider: string };
  webFetch: { enabled: boolean };
  filesystem: { enabled: boolean; workspace: string };
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse';
  url?: string;
  enabled?: boolean;
}

export interface ChannelConfigMap {
  discord?: {
    enabled: boolean;
    token: string;
    appId: string;
    guildId?: string;
    prefix?: string;
  };
}

export interface WorkflowsConfig {
  templates: WorkflowTemplateConfig[];
}

export interface WorkflowTemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  steps: WorkflowStepConfig[];
  createdAt: number;
  updatedAt: number;
  runCount: number;
  source?: 'local' | 'imported' | 'conversation';
  version: number;
}

export interface WorkflowStepConfig {
  id: string;
  type: 'prompt' | 'tool' | 'condition' | 'parallel';
  label: string;
  description?: string;
  prompt?: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  next?: string;
  retries?: number;
  timeout?: number;
}

export interface SessionsConfig {
  maxHistory: number;
  autoSave: boolean;
}

export interface UIConfig {
  theme: 'dark' | 'light';
  fontSize: number;
  showTimestamps: boolean;
  compactMode: boolean;
}

export interface SystemConfig {
  autoStart: boolean;
  startMinimized: boolean;
  quitOnClose: boolean;
  locale: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface CronConfig {
  jobs: CronJobConfig[];
}

export interface CronJobConfig {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
  lastRun?: number;
  lastStatus?: 'success' | 'error';
  runCount: number;
}

// --- IPC ---
export interface IPCMessage {
  type: string;
  payload?: unknown;
}

export interface IPCResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface StreamToken {
  type: 'token' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'reasoning';
  content: string;
  toolCall?: ToolCall;
  error?: string;
}

// ============================================================
// 事件驱动架构 — WdClawEvent
// ============================================================

/** 执行步骤（可视化时间轴） */
export interface ExecutionStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'file_read' | 'file_write' | 'search' | 'command' | 'done' | 'error';
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  startedAt?: number;
  endedAt?: number;
  duration?: number;
  toolCall?: ToolCall;
}

/** 审批请求 */
export interface PermissionRequest {
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  toolCallId?: string;
}

/** 审批结果 */
export type PermissionOutcome = 'once' | 'always' | 'deny';

/** 工具权限等级 */
export type ToolPermissionLevel = 'auto' | 'ask' | 'deny';

/** WdClaw 核心事件流 */
export type WdClawEvent =
  | { type: 'turn_start'; input: string; sessionId: string }
  | { type: 'assistant_delta'; text: string }
  | { type: 'reasoning_delta'; text: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'tool_finished'; toolCallId: string; result: string }
  | { type: 'permission_required'; request: PermissionRequest }
  | { type: 'permission_resolved'; toolName: string; outcome: PermissionOutcome }
  | { type: 'execution_step'; step: ExecutionStep }
  | { type: 'turn_end'; status: string; iterations: number }
  | { type: 'error'; error: string; errorType: string }
  | { type: 'interrupted'; iterations: number }
  | { type: 'model_switched'; model: string; reason: string }
  | { type: 'max_iterations_warning' };

/** 工具权限配置 */
export interface ToolPermissionConfig {
  [toolName: string]: ToolPermissionLevel;
}

// --- Agent ---
export interface AgentRequest {
  sessionId: string;
  messages: { role: string; content: string }[];
  model: string;
  tools?: ToolDef[];
  stream?: boolean;
}

export interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
}

// --- Tool ---
export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;
