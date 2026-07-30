// ============================================================
// Memory Manager — 长期记忆 + 每日笔记
// 参考 QClaw: MEMORY.md（长期精华）+ memory/YYYY-MM-DD.md（每日流水）
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../gateway/config';

export interface MemoryEntry {
  date: string;          // YYYY-MM-DD
  content: string;
  timestamp: number;
}

export interface MemoryData {
  longTerm: string;      // MEMORY.md 内容
  daily: MemoryEntry[];  // 最近 N 天的笔记
}

const MEMORY_FILE = 'MEMORY.md';
const MEMORY_DIR = 'memory';

export class MemoryManager {
  private configManager: ConfigManager;
  private memoryFile!: string;
  private memoryDir!: string;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    const dataDir = configManager.getDataDir();
    this.memoryFile = path.join(dataDir, MEMORY_FILE);
    this.memoryDir = path.join(dataDir, MEMORY_DIR);
  }

  async load(): Promise<MemoryData> {
    const result: MemoryData = {
      longTerm: '',
      daily: [],
    };

    // 加载长期记忆
    if (fs.existsSync(this.memoryFile)) {
      result.longTerm = fs.readFileSync(this.memoryFile, 'utf-8');
    }

    // 加载最近 30 天笔记
    if (fs.existsSync(this.memoryDir)) {
      const files = fs.readdirSync(this.memoryDir)
        .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/) && !f.startsWith('.'))
        .sort()
        .slice(-30);

      for (const file of files) {
        const content = fs.readFileSync(path.join(this.memoryDir, file), 'utf-8');
        result.daily.push({
          date: file.replace('.md', ''),
          content,
          timestamp: fs.statSync(path.join(this.memoryDir, file)).mtimeMs,
        });
      }
    }

    return result;
  }

  // 保存或更新今天的笔记
  async appendDaily(content: string): Promise<void> {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const file = path.join(this.memoryDir, `${today}.md`);

    let existing = '';
    if (fs.existsSync(file)) {
      existing = fs.readFileSync(file, 'utf-8');
    }

    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const updated = existing + `\n## ${timestamp}\n${content}\n`;

    fs.writeFileSync(file, updated, 'utf-8');
  }

  // 更新长期记忆
  async updateLongTerm(content: string): Promise<void> {
    fs.writeFileSync(this.memoryFile, content, 'utf-8');
  }

  // 搜索记忆（简单关键词匹配）
  async search(query: string): Promise<MemoryEntry[]> {
    const all = await this.load();
    const items: MemoryEntry[] = [];
    const lower = query.toLowerCase();

    // 搜长期记忆
    if (all.longTerm.toLowerCase().includes(lower)) {
      // 提取匹配段落
      const paragraphs = all.longTerm.split('\n\n');
      for (const p of paragraphs) {
        if (p.toLowerCase().includes(lower)) {
          items.push({
            date: 'long-term',
            content: p,
            timestamp: Date.now(),
          });
        }
      }
    }

    // 搜每日笔记
    for (const entry of all.daily) {
      if (entry.content.toLowerCase().includes(lower)) {
        items.push(entry);
      }
    }

    return items;
  }

  // 获取系统摘要（注入到 System Prompt 中的高价值记忆）
  async getSystemSummary(): Promise<string> {
    const data = await this.load();
    const lines: string[] = [];

    if (data.longTerm) {
      // 取前 500 字
      lines.push(`## 长期记忆\n${data.longTerm.slice(0, 500)}`);
    }

    if (data.daily.length > 0) {
      const recent = data.daily.slice(-3);
      lines.push('## 最近笔记');
      for (const entry of recent) {
        lines.push(`- [${entry.date}] ${entry.content.slice(0, 200)}`);
      }
    }

    return lines.join('\n');
  }
}
