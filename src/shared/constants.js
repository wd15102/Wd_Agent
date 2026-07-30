"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.LOG_DIR = exports.SKILLS_DIR = exports.WORKSPACE_DIR = exports.SESSIONS_DIR = exports.CONFIG_FILE = exports.CONFIG_DIR = exports.APP_VERSION = exports.APP_NAME = void 0;
// 共享常量
exports.APP_NAME = 'WdClaw';
exports.APP_VERSION = '0.1.0';
exports.CONFIG_DIR = '.wdclaw';
exports.CONFIG_FILE = 'config.json5';
exports.SESSIONS_DIR = 'sessions';
exports.WORKSPACE_DIR = 'workspace';
exports.SKILLS_DIR = 'skills';
exports.LOG_DIR = 'logs';
exports.DEFAULT_CONFIG = {
    models: {
        provider: 'zhipu',
        apiKey: '',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        models: [
            { id: 'glm-4-flash', name: 'GLM-4-Flash', free: true },
            { id: 'glm-4.7', name: 'GLM-4.7' },
            { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash' },
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
};
//# sourceMappingURL=constants.js.map