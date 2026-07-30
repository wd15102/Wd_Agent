// ============================================================
// Preload 脚本 - 安全的 IPC 桥接
// ============================================================
import { contextBridge, ipcRenderer } from 'electron';
import type { Session } from '../shared/types.electron';
import type { ElectronAPI as ElectronAPITypes } from '../shared/types.electron';

const electronAPI: ElectronAPITypes = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
  saveConfig: () => ipcRenderer.invoke('config:save'),

  listSessions: () => ipcRenderer.invoke('session:list'),
  createSession: (expertId?: string) => ipcRenderer.invoke('session:create', expertId),
  getSession: (id) => ipcRenderer.invoke('session:get', id),
  deleteSession: (id) => ipcRenderer.invoke('session:delete', id),
  renameSession: (id, title) => ipcRenderer.invoke('session:rename', id, title),
  clearSession: (id) => ipcRenderer.invoke('session:clear', id),
  updateSession: (id: string, updates: Partial<Session>) => ipcRenderer.invoke('session:update', id, updates),

  sendMessage: (sessionId, message, modelId, agentIds, files) => ipcRenderer.invoke('chat:send', sessionId, message, modelId, agentIds, files),
  stopChat: () => ipcRenderer.invoke('chat:stop'),

  onToken: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:token', handler);
    return () => ipcRenderer.removeListener('chat:token', handler);
  },
  onReasoning: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:reasoning', handler);
    return () => ipcRenderer.removeListener('chat:reasoning', handler);
  },
  onToolCall: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:tool_call', handler);
    return () => ipcRenderer.removeListener('chat:tool_call', handler);
  },
  onToolResult: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:tool_result', handler);
    return () => ipcRenderer.removeListener('chat:tool_result', handler);
  },
  onChatDone: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:done', handler);
    return () => ipcRenderer.removeListener('chat:done', handler);
  },
  onChatError: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:error', handler);
    return () => ipcRenderer.removeListener('chat:error', handler);
  },

  // 事件驱动架构新增
  onPermissionRequired: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:permission_required', handler);
    return () => ipcRenderer.removeListener('chat:permission_required', handler);
  },
  onPermissionResolved: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:permission_resolved', handler);
    return () => ipcRenderer.removeListener('chat:permission_resolved', handler);
  },
  onExecutionStep: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:execution_step', handler);
    return () => ipcRenderer.removeListener('chat:execution_step', handler);
  },
  onTurnStart: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:turn_start', handler);
    return () => ipcRenderer.removeListener('chat:turn_start', handler);
  },
  onTurnEnd: (cb) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('chat:turn_end', handler);
    return () => ipcRenderer.removeListener('chat:turn_end', handler);
  },
  sendApprovalResponse: (toolCallId: string, outcome: 'once' | 'always' | 'deny') =>
    ipcRenderer.invoke('tool:approval_response', toolCallId, outcome),

  listTools: () => ipcRenderer.invoke('tools:list'),
  executeTool: (name, args) => ipcRenderer.invoke('tool:execute', name, args),

  listSkills: () => ipcRenderer.invoke('skills:list'),
  installSkill: (skillPath) => ipcRenderer.invoke('skills:install', skillPath),
  uninstallSkill: (id) => ipcRenderer.invoke('skills:uninstall', id),
  readSkillContent: (id) => ipcRenderer.invoke('skills:read', id),

  loadMemory: () => ipcRenderer.invoke('memory:load'),
  appendMemory: (content) => ipcRenderer.invoke('memory:append', content),
  updateLongTermMemory: (content) => ipcRenderer.invoke('memory:updateLongTerm', content),
  searchMemory: (query) => ipcRenderer.invoke('memory:search', query),

  // Experts
  listExperts: () => ipcRenderer.invoke('expert:list'),
  getExpert: (id) => ipcRenderer.invoke('expert:get', id),
  createExpert: (data) => ipcRenderer.invoke('expert:create', data),
  updateExpert: (id, data) => ipcRenderer.invoke('expert:update', id, data),
  deleteExpert: (id) => ipcRenderer.invoke('expert:delete', id),
  uploadExpertAvatar: (id, sourcePath) => ipcRenderer.invoke('expert:uploadAvatar', id, sourcePath),
  uploadExpertAvatarFromData: (id, dataUrl) => ipcRenderer.invoke('expert:uploadAvatarFromData', id, dataUrl),
  cropAndUploadAvatar: (id, dataUrl) => ipcRenderer.invoke('expert:cropAndUploadAvatar', id, dataUrl),
  addSkillToExpert: (expertId, skillId) => ipcRenderer.invoke('expert:addSkill', expertId, skillId),
  removeSkillFromExpert: (expertId, skillId) => ipcRenderer.invoke('expert:removeSkill', expertId, skillId),
  fetchRemoteExperts: () => ipcRenderer.invoke('expert:fetchRemote'),
  installRemoteExpert: (data) => ipcRenderer.invoke('expert:installRemote', data),
  uninstallRemoteExpert: (id) => ipcRenderer.invoke('expert:uninstallRemote', id),
  searchRemoteExperts: (query) => ipcRenderer.invoke('expert:searchRemote', query),
  isExpertInstalled: (id) => ipcRenderer.invoke('expert:isInstalled', id),
  getInstalledRemoteExperts: () => ipcRenderer.invoke('expert:getInstalled'),

  fetchRemoteSkills: () => ipcRenderer.invoke('skills:fetchRemote'),
  searchRemoteSkills: (query) => ipcRenderer.invoke('skills:searchRemote', query),
  installRemoteSkill: (data) => ipcRenderer.invoke('skills:installRemote', data),
  uninstallRemoteSkill: (id) => ipcRenderer.invoke('skills:uninstallRemote', id),
  isSkillInstalled: (id) => ipcRenderer.invoke('skills:isInstalled', id),
  getInstalledRemoteSkills: () => ipcRenderer.invoke('skills:getInstalled'),

  // ClawHub（真实技能市场）
  clawhubSearch: (query: string, limit?: number) => ipcRenderer.invoke('clawhub:search', query, limit),
  clawhubExplore: (limit?: number) => ipcRenderer.invoke('clawhub:explore', limit),
  clawhubInstall: (skillId: string) => ipcRenderer.invoke('clawhub:install', skillId),
  clawhubUninstall: (skillId: string) => ipcRenderer.invoke('clawhub:uninstall', skillId),
  clawhubListInstalled: () => ipcRenderer.invoke('clawhub:listInstalled'),
  clawhubIsLoggedIn: () => ipcRenderer.invoke('clawhub:isLoggedIn'),
  clawhubGetLoginUrl: () => ipcRenderer.invoke('clawhub:getLoginUrl'),

  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  onNavigate: (cb) => {
    const handler = (_: any, page: string) => cb(page);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
  onNewSession: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('session:new', handler);
    return () => ipcRenderer.removeListener('session:new', handler);
  },

  // 审计日志
  auditQuery: (options) => ipcRenderer.invoke('audit:query', options),
  auditStats: () => ipcRenderer.invoke('audit:stats'),
  auditGet: (id) => ipcRenderer.invoke('audit:get', id),
  auditClear: () => ipcRenderer.invoke('audit:clear'),
  auditExport: () => ipcRenderer.invoke('audit:export'),

  // Agent 类型系统
  getAgentTools: (expertId) => ipcRenderer.invoke('agent:getTools', expertId),
  getFamilyInfo: (family) => ipcRenderer.invoke('agent:getFamilyInfo', family),
  getBuiltinAgents: () => ipcRenderer.invoke('agent:getBuiltin'),

  // MCP
  mcpList: () => ipcRenderer.invoke('mcp:list'),
  mcpConfigs: () => ipcRenderer.invoke('mcp:configs'),
  mcpSaveConfigs: (configs) => ipcRenderer.invoke('mcp:saveConfigs', configs),
  mcpConnect: (name) => ipcRenderer.invoke('mcp:connect', name),
  mcpDisconnect: (name) => ipcRenderer.invoke('mcp:disconnect', name),
  mcpConnectAll: () => ipcRenderer.invoke('mcp:connectAll'),
  mcpGetTools: () => ipcRenderer.invoke('mcp:getTools'),

  // Channels
  channelStatuses: () => ipcRenderer.invoke('channel:statuses'),
  channelConnect: (platform) => ipcRenderer.invoke('channel:connect', platform),
  channelDisconnect: (platform) => ipcRenderer.invoke('channel:disconnect', platform),
  channelSend: (platform, message) => ipcRenderer.invoke('channel:send', platform, message),

  // Cron
  listCronJobs: () => ipcRenderer.invoke('cron:list'),
  createCronJob: (data) => ipcRenderer.invoke('cron:create', data),
  updateCronJob: (id, updates) => ipcRenderer.invoke('cron:update', id, updates),
  deleteCronJob: (id) => ipcRenderer.invoke('cron:delete', id),
  runCronJob: (id) => ipcRenderer.invoke('cron:runNow', id),
  getCronHistory: (jobId?) => ipcRenderer.invoke('cron:getHistory', jobId),
  clearCronHistory: (jobId?) => ipcRenderer.invoke('cron:clearHistory', jobId),
  onCronStarted: (cb) => ipcRenderer.on('cron:started', (_e, data) => cb(_e, data)),
  onCronExecuted: (cb) => ipcRenderer.on('cron:executed', (_e, data) => cb(_e, data)),
  offCronStarted: (cb) => ipcRenderer.off('cron:started', (_e, data) => cb(_e, data)),
  offCronExecuted: (cb) => ipcRenderer.off('cron:executed', (_e, data) => cb(_e, data)),

  // Workflows
  listWorkflows: () => ipcRenderer.invoke('workflow:list'),
  getWorkflow: (id) => ipcRenderer.invoke('workflow:get', id),
  createWorkflow: (data) => ipcRenderer.invoke('workflow:create', data),
  updateWorkflow: (id, updates) => ipcRenderer.invoke('workflow:update', id, updates),
  deleteWorkflow: (id) => ipcRenderer.invoke('workflow:delete', id),
  runWorkflow: (id) => ipcRenderer.invoke('workflow:run', id),
  createWorkflowFromConversation: (name, desc, messages) => ipcRenderer.invoke('workflow:fromConversation', name, desc, messages),
  listWorkflowExecutions: () => ipcRenderer.invoke('workflow:executions'),
  isWorkflowRunning: (id) => ipcRenderer.invoke('workflow:isRunning', id),
  onWorkflowStarted: (cb) => ipcRenderer.on('workflow:started', (_e, data) => cb(_e, data)),
  onWorkflowCompleted: (cb) => ipcRenderer.on('workflow:completed', (_e, data) => cb(_e, data)),
  onWorkflowError: (cb) => ipcRenderer.on('workflow:error', (_e, data) => cb(_e, data)),
  onWorkflowStep: (cb) => ipcRenderer.on('workflow:step', (_e, data) => cb(_e, data)),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
