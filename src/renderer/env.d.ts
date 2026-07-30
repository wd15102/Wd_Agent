/// <reference types="vite/client" />

export interface ModelConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  models: { id: string; name: string; free?: boolean }[];
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

export interface Session {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
  modelId: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  path: string;
  installedAt?: number;
  category?: string;
}

export interface MemoryData {
  longTerm: string;
  daily: { date: string; content: string; timestamp: number }[];
}

export interface CronJob {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
  lastRun?: number;
  lastStatus?: 'success' | 'error';
  runCount: number;
}

export interface ElectronAPI {
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: unknown) => Promise<{ ok: boolean }>;
  saveConfig: () => Promise<{ ok: boolean }>;

  listCronJobs: () => Promise<CronJob[]>;
  createCronJob: (job: Omit<CronJob, 'id' | 'lastRun' | 'lastStatus' | 'runCount'>) => Promise<{ ok: boolean; id: string }>;
  updateCronJob: (id: string, updates: Partial<CronJob>) => Promise<{ ok: boolean }>;
  deleteCronJob: (id: string) => Promise<{ ok: boolean }>;

  listSessions: () => Promise<Session[]>;
  createSession: (expertId?: string) => Promise<Session>;
  getSession: (id: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<{ ok: boolean }>;
  renameSession: (id: string, title: string) => Promise<{ ok: boolean }>;
  clearSession: (id: string) => Promise<{ ok: boolean }>;

  sendMessage: (sessionId: string, message: string, modelId?: string, agentIds?: string[], files?: any[]) => Promise<any>;
  stopChat: () => Promise<{ ok: boolean }>;
  onToken: (cb: (data: any) => void) => () => void;
  onReasoning: (cb: (data: any) => void) => () => void;
  onToolCall: (cb: (data: any) => void) => () => void;
  onToolResult: (cb: (data: any) => void) => () => void;
  onChatDone: (cb: (data: any) => void) => () => void;
  onChatError: (cb: (data: any) => void) => () => void;

  // 事件驱动架构新增
  onPermissionRequired: (cb: (data: { sessionId: string; request: any }) => void) => () => void;
  onPermissionResolved: (cb: (data: { sessionId: string; toolName: string; outcome: string }) => void) => () => void;
  onExecutionStep: (cb: (data: { sessionId: string; step: any }) => void) => () => void;
  onTurnStart: (cb: (data: { sessionId: string }) => void) => () => void;
  onTurnEnd: (cb: (data: { sessionId: string; status: string; iterations: number }) => void) => () => void;
  sendApprovalResponse: (toolCallId: string, outcome: 'once' | 'always' | 'deny') => Promise<{ ok: boolean }>;

  listTools: () => Promise<ToolDefinition[]>;
  executeTool: (name: string, args: Record<string, unknown>) => Promise<{ ok: boolean; result: string }>;

  listSkills: () => Promise<Skill[]>;
  installSkill: (skillPath: string) => Promise<{ ok: boolean; error?: string }>;
  uninstallSkill: (id: string) => Promise<{ ok: boolean; error?: string }>;
  readSkillContent: (id: string) => Promise<string | null>;

  loadMemory: () => Promise<MemoryData>;
  appendMemory: (content: string) => Promise<{ ok: boolean }>;
  updateLongTermMemory: (content: string) => Promise<{ ok: boolean }>;
  searchMemory: (query: string) => Promise<any[]>;

  // ---- 专家 ----
  listExperts: () => Promise<any[]>;
  getExpert: (id: string) => Promise<any>;
  createExpert: (data: any) => Promise<any>;
  updateExpert: (id: string, data: any) => Promise<any>;
  deleteExpert: (id: string) => Promise<{ ok: boolean }>;
  fetchRemoteExperts: () => Promise<any[]>;
  installRemoteExpert: (data: any) => Promise<{ ok: boolean; expert: any }>;
  uninstallRemoteExpert: (id: string) => Promise<{ ok: boolean }>;
  searchRemoteExperts: (query: string) => Promise<any[]>;
  isExpertInstalled: (id: string) => Promise<boolean>;
  getInstalledRemoteExperts: () => Promise<any[]>;

  // ---- 技能广场 ----
  fetchRemoteSkills: () => Promise<any[]>;
  searchRemoteSkills: (query: string) => Promise<any[]>;
  installRemoteSkill: (data: any) => Promise<{ ok: boolean; error?: string }>;
  uninstallRemoteSkill: (id: string) => Promise<{ ok: boolean; error?: string }>;
  isSkillInstalled: (id: string) => Promise<boolean>;
  getInstalledRemoteSkills: () => Promise<any[]>;

  getSystemInfo: () => Promise<any>;

  onNavigate: (cb: (page: string) => void) => () => void;
  onNewSession: (cb: () => void) => () => void;

  // 审计日志
  auditQuery: (options?: any) => Promise<{ events: any[]; total: number }>;
  auditStats: () => Promise<any>;
  auditGet: (id: string) => Promise<any>;
  auditClear: () => Promise<{ ok: boolean }>;
  auditExport: () => Promise<string>;

  // Agent 类型系统
  getAgentTools: (expertId: string) => Promise<string[] | undefined>;
  getFamilyInfo: (family: string) => Promise<{ label: string; color: string; icon: string; desc: string }>;
  getBuiltinAgents: () => Promise<any[]>;

  // MCP
  mcpList: () => Promise<any[]>;
  mcpConfigs: () => Promise<any[]>;
  mcpSaveConfigs: (configs: any[]) => Promise<{ ok: boolean }>;
  mcpConnect: (name: string) => Promise<{ ok: boolean }>;
  mcpDisconnect: (name: string) => Promise<{ ok: boolean }>;
  mcpConnectAll: () => Promise<{ ok: boolean }>;
  mcpGetTools: () => Promise<any[]>;

  // Channels
  channelStatuses: () => Promise<any[]>;
  channelConnect: (platform: string) => Promise<{ ok: boolean }>;
  channelDisconnect: (platform: string) => Promise<{ ok: boolean }>;
  channelSend: (platform: string, message: any) => Promise<{ ok: boolean; messageId: string | null }>;

  // Cron
  listCronJobs: () => Promise<any[]>;
  createCronJob: (data: any) => Promise<any>;
  updateCronJob: (id: string, updates: any) => Promise<any>;
  deleteCronJob: (id: string) => Promise<{ ok: boolean }>;
  runCronJob: (id: string) => Promise<{ ok: boolean }>;
  getCronHistory: (jobId?: string) => Promise<any[]>;
  clearCronHistory: (jobId?: string) => Promise<{ ok: boolean }>;
  onCronStarted: (cb: (e: any, data: any) => void) => void;
  onCronExecuted: (cb: (e: any, data: any) => void) => void;
  offCronStarted: (cb: (e: any, data: any) => void) => void;
  offCronExecuted: (cb: (e: any, data: any) => void) => void;

  // Workflows
  listWorkflows: () => Promise<any[]>;
  getWorkflow: (id: string) => Promise<any>;
  createWorkflow: (data: any) => Promise<any>;
  updateWorkflow: (id: string, updates: any) => Promise<any>;
  deleteWorkflow: (id: string) => Promise<{ ok: boolean }>;
  runWorkflow: (id: string) => Promise<{ ok: boolean; executionId: string }>;
  createWorkflowFromConversation: (name: string, desc: string, messages: any[]) => Promise<any>;
  listWorkflowExecutions: () => Promise<any[]>;
  isWorkflowRunning: (id: string) => Promise<boolean>;
  onWorkflowStarted: (cb: (e: any, data: any) => void) => void;
  onWorkflowCompleted: (cb: (e: any, data: any) => void) => void;
  onWorkflowError: (cb: (e: any, data: any) => void) => void;
  onWorkflowStep: (cb: (e: any, data: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
