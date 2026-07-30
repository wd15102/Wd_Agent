// ============================================================
// MCP (Model Context Protocol) Client
// JSON-RPC 2.0 over stdio + SSE
// ============================================

export interface MCPTool {
  name: string;
  displayName?: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      default?: unknown;
    }>;
    required?: string[];
  };
}

// Serena MCP 工具中文名映射
const TOOL_NAME_CN: Record<string, string> = {
  replace_content: '替换内容',
  replace_in_files: '批量替换',
  replace_symbol_body: '替换符号体',
  insert_after_symbol: '符号后插入',
  insert_before_symbol: '符号前插入',
  rename_symbol: '重命名符号',
  safe_delete_symbol: '安全删除符号',
  get_symbols_overview: '符号概览',
  find_symbol: '查找符号',
  find_referencing_symbols: '查找引用',
  find_implementations: '查找实现',
  find_declaration: '查找声明',
  get_diagnostics_for_file: '文件诊断',
  write_memory: '写入记忆',
  read_memory: '读取记忆',
  list_memories: '列出记忆',
  delete_memory: '删除记忆',
  rename_memory: '重命名记忆',
  edit_memory: '编辑记忆',
  onboarding: '入门引导',
  initial_instructions: '初始说明',
}

// Serena MCP 工具中文描述映射
const TOOL_DESC_CN: Record<string, string> = {
  // 代码编辑类
  replace_content: '替换文件中的指定内容，支持精确文本匹配',
  replace_in_files: '在多个文件中批量替换指定内容',
  replace_symbol_body: '替换整个符号（函数/类/变量）的实现体',
  insert_after_symbol: '在指定符号（函数/类等）的后面插入新代码',
  insert_before_symbol: '在指定符号（函数/类等）的前面插入新代码',
  rename_symbol: '重命名符号（函数/类/变量），自动更新所有引用',
  safe_delete_symbol: '安全删除符号，检查引用并自动清理',
  // 代码检索类
  get_symbols_overview: '获取文件的符号概览（函数/类/变量列表）',
  find_symbol: '按名称查找符号，支持模糊匹配和作用域过滤',
  find_referencing_symbols: '查找所有引用了指定符号的位置',
  find_implementations: '查找指定接口或抽象类的所有实现',
  find_declaration: '查找符号的声明位置',
  get_diagnostics_for_file: '获取文件的诊断信息（错误/警告/提示）',
  // 记忆系统类
  write_memory: '写入一条长期记忆，跨会话持久化',
  read_memory: '读取一条已保存的长期记忆',
  list_memories: '列出所有已保存的长期记忆',
  delete_memory: '删除一条长期记忆',
  rename_memory: '重命名一条长期记忆',
  edit_memory: '编辑一条长期记忆的内容',
  // 其他
  onboarding: '启动入门引导，了解项目结构和规范',
  initial_instructions: '获取初始操作指南和使用说明',
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: 'stdio' | 'sse';
  url?: string;  // for SSE transport
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

export class MCPClient {
  private server: MCPServerConfig;
  private process: import('child_process').ChildProcess | null = null;
  private msgId = 0;
  private pending = new Map<number | string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private buffer = '';
  private connected = false;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];

  constructor(server: MCPServerConfig) {
    this.server = server;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get serverName(): string {
    return this.server.name;
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  getResources(): MCPResource[] {
    return this.resources;
  }

  // ---- Connection ----

  async connect(): Promise<void> {
    if (this.server.transport === 'sse') {
      await this.connectSSE();
    } else {
      await this.connectStdio();
    }
  }

  private async connectStdio(): Promise<void> {
    const { spawn } = require('child_process') as typeof import('child_process');
    this.process = spawn(this.server.command, this.server.args || [], {
      env: { ...process.env, ...this.server.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout!.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr!.on('data', (_data: Buffer) => {
      // stderr is for logging, not JSON-RPC
    });

    this.process.on('exit', () => {
      this.connected = false;
      this.process = null;
    });

    // Initialize
    const initResult = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'wdclaw', version: '0.1.0' },
    }) as { capabilities?: { tools?: object; resources?: object } };

    this.connected = true;

    // Send initialized notification
    this.notify('notifications/initialized', {});

    // List tools and resources
    if (initResult?.capabilities?.tools) {
      await this.listTools();
    }
    if (initResult?.capabilities?.resources) {
      await this.listResources();
    }
  }

  private async connectSSE(): Promise<void> {
    // SSE transport: connect to HTTP endpoint
    const url = this.server.url || `http://localhost:3000/sse`;
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      });
      if (!resp.ok) throw new Error(`SSE connect failed: ${resp.status}`);
      this.connected = true;

      // Initialize via POST
      const postUrl = url.replace('/sse', '/message');
      const initResp = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.nextId(),
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'wdclaw', version: '0.1.0' },
          },
        }),
      });
      if (!initResp.ok) throw new Error(`SSE init failed: ${initResp.status}`);
      await this.listTools();
      await this.listResources();
    } catch (err) {
      this.connected = false;
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
    this.pending.clear();
  }

  // ---- JSON-RPC ----

  private nextId(): number {
    return ++this.msgId;
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Content-Length header parsing
      if (trimmed.toLowerCase().startsWith('content-length:')) {
        continue;
      }

      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse;
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  private request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId();
    const req: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      if (this.process?.stdin) {
        const message = JSON.stringify(req) + '\n';
        this.process.stdin.write(message, 'utf-8', (err: Error | null | undefined) => {
          if (err) {
            this.pending.delete(id);
            reject(err);
          }
        });
      } else if (this.server.transport === 'sse') {
        this.requestSSE(req).then(resolve).catch(reject);
      } else {
        this.pending.delete(id);
        reject(new Error('Not connected'));
      }

      // Timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  private async requestSSE(req: JsonRpcRequest): Promise<unknown> {
    const url = (this.server.url || 'http://localhost:3000/sse').replace('/sse', '/message');
      const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!resp.ok) throw new Error(`SSE request failed: ${resp.status}`);
    return await resp.json();
  }

  private notify(method: string, params?: Record<string, unknown>): void {
    if (this.process?.stdin) {
      const message = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
      this.process.stdin.write(message);
    }
  }

  // ---- MCP Methods ----

  async listTools(): Promise<MCPTool[]> {
    try {
      const result = await this.request('tools/list', {}) as { tools?: MCPTool[] };
      const raw = result?.tools || [];
      // 翻译工具名称为中文
      this.tools = raw.map(t => ({
        ...t,
        displayName: TOOL_NAME_CN[t.name] || t.name,
        description: TOOL_DESC_CN[t.name] || t.description,
      }));
      return this.tools;
    } catch {
      return [];
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await this.request('tools/call', { name, arguments: args }) as {
      content?: Array<{ type: string; text?: string }>;
      isError?: boolean;
    };

    if (result?.isError) {
      const errText = result.content?.map(c => c.text).join('') || 'Unknown error';
      throw new Error(`MCP tool error: ${errText}`);
    }

    if (result?.content) {
      return result.content
        .filter(c => c.type === 'text')
        .map(c => c.text || '')
        .join('\n');
    }
    return '';
  }

  async listResources(): Promise<MCPResource[]> {
    try {
      const result = await this.request('resources/list', {}) as { resources?: MCPResource[] };
      this.resources = result?.resources || [];
      return this.resources;
    } catch {
      return [];
    }
  }

  async readResource(uri: string): Promise<string> {
    const result = await this.request('resources/read', { uri }) as {
      contents?: Array<{ text?: string; uri: string }>;
    };
    return result?.contents?.map(c => c.text || '').join('\n') || '';
  }
}
