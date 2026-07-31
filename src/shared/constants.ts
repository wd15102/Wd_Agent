// 共享常量
export const APP_NAME = '吴东的Claw智能助手';
export const APP_VERSION = '0.1.0';
export const CONFIG_DIR = '.wdclaw';
export const CONFIG_FILE = 'config.json5';
export const SESSIONS_DIR = 'sessions';
export const WORKSPACE_DIR = 'workspace';
export const SKILLS_DIR = 'skills';
export const LOG_DIR = 'logs';

export const DEFAULT_CONFIG = {
  models: {
    provider: 'zhipu',
    apiKey: '',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-flash', name: 'GLM-4-Flash', free: true, provider: 'zhipu', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', apiKey: '' },
      { id: 'glm-4.7', name: 'GLM-4.7', provider: 'zhipu', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', apiKey: '' },
      { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', provider: 'zhipu', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', apiKey: '' },
    ],
    defaultModel: 'glm-4-flash',
    maxTokens: 4096,
    temperature: 0.7,
  },
  tools: {
    exec: { enabled: true },
    webSearch: { enabled: true, provider: 'duckduckgo' },
    webFetch: { enabled: true },
    filesystem: { enabled: true, workspace: '' },
  },
  sessions: {
    maxHistory: 100,
    autoSave: true,
  },
  ui: {
    theme: 'dark',
    fontSize: 14,
    showTimestamps: true,
    compactMode: false,
  },
  system: {
    autoStart: false,
    startMinimized: true,
    quitOnClose: false,
    locale: 'zh-CN',
    logLevel: 'info',
  },
  cron: {
    jobs: [],
  },
  mcpServers: [],
  channels: {
    discord: { enabled: false, token: '', appId: '', prefix: '!' },
  },
  workflows: {
    templates: [],
  },
  loopDetection: {
    enabled: true,
    historySize: 30,
    warningThreshold: 10,
    unknownToolThreshold: 10,
    criticalThreshold: 20,
    globalCircuitBreakerThreshold: 30,
    detectors: {
      genericRepeat: true,
      knownPollNoProgress: true,
      pingPong: true,
    },
  },
};
