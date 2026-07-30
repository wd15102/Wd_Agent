/**
 * 审计日志管理器 — 基于 OpenWorker audit.py 设计
 * 
 * 核心功能：
 * - SQLite 持久化所有 Agent 操作
 * - 自动脱敏 token/secret/password/api_key
 * - 支持查询、筛选、导出
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 用 better-sqlite3 还是 node:sqlite？Electron 43 支持 node:sqlite
// 降级方案：用简单的 JSON 文件模拟（无需原生模块）

export interface AuditEvent {
  id: string;
  timestamp: number;
  session_id: string;
  agent: string;
  tool: string;
  stage: 'start' | 'approval_required' | 'approved' | 'denied' | 'executed' | 'error';
  status: 'success' | 'failure' | 'denied' | 'pending';
  approval?: 'once' | 'always' | 'deny';
  args?: Record<string, any>;
  result_preview?: string;
  resource?: string;
  duration_ms?: number;
  error?: string;
}

const MAX_PARAM_LENGTH = 500;
const MAX_RESULT_LENGTH = 1000;

// 需要脱敏的字段名
const SENSITIVE_KEYS = [
  'token', 'secret', 'password', 'api_key', 'apikey',
  'access_token', 'refresh_token', 'authorization',
  'private_key', 'credential', 'auth',
];

/**
 * 递归脱敏对象中的敏感字段
 */
function redact(obj: any, depth = 0): any {
  if (depth > 5) return '[deep]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'number' && typeof obj !== 'boolean' && typeof obj !== 'object') return String(obj);

  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map(v => redact(v, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
        result[key] = '[redacted]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redact(value, depth + 1);
      } else if (typeof value === 'string' && value.length > MAX_PARAM_LENGTH) {
        result[key] = value.slice(0, MAX_PARAM_LENGTH) + '...[truncated]';
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return obj;
}

/**
 * 截断字符串
 */
function truncate(str: string, max: number): string {
  if (!str) return str;
  return str.length > max ? str.slice(0, max) + '...[truncated]' : str;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class AuditManager {
  private dataDir: string;
  private logFile: string;
  private events: AuditEvent[] = [];
  private writeTimer: NodeJS.Timeout | null = null;
  private maxEvents = 10000; // 最多保留 10000 条

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(os.homedir(), '.wdclaw');
    this.logFile = path.join(this.dataDir, 'audit-log.json');
    this.load();
  }

  /**
   * 加载已有日志
   */
  private load(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        const data = fs.readFileSync(this.logFile, 'utf-8');
        this.events = JSON.parse(data);
        if (!Array.isArray(this.events)) this.events = [];
      }
    } catch (e) {
      console.warn('[Audit] 加载日志失败，重置:', (e as Error).message);
      this.events = [];
    }
  }

  /**
   * 异步写入（防抖 500ms）
   */
  private scheduleWrite(): void {
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.flush();
    }, 500);
  }

  /**
   * 立即写入磁盘
   */
  flush(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      // 只保留最近 N 条
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }
      fs.writeFileSync(this.logFile, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Audit] 写入失败:', (e as Error).message);
    }
  }

  /**
   * 记录审计事件
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const full: AuditEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
    };

    // 脱敏处理
    if (event.args) {
      full.args = redact(event.args);
    }
    if (event.result_preview) {
      full.result_preview = truncate(event.result_preview, MAX_RESULT_LENGTH);
    }

    this.events.push(full);
    this.scheduleWrite();

    // 控制台输出（调试用）
    console.log(`[Audit] ${event.tool} | ${event.stage} | ${event.status} | session=${event.session_id}`);

    return full;
  }

  /**
   * 查询事件
   */
  query(options?: {
    sessionId?: string;
    tool?: string;
    status?: string;
    stage?: string;
    limit?: number;
    offset?: number;
    startTime?: number;
    endTime?: number;
  }): { events: AuditEvent[]; total: number } {
    let filtered = [...this.events];

    if (options?.sessionId) {
      filtered = filtered.filter(e => e.session_id === options.sessionId);
    }
    if (options?.tool) {
      filtered = filtered.filter(e => e.tool === options.tool);
    }
    if (options?.status) {
      filtered = filtered.filter(e => e.status === options.status);
    }
    if (options?.stage) {
      filtered = filtered.filter(e => e.stage === options.stage);
    }
    if (options?.startTime) {
      filtered = filtered.filter(e => e.timestamp >= options.startTime!);
    }
    if (options?.endTime) {
      filtered = filtered.filter(e => e.timestamp <= options.endTime!);
    }

    const total = filtered.length;
    // 倒序排列（最新的在前）
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    filtered = filtered.slice(offset, offset + limit);

    return { events: filtered, total };
  }

  /**
   * 获取统计信息
   */
  stats(): {
    total: number;
    byTool: Record<string, number>;
    byStatus: Record<string, number>;
    recent24h: number;
  } {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const byTool: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let recent24h = 0;

    for (const e of this.events) {
      byTool[e.tool] = (byTool[e.tool] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      if (e.timestamp >= dayAgo) recent24h++;
    }

    return { total: this.events.length, byTool, byStatus, recent24h };
  }

  /**
   * 获取单个事件详情
   */
  getEvent(id: string): AuditEvent | undefined {
    return this.events.find(e => e.id === id);
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.events = [];
    this.flush();
  }

  /**
   * 导出为 JSON
   */
  export(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

// 单例
let instance: AuditManager | null = null;

export function getAuditManager(dataDir?: string): AuditManager {
  if (!instance) {
    instance = new AuditManager(dataDir);
  }
  return instance;
}
