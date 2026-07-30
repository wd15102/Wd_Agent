// ============================================================
// MCP Server Manager
// 管理多个 MCP Server 的生命周期
// ============================================

import { MCPClient, MCPServerConfig, MCPTool } from './client';

export interface MCPServerStatus {
  name: string;
  connected: boolean;
  toolCount: number;
  error?: string;
}

export class MCPManager {
  private servers = new Map<string, MCPClient>();
  private configs: MCPServerConfig[] = [];

  // ---- Config ----

  setConfigs(configs: MCPServerConfig[]): void {
    this.configs = configs;
  }

  getConfigs(): MCPServerConfig[] {
    return this.configs;
  }

  // ---- Lifecycle ----

  async connectAll(): Promise<void> {
    for (const cfg of this.configs) {
      await this.connectServer(cfg);
    }
  }

  async connectServer(cfg: MCPServerConfig): Promise<boolean> {
    // Disconnect existing if any
    const existing = this.servers.get(cfg.name);
    if (existing) {
      await existing.disconnect();
    }

    const client = new MCPClient(cfg);
    try {
      await client.connect();
      this.servers.set(cfg.name, client);
      return true;
    } catch (err) {
      console.error(`[MCP] Failed to connect ${cfg.name}:`, err);
      this.servers.delete(cfg.name);
      return false;
    }
  }

  async disconnectServer(name: string): Promise<void> {
    const client = this.servers.get(name);
    if (client) {
      await client.disconnect();
      this.servers.delete(name);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [name] of this.servers) {
      await this.disconnectServer(name);
    }
  }

  async reconnectServer(name: string): Promise<boolean> {
    const cfg = this.configs.find(c => c.name === name);
    if (!cfg) return false;
    return await this.connectServer(cfg);
  }

  // ---- Tools ----

  getAllTools(): Array<{ serverName: string; tool: MCPTool }> {
    const result: Array<{ serverName: string; tool: MCPTool }> = [];
    for (const [name, client] of this.servers) {
      if (client.isConnected) {
        for (const tool of client.getTools()) {
          result.push({ serverName: name, tool });
        }
      }
    }
    return result;
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const client = this.servers.get(serverName);
    if (!client || !client.isConnected) {
      throw new Error(`MCP server ${serverName} not connected`);
    }
    return await client.callTool(toolName, args);
  }

  // ---- Status ----

  getStatuses(): MCPServerStatus[] {
    const statuses: MCPServerStatus[] = [];
    for (const cfg of this.configs) {
      const client = this.servers.get(cfg.name);
      statuses.push({
        name: cfg.name,
        connected: client?.isConnected || false,
        toolCount: client?.getTools().length || 0,
      });
    }
    return statuses;
  }

  getServers(): Map<string, MCPClient> {
    return this.servers;
  }

  getServer(name: string): MCPClient | undefined {
    return this.servers.get(name);
  }

  getConnectedCount(): number {
    let count = 0;
    for (const [, client] of this.servers) {
      if (client.isConnected) count++;
    }
    return count;
  }
}

// Singleton
export const mcpManager = new MCPManager();
