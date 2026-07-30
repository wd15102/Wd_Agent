// ============================================================
// CronManager — 智能调度器 v2
// ============================================================
// 增强：30秒tick循环 | 错过补偿 | 重叠保护 | 执行历史
// ============================================================
import { CronJobConfig } from '../../shared/types';
import { ConfigManager } from '../gateway/config';
import { SessionManager } from '../gateway/session';
import { Agent } from '../agent';
import { ToolRegistry } from '../tools/registry';
import { BrowserWindow } from 'electron';
import { generateId } from '../../shared/utils';

/** 执行历史记录 */
interface ExecutionRecord {
  jobId: string;
  jobName: string;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'success' | 'error' | 'skipped';
  error?: string;
  output?: string;     // 输出摘要
}

const MAX_HISTORY_PER_JOB = 50;
const TICK_INTERVAL_MS = 30000; // 30 秒

export class CronManager {
  private config: ConfigManager;
  private sessions: SessionManager;
  private agent: Agent;
  private tools: ToolRegistry;
  private mainWindow: BrowserWindow | null = null;
  private jobs = new Map<string, CronJobConfig>();
  private running = new Set<string>(); // 正在执行的任务 ID
  private history: ExecutionRecord[] = [];
  private tickTimer: NodeJS.Timer | null = null;

  constructor(config: ConfigManager, sessions: SessionManager, agent: Agent, tools: ToolRegistry) {
    this.config = config;
    this.sessions = sessions;
    this.agent = agent;
    this.tools = tools;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  // ---- 生命周期 ----

  async load(): Promise<void> {
    const stored = this.config.get().cron?.jobs || [];
    for (const job of stored) {
      this.jobs.set(job.id, job);
    }

    // 错过补偿：启动时检查是否有过期未执行的任务
    this.catchUpMissedJobs();

    // 启动 30 秒 tick 循环
    this.startTickLoop();

    console.log(`[Cron] 已加载 ${this.jobs.size} 个任务，tick 循环已启动`);
  }

  unload(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  // ---- Tick 循环 ----

  private startTickLoop(): void {
    this.tickTimer = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);
  }

  private tick(): void {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (!job.enabled) continue;
      if (this.running.has(job.id)) continue; // 重叠保护

      if (this.shouldRun(job, now)) {
        this.executeJob(job.id).catch(console.error);
      }
    }
  }

  private shouldRun(job: CronJobConfig, now: number): boolean {
    const interval = this.parseCronToMs(job.schedule);
    if (!interval) return false;

    // 首次运行
    if (!job.lastRun) return true;

    // 距离上次执行是否超过间隔
    return (now - job.lastRun) >= interval;
  }

  // ---- 错过补偿 ----

  private catchUpMissedJobs(): void {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (!job.enabled) continue;
      if (!job.lastRun) continue;

      const interval = this.parseCronToMs(job.schedule);
      if (!interval) continue;

      const overdue = now - job.lastRun;
      // 超过间隔的 2 倍视为错过
      if (overdue > interval * 2) {
        console.log(`[Cron] 错过补偿: ${job.name} (逾期 ${Math.round(overdue / 60000)} 分钟)`);
        this.executeJob(job.id).catch(console.error);
      }
    }
  }

  // ---- CRUD ----

  list(): CronJobConfig[] {
    return Array.from(this.jobs.values());
  }

  async create(data: Omit<CronJobConfig, 'id' | 'lastRun' | 'lastStatus' | 'runCount'>): Promise<CronJobConfig> {
    const job: CronJobConfig = {
      ...data,
      id: generateId(),
      runCount: 0,
    };
    this.jobs.set(job.id, job);
    await this.save();
    return job;
  }

  async update(id: string, updates: Partial<CronJobConfig>): Promise<CronJobConfig | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    const updated = { ...job, ...updates };
    this.jobs.set(id, updated);
    await this.save();
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.jobs.delete(id);
    await this.save();
  }

  /** 手动触发执行 */
  async runNow(id: string): Promise<void> {
    if (this.running.has(id)) throw new Error('任务正在执行中');
    await this.executeJob(id);
  }

  // ---- 执行 ----

  private async executeJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job || !job.enabled) return;

    // 重叠保护
    if (this.running.has(id)) {
      this.addHistory({
        jobId: id,
        jobName: job.name,
        startedAt: Date.now(),
        status: 'skipped',
        error: '上一次执行尚未完成，跳过本次',
      });
      return;
    }

    this.running.add(id);
    const startTime = Date.now();

    const record: ExecutionRecord = {
      jobId: id,
      jobName: job.name,
      startedAt: startTime,
      status: 'running',
    };
    this.addHistory(record);

    // 通知前端开始执行
    this.mainWindow?.webContents.send('cron:started', {
      jobId: id,
      jobName: job.name,
    });

    try {
      const modelConfig = this.config.get().models;
      const toolDefs = this.tools.getDefinitions();

      const messages: any[] = [
        { role: 'system', content: `你是吴东的Claw智能助手定时任务执行器。请完成以下任务：` },
        { role: 'user', content: job.prompt },
      ];

      let fullContent = '';
      for await (const evt of this.agent.streamChat(messages, modelConfig, toolDefs, `cron_${id}`)) {
        if (evt.type === 'assistant_delta') {
          fullContent += evt.text;
        }
      }

      // 更新任务状态
      await this.update(id, {
        lastRun: startTime,
        lastStatus: 'success',
        runCount: (job.runCount || 0) + 1,
      });

      // 更新历史
      record.status = 'success';
      record.completedAt = Date.now();
      record.output = fullContent.slice(0, 200) || '(无输出)';

      this.mainWindow?.webContents.send('cron:executed', {
        jobId: id,
        jobName: job.name,
        status: 'success',
        duration: Date.now() - startTime,
        output: fullContent.slice(0, 500),
      });

      console.log(`[Cron] 任务完成: ${job.name} (${Date.now() - startTime}ms)`);
    } catch (err: any) {
      await this.update(id, {
        lastRun: startTime,
        lastStatus: 'error',
        runCount: (job.runCount || 0) + 1,
      });

      record.status = 'error';
      record.completedAt = Date.now();
      record.error = err.message;

      this.mainWindow?.webContents.send('cron:executed', {
        jobId: id,
        jobName: job.name,
        status: 'error',
        error: err.message,
        duration: Date.now() - startTime,
      });

      console.error(`[Cron] 任务失败: ${job.name} - ${err.message}`);
    } finally {
      this.running.delete(id);
    }
  }

  // ---- 历史记录 ----

  getHistory(jobId?: string): ExecutionRecord[] {
    if (jobId) {
      return this.history.filter(r => r.jobId === jobId);
    }
    return [...this.history];
  }

  private addHistory(record: ExecutionRecord): void {
    this.history.unshift(record);
    // 限制总历史数
    if (this.history.length > this.jobs.size * MAX_HISTORY_PER_JOB) {
      this.history = this.history.slice(0, this.jobs.size * MAX_HISTORY_PER_JOB);
    }
  }

  clearHistory(jobId?: string): void {
    if (jobId) {
      this.history = this.history.filter(r => r.jobId !== jobId);
    } else {
      this.history = [];
    }
  }

  // ---- 工具方法 ----

  private async save(): Promise<void> {
    const jobs = Array.from(this.jobs.values());
    this.config.set('cron.jobs', jobs);
    await this.config.save();
  }

  /** 解析 cron 表达式为毫秒间隔 */
  private parseCronToMs(schedule: string): number | null {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 5) return null;

    const [min, hour, day, month, week] = parts;

    // */N * * * * — 每 N 分钟
    if (min.startsWith('*/') && hour === '*' && day === '*' && month === '*' && week === '*') {
      const n = parseInt(min.slice(2), 10);
      if (!isNaN(n) && n > 0) return n * 60 * 1000;
    }

    // 0 9 * * * — 每日9点 = 24小时
    if (!min.includes('/') && !hour.includes('/') && day === '*' && month === '*' && week === '*') {
      return 24 * 60 * 60 * 1000;
    }

    // 0 9 * * 1 — 每周一9点 = 7天
    if (!min.includes('/') && !hour.includes('/') && day === '*' && month === '*' && week !== '*') {
      return 7 * 24 * 60 * 60 * 1000;
    }

    // 0 9 1 * * — 每月1号9点 = 30天
    if (!min.includes('/') && !hour.includes('/') && day !== '*' && month === '*' && week === '*') {
      return 30 * 24 * 60 * 60 * 1000;
    }

    // 默认 1 小时
    return 60 * 60 * 1000;
  }
}
