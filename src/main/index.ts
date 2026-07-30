// ============================================================
// Electron 主进程入口
// ============================================================
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ConfigManager } from './gateway/config';
import { SessionManager } from './gateway/session';
import { Agent } from './agent';
import { ToolRegistry } from './tools/registry';
import { Gateway } from './gateway';
import { CronManager } from './cron/manager';
import { WorkflowManager } from './workflow/manager';
import { setupIpcHandlers } from './ipc';
import { mcpManager } from './mcp/manager';
import { channelManager } from './channels/manager';
import { DiscordAdapter } from './channels/discord';
import { APP_NAME } from '../shared/constants';
import { ExpertManager } from './experts/manager';
import { SkillManager } from './skills/manager';

const isDev = !app.isPackaged;
const GATEWAY_PORT = 3210;
const PID_FILE = path.join(os.tmpdir(), 'wdclaw-app.pid');

function writePidFile() {
  try { fs.writeFileSync(PID_FILE, String(process.pid)); } catch {}
}

function cleanupPidFile() {
  try { fs.unlinkSync(PID_FILE); } catch {}
}

/**
 * 启动时清理残留的孤儿 Electron 进程。
 * 两步检查：(1) PID 文件记录的进程是否还存活 (2) 扫描所有同名 Electron 进程
 * 确保 reliable — 开发模式下 concurrently 重启、直接关闭再启动都能正确清理。
 */
async function killOrphanProcesses() {
  const { execSync } = await import('child_process');

  // 第一步：读取 PID 文件（快速路径）
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      if (pid && pid !== process.pid) {
        try {
          execSync(`tasklist /FI "PID eq ${pid}" 2>nul | findstr /I "electron.exe"`, { timeout: 3000 });
          // 找到了，杀掉它
          execSync(`taskkill /f /pid ${pid} 2>nul`, { timeout: 3000 });
        } catch {
          // 进程不存在，忽略
        }
      }
    }
  } catch {}

  // 第二步：扫描所有同名 Electron 进程（兜底，PID 文件不存在或损坏时也能工作）
  try {
    const output = execSync(
      `tasklist /FI "IMAGENAME eq electron.exe" /FO CSV /NH 2>nul`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const currentPid = process.pid.toString();
    for (const line of lines) {
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
      // CSV 格式: "electron.exe","1234","Session Name","Session#","Mem Usage"
      if (parts.length >= 2 && parts[0].toLowerCase() === 'electron.exe') {
        const pid = parts[1];
        if (pid !== currentPid) {
          try { execSync(`taskkill /f /pid ${pid} 2>nul`, { timeout: 3000 }); } catch {}
        }
      }
    }
  } catch {}

  // 等待进程释放锁
  await new Promise(r => setTimeout(r, 300));
}


let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let gateway: Gateway | null = null;
let isQuitting = false;
let cronManager: CronManager;
let workflowManager: WorkflowManager;
let configManager: ConfigManager;
let sessionManager: SessionManager;
let agent: Agent;
let toolRegistry: ToolRegistry;
let expertManager: ExpertManager;
let skillManager: SkillManager;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    title: APP_NAME,
    icon: path.join(__dirname, '../../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#f7f7f8',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    if (isDev || !configManager.get().system.startMinimized) {
      mainWindow?.show();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && !configManager.get().system.quitOnClose) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../../resources/tray-icon.png');
  try {
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip(APP_NAME);

    const contextMenu = Menu.buildFromTemplate([
      { label: '显示 吴东的Claw智能助手', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: '新建对话', click: () => { mainWindow?.webContents.send('session:new'); mainWindow?.show(); } },
      { type: 'separator' },
      { label: '设置', click: () => { mainWindow?.webContents.send('navigate', '/settings'); mainWindow?.show(); } },
      { type: 'separator' },
      { label: '退出', click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (err) {
    console.warn('[Tray] 加载托盘图标失败:', err);
  }
}

async function initialize() {
  configManager = new ConfigManager();
  await configManager.load();

  sessionManager = new SessionManager(configManager.getDataDir());
  await sessionManager.loadSessions();

  toolRegistry = new ToolRegistry();
  toolRegistry.registerDefaults(configManager.get().tools);

  agent = new Agent(configManager, toolRegistry);

  // 初始化技能管理器
  skillManager = new SkillManager(configManager);

  // 初始化专家管理器（注入技能加载器）
  expertManager = new ExpertManager(configManager, async (skillId: string) => {
    return skillManager.readSkillContent(skillId);
  });

  // 初始化定时任务管理器
  cronManager = new CronManager(configManager, sessionManager, agent, toolRegistry);
  cronManager.setMainWindow(mainWindow!);
  await cronManager.load();

  // 初始化工作流管理器
  workflowManager = new WorkflowManager(configManager, agent, toolRegistry);
  workflowManager.setMainWindow(mainWindow!);
  await workflowManager.load();

  // ✅ 先注册 IPC 处理器（窗口可能立刻调用）
  setupIpcHandlers(ipcMain, mainWindow!, configManager, sessionManager, agent, toolRegistry, cronManager, expertManager, workflowManager);

  // 再启动 Gateway 服务
  gateway = new Gateway(GATEWAY_PORT, configManager, sessionManager, agent, toolRegistry);
  gateway.setMainWindow(mainWindow!);
  await gateway.start();

  // 启动 MCP Server 连接
  const mcpConfigs = configManager.get().mcpServers || [];
  if (mcpConfigs.length > 0) {
    mcpManager.setConfigs(mcpConfigs.filter((c: any) => c.enabled !== false));
    mcpManager.connectAll().then(() => {
      // Register MCP tools into tool registry
      for (const [name, client] of mcpManager.getServers()) {
        if (client.isConnected) {
          toolRegistry.registerMCPTools(name, client.getTools());
        }
      }
    });
  }

  // 初始化消息通道
  const channelConfigs = configManager.get().channels || {};
  if (channelConfigs.discord?.enabled && channelConfigs.discord?.token) {
    const discordAdapter = new DiscordAdapter({
      enabled: true,
      token: channelConfigs.discord.token,
      appId: channelConfigs.discord.appId || '',
      guildId: channelConfigs.discord.guildId,
      prefix: channelConfigs.discord.prefix || '!',
    });
    channelManager.register(discordAdapter);
    channelManager.connectAll().catch(err => {
      console.error('[App] Discord 连接失败:', err.message);
    });
  }

  // 设置消息处理器 — 将通道消息路由到 Agent
  channelManager.onMessage(async (event, adapter) => {
    console.log(`[Channel] ${adapter.platform} 收到消息:`, event.text);
    // TODO: 将消息路由到 Agent 处理
  });

  channelManager.onInteraction(async (event, adapter) => {
    console.log(`[Channel] ${adapter.platform} 交互事件:`, event.action);
    // TODO: 处理审批/选择交互
  });
}

app.whenReady().then(async () => {
  // 启动前清理孤儿进程
  await killOrphanProcesses();

  // 单实例锁 — 防止多开导致端口冲突
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    console.log('[App] 已有另一个实例在运行，退出');
    app.quit();
    return;
  }

  createWindow();
  createTray();
  await initialize();
  writePidFile();
});

app.on('second-instance', () => {
  // 第二个实例尝试启动时，显示已有窗口
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { /* 留在托盘 */ }
});

app.on('before-quit', () => {
  cleanupPidFile();
  sessionManager?.saveAllSessions();
  gateway?.stop();
});

app.on('activate', () => {
  if (mainWindow === null) { createWindow(); }
  else { mainWindow.show(); }
});
