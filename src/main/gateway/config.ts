// ============================================================
// 配置管理器
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { WdClawConfig } from '../../shared/types';
import { DEFAULT_CONFIG, CONFIG_DIR, CONFIG_FILE } from '../../shared/constants';

export class ConfigManager {
  private config: WdClawConfig;
  private dataDir: string;
  private configPath: string;

  constructor() {
    this.dataDir = path.join(app.getPath('home'), CONFIG_DIR);
    this.configPath = path.join(this.dataDir, CONFIG_FILE);
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as WdClawConfig;
  }

  getDataDir(): string {
    return this.dataDir;
  }

  async load(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(raw);
        this.config = this.deepMerge(
          JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
          loaded
        ) as WdClawConfig;
      } else {
        await this.save();
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  async save(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  }

  get(): WdClawConfig {
    return this.config;
  }

  set(key: string, value: unknown): void {
    const keys = key.split('.');
    let target: any = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
