// ============================================================
// 工具注册中心
// ============================================================
import { ToolDef, ToolHandler, ToolsConfig } from '../../shared/types';
import { runExec as execTool } from './exec';
import { webSearch } from './web-search';
import { webFetch } from './web-fetch';
import { filesystemRead, filesystemWrite, filesystemDir } from './filesystem';
import { imageReader } from './image-reader';

import { MCPTool } from '../mcp/client';

export class ToolRegistry {
  private tools: Map<string, { def: ToolDef; handler: ToolHandler }> = new Map();
  private mcpTools = new Map<string, { serverName: string; tool: MCPTool }>();

  registerDefaults(config: ToolsConfig): void {
    if (config.exec.enabled) {
      this.register({
        name: 'exec',
        description: '在 Windows PowerShell 中执行命令。执行长时间运行或产生大量输出的命令时，设置 background=true 在后台运行。需要终端交互的命令使用 pty=true。',
        parameters: {
          type: 'object',
          properties: {
            command: { type: 'string', description: '要执行的 PowerShell 命令' },
            workdir: { type: 'string', description: '工作目录（可选）' },
            timeout: { type: 'number', description: '超时秒数（可选，默认60）' },
            background: { type: 'boolean', description: '是否后台运行' },
          },
          required: ['command'],
        },
      }, execTool);
    }

    if (config.webSearch.enabled) {
      this.register({
        name: 'web_search',
        description: '在互联网上搜索最新信息。返回标题、URL 和摘要。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
            count: { type: 'number', description: '返回结果数量（1-10，默认5）' },
          },
          required: ['query'],
        },
      }, webSearch);
    }

    if (config.webFetch.enabled) {
      this.register({
        name: 'web_fetch',
        description: '获取网页内容，提取可读文本/ Markdown。适合读取文章、文档等。',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: '要获取的网页 URL' },
            maxChars: { type: 'number', description: '最大返回字符数（默认10000）' },
          },
          required: ['url'],
        },
      }, webFetch);
    }

    if (config.filesystem.enabled) {
      this.register({
        name: 'read',
        description: '读取文件内容。支持文本文件和图片（jpg, png, gif, webp）。',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '文件路径（绝对或相对工作区）' },
            offset: { type: 'number', description: '从第几行开始读取（1-indexed）' },
            limit: { type: 'number', description: '读取行数上限' },
          },
          required: ['path'],
        },
      }, filesystemRead);

      this.register({
        name: 'write',
        description: '将内容写入文件。自动创建父目录。',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '文件路径' },
            content: { type: 'string', description: '要写入的内容' },
          },
          required: ['path', 'content'],
        },
      }, filesystemWrite);

      this.register({
        name: 'list_dir',
        description: '列出目录内容。',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '目录路径' },
          },
          required: ['path'],
        },
      }, filesystemDir);
    }

    // 图片读取工具（始终启用）
    this.register({
      name: 'image_reader',
      description: '读取图片文件内容并用视觉模型描述。当需要查看、分析图片时使用。支持 jpg/png/gif/webp/bmp。参数：path（文件路径）、question（可选，要问图片的问题，默认为"详细描述图片内容"）。',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '图片文件路径（绝对路径或相对工作区）' },
          question: { type: 'string', description: '要问图片的问题（可选，默认详细描述所有内容）' },
        },
        required: ['path'],
      },
    }, imageReader);
  }

  // ---- MCP Tool Bridge ----

  registerMCPTools(serverName: string, tools: MCPTool[]): void {
    for (const tool of tools) {
      const fullName = `mcp_${serverName}_${tool.name}`;
      this.mcpTools.set(fullName, { serverName, tool });
      this.register({
        name: fullName,
        description: `[${serverName}] ${tool.description || tool.name}`,
        parameters: tool.inputSchema as Record<string, unknown>,
      }, async (args) => {
        const { mcpManager } = require('../mcp/manager');
        return await mcpManager.callTool(serverName, tool.name, args);
      });
    }
  }

  clearMCPTools(serverName?: string): void {
    if (serverName) {
      for (const [key, val] of this.mcpTools) {
        if (val.serverName === serverName) {
          this.mcpTools.delete(key);
          this.tools.delete(key);
        }
      }
    } else {
      for (const [key] of this.mcpTools) {
        this.tools.delete(key);
      }
      this.mcpTools.clear();
    }
  }

  getMCPTools(): Array<{ serverName: string; tool: MCPTool }> {
    return Array.from(this.mcpTools.values());
  }

  register(def: ToolDef, handler: ToolHandler): void {
    this.tools.set(def.name, { def, handler });
  }

  getDefinitions(): ToolDef[] {
    return Array.from(this.tools.values()).map((t) => t.def);
  }

  async execute(name: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`未知工具: ${name}`);
    }
    return await tool.handler(args);
  }
}
