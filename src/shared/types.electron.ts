// ElectronAPI 类型声明
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
  pinned?: boolean;
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

export interface Expert {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  skills: string[];
  pinned?: boolean;
  starred?: boolean;
  // Agent 类型系统
  family?: 'chat' | 'code' | 'cowork' | 'helper';
  tools?: string[];
  needsWorkspace?: boolean;
  messaging?: boolean;
  connectors?: boolean;
}

export interface RemoteExpert {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  skills: string[];
  pinned?: boolean;
  starred?: boolean;
  downloads?: number;
  rating?: number;
  tags?: string[];
  author?: string;
  category?: string;
}

export interface RemoteSkill {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  category?: string;
  author?: string;
  version?: string;
  downloads?: number;
  rating?: number;
  tags?: string[];
}

export interface ElectronAPI {
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: unknown) => Promise<{ ok: boolean }>;
  saveConfig: () => Promise<{ ok: boolean }>;

  listSessions: () => Promise<Session[]>;
  createSession: (expertId?: string) => Promise<Session>;
  getSession: (id: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<{ ok: boolean }>;
  renameSession: (id: string, title: string) => Promise<{ ok: boolean }>;
  clearSession: (id: string) => Promise<{ ok: boolean }>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<{ ok: boolean }>;

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

  // Experts
  listExperts: () => Promise<Expert[]>;
  getExpert: (id: string) => Promise<Expert>;
  createExpert: (data: Partial<Expert>) => Promise<Expert>;
  updateExpert: (id: string, data: Partial<Expert>) => Promise<Expert>;
  deleteExpert: (id: string) => Promise<{ ok: boolean }>;
  uploadExpertAvatar: (id: string, sourcePath: string) => Promise<{ ok: boolean; avatar?: string; error?: string }>;
  uploadExpertAvatarFromData: (id: string, dataUrl: string) => Promise<{ ok: boolean; avatar?: string; error?: string }>;
  cropAndUploadAvatar: (id: string, dataUrl: string) => Promise<{ ok: boolean; avatar?: string; error?: string }>;
  addSkillToExpert: (expertId: string, skillId: string) => Promise<{ ok: boolean; error?: string }>;
  removeSkillFromExpert: (expertId: string, skillId: string) => Promise<{ ok: boolean; error?: string }>;
  fetchRemoteExperts: () => Promise<RemoteExpert[]>;
  installRemoteExpert: (data: Partial<RemoteExpert>) => Promise<{ ok: boolean; expert: RemoteExpert }>;
  uninstallRemoteExpert: (id: string) => Promise<{ ok: boolean }>;
  searchRemoteExperts: (query: string) => Promise<RemoteExpert[]>;
  isExpertInstalled: (id: string) => Promise<boolean>;
  getInstalledRemoteExperts: () => Promise<RemoteExpert[]>;

  // Skills Plaza
  fetchRemoteSkills: () => Promise<RemoteSkill[]>;
  searchRemoteSkills: (query: string) => Promise<RemoteSkill[]>;
  installRemoteSkill: (data: Partial<RemoteSkill>) => Promise<{ ok: boolean; error?: string }>;
  uninstallRemoteSkill: (id: string) => Promise<{ ok: boolean; error?: string }>;
  isSkillInstalled: (id: string) => Promise<boolean>;
  getInstalledRemoteSkills: () => Promise<RemoteSkill[]>;

  // ClawHub（真实技能市场）
  clawhubSearch: (query: string, limit?: number) => Promise<any[]>;
  clawhubExplore: (limit?: number) => Promise<any[]>;
  clawhubInstall: (skillId: string) => Promise<{ ok: boolean; error?: string }>;
  clawhubUninstall: (skillId: string) => Promise<{ ok: boolean; error?: string }>;
  clawhubListInstalled: () => Promise<any[]>;
  clawhubIsLoggedIn: () => Promise<boolean>;
  clawhubGetLoginUrl: () => Promise<string>;

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
  getBuiltinAgents: () => Promise<Expert[]>;

  // MCP
  mcpList: () => Promise<MCPServerStatus[]>;
  mcpConfigs: () => Promise<MCPServerConfig[]>;
  mcpSaveConfigs: (configs: MCPServerConfig[]) => Promise<{ ok: boolean }>;
  mcpConnect: (name: string) => Promise<{ ok: boolean }>;
  mcpDisconnect: (name: string) => Promise<{ ok: boolean }>;
  mcpConnectAll: () => Promise<{ ok: boolean }>;
  mcpGetTools: () => Promise<Array<{ serverName: string; tool: MCPTool }>>;

  // Channels
  channelStatuses: () => Promise<ChannelStatus[]>;
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

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse';
  url?: string;
  enabled?: boolean;
}

export interface MCPServerStatus {
  name: string;
  connected: boolean;
  toolCount: number;
  error?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export interface ChannelStatus {
  platform: string;
  connected: boolean;
  botName?: string;
  channels?: string[];
  error?: string;
  latency?: number;
}
