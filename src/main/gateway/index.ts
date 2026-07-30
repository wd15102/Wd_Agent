// ============================================================
// Gateway — Electron 主进程内嵌 HTTP 服务
// ============================================================
import http from 'http';
import { BrowserWindow } from 'electron';
import { ConfigManager } from './config';
import { SessionManager } from './session';
import { Agent } from '../agent';
import { ToolRegistry } from '../tools/registry';
import url from 'url';

export class Gateway {
  private server: http.Server | null = null;
  private port: number;
  private mainWindow: BrowserWindow | null = null;
  private configManager: ConfigManager;
  private sessionManager: SessionManager;
  private agent: Agent;
  private toolRegistry: ToolRegistry;

  constructor(
    port: number,
    configManager: ConfigManager,
    sessionManager: SessionManager,
    agent: Agent,
    toolRegistry: ToolRegistry
  ) {
    this.port = port;
    this.configManager = configManager;
    this.sessionManager = sessionManager;
    this.agent = agent;
    this.toolRegistry = toolRegistry;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
        try {
          await this.route(req, res);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`[Gateway] 服务已启动: http://127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  stop() { if (this.server) { this.server.close(); this.server = null; } }
  getPort() { return this.port; }

  private async route(req: http.IncomingMessage, res: http.ServerResponse) {
    const parsed = url.parse(req.url || '', true);
    const path = parsed.pathname || '';
    const method = req.method || 'GET';

    if (path === '/chat' && method === 'POST') { await this.handleChatStream(req, res); return; }
    if (path === '/chat/stop' && method === 'POST') {
      this.agent.stop();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (path === '/sessions' && method === 'GET') {
      const sessions = this.sessionManager.list();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: sessions }));
      return;
    }

    if (path === '/sessions' && method === 'POST') {
      const body = await this.readJson(req);
      const session = this.sessionManager.create(body?.modelId || this.configManager.get().models.defaultModel);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: session }));
      return;
    }

    const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const sid = sessionMatch[1];
      if (method === 'GET') {
        const s = this.sessionManager.get(sid);
        res.writeHead(s ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(s ? { ok: true, data: s } : { ok: false, error: '会话不存在' }));
        return;
      }
      if (method === 'DELETE') {
        this.sessionManager.delete(sid);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (method === 'PUT') {
        const body = await this.readJson(req);
        if (body?.title) this.sessionManager.rename(sid, body.title);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    }

    if (path === '/config' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: this.configManager.get() }));
      return;
    }

    if (path === '/config' && method === 'PUT') {
      const body = await this.readJson(req);
      if (body?.key && body?.value !== undefined) {
        this.configManager.set(body.key, body.value);
        await this.configManager.save();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (path === '/tools' && method === 'GET') {
      const tools = this.toolRegistry.getDefinitions();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: tools }));
      return;
    }

    if (path === '/skills' && method === 'GET') {
      const { SkillManager } = await import('../skills/manager.js');
      const sm = new SkillManager(this.configManager);
      const skills = await sm.listSkills();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: skills }));
      return;
    }

    if (path === '/memory' && method === 'GET') {
      const { MemoryManager } = await import('../memory/manager.js');
      const mm = new MemoryManager(this.configManager);
      const memory = await mm.load();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: memory }));
      return;
    }

    if (path === '/system' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        data: {
          version: '0.1.0',
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          electronVersion: process.versions.electron,
        },
      }));
      return;
    }

    if (path === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ts: Date.now() }));
      return;
    }

    // 头像静态文件服务
    const avatarMatch = path.match(/^\/avatar\/(.+)$/);
    if (avatarMatch && method === 'GET') {
      const dataDir = this.configManager.getDataDir();
      const filename = avatarMatch[1];
      const filePath = require('path').join(dataDir, 'avatars', filename);
      if (!require('fs').existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      const ext = require('path').extname(filename).toLowerCase();
      const mimeMap: Record<string,string> = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif' };
      const mime = mimeMap[ext] || 'application/octet-stream';
      const fileBuffer = require('fs').readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      res.end(fileBuffer);
      return;
    }

    // 主题图片列表 API
    const themeListMatch = path.match(/^\/api\/themes\/([^/]+)\/files$/);
    if (themeListMatch && method === 'GET') {
      const themeId = themeListMatch[1];
      const themeDir = require('path').join(process.cwd(), 'resources', 'themes', themeId);
      if (!require('fs').existsSync(themeDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, data: [] }));
        return;
      }
      const imageExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
      const files = require('fs').readdirSync(themeDir)
        .filter((f: string) => imageExt.includes(require('path').extname(f).toLowerCase()))
        .sort()
        .map((f: string) => `http://127.0.0.1:${this.port}/themes/${themeId}/${f}`);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ ok: true, data: files }));
      return;
    }

    // 主题素材静态文件服务
    const themeMatch = path.match(/^\/themes\/(.+)$/);
    if (themeMatch && method === 'GET') {
      const themeFilePath = require('path').join(process.cwd(), 'resources', 'themes', themeMatch[1]);
      if (!require('fs').existsSync(themeFilePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      const ext = require('path').extname(themeFilePath).toLowerCase();
      const themeMimeMap: Record<string,string> = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.svg':'image/svg+xml' };
      const themeMime = themeMimeMap[ext] || 'application/octet-stream';
      const themeBuffer = require('fs').readFileSync(themeFilePath);
      res.writeHead(200, { 'Content-Type': themeMime, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
      res.end(themeBuffer);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
  }

  private async handleChatStream(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readJson(req);
    const { sessionId, message } = body;

    const session = this.sessionManager.get(sessionId);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: '会话不存在' }));
      return;
    }

    const modelConfig = this.configManager.get().models;
    const toolsConfig = this.configManager.get().tools;
    const toolDefs = this.toolRegistry.getDefinitions();

    const messages: any[] = [];
    messages.push({ role: 'system', content: this.buildSystemPrompt(toolsConfig) });
    for (const msg of session.messages) {
      if (msg.role === 'system') continue;
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: message });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    try {
      for await (const evt of this.agent.streamChat(messages, modelConfig, toolDefs, body.sessionId || '')) {
        res.write(`event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`);
      }
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    }
    res.end();
  }

  private buildSystemPrompt(toolsConfig: any): string {
    const today = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
    return `你是吴东的Claw智能助手，一个 Windows 桌面 AI 助手。
当前日期: ${today}
当前时间: ${new Date().toLocaleTimeString('zh-CN')}

你的能力:
${toolsConfig.exec?.enabled ? '- 执行 Shell 命令' : ''}
${toolsConfig.webSearch?.enabled ? '- 网页搜索' : ''}
${toolsConfig.webFetch?.enabled ? '- 网页内容抓取' : ''}
${toolsConfig.filesystem?.enabled ? '- 文件系统操作' : ''}

行为准则:
- 用中文回复
- 回答简洁实用，不啰嗦
- 执行操作前考虑安全性
- 复杂任务拆解为多个步骤

## YAGNI 懒开发原则（Ponytail）
1. 需要存在吗？不需要就跳过
2. 代码库已有？复用，不重写
3. 标准库有？用标准库
4. 平台原生支持？用原生
5. 已安装的依赖能解决？用依赖
6. 能一行搞定？一行
7. 最后才写最小可行代码

规则：不写未请求的抽象、删除优于添加、最少文件最短diff、修复根因不修症状、不简化安全措施。`;
  }

  private readJson(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); }
        catch (e) { reject(e); }
      });
      req.on('error', reject);
    });
  }
}
