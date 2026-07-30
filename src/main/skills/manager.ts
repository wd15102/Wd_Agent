// ============================================================
// Skill Manager — 技能发现、加载、安装
// 参考 QClaw: 每个技能一个目录，SKILL.md 入口
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../gateway/config';
import { SKILLS_DIR } from '../../shared/constants';
import { WdClawAPI, RemoteSkill } from '../api/client';

export interface Skill {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  path: string;
  installedAt?: number;
  category?: string;
}

const BUILTIN_SKILLS: Skill[] = [];


export class SkillManager {
  private configManager: ConfigManager;
  private skillsDir: string;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.skillsDir = path.join(configManager.getDataDir(), SKILLS_DIR);
  }

  async listSkills(): Promise<Skill[]> {
    const skills: Skill[] = [...BUILTIN_SKILLS];

    // 加载用户安装的技能（从 skills 目录读取）
    try {
      if (fs.existsSync(this.skillsDir)) {
        const dirs = fs.readdirSync(this.skillsDir);
        for (const dir of dirs) {
          const skillMd = path.join(this.skillsDir, dir, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            const content = fs.readFileSync(skillMd, 'utf-8');
            const parsed = this.parseSkillMd(content);
            if (parsed) {
              skills.push({
                id: dir,
                name: parsed.name || dir,
                description: parsed.description || '',
                emoji: parsed.emoji,
                path: path.join(this.skillsDir, dir),
                category: parsed.category,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[SkillManager] 加载技能失败:', err);
    }

    return skills;
  }

  async getSkill(id: string): Promise<Skill | null> {
    // 先查内置
    const builtin = BUILTIN_SKILLS.find(s => s.id === id);
    if (builtin) return builtin;

    // 再查已安装
    const skillMd = path.join(this.skillsDir, id, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
      const content = fs.readFileSync(skillMd, 'utf-8');
      const parsed = this.parseSkillMd(content);
      return {
        id,
        name: parsed?.name || id,
        description: parsed?.description || '',
        emoji: parsed?.emoji,
        path: path.join(this.skillsDir, id),
        category: parsed?.category,
      };
    }
    return null;
  }

  async readSkillContent(id: string): Promise<string | null> {
    const skillMd = path.join(this.skillsDir, id, 'SKILL.md');
    if (fs.existsSync(skillMd)) {
      return fs.readFileSync(skillMd, 'utf-8');
    }
    return null;
  }

  // 从 SKILL.md 的 frontmatter 解析
  private parseSkillMd(content: string): { name?: string; description?: string; emoji?: string; category?: string } | null {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    if (!match) return null;

    const raw = match[1];
    const result: any = {};

    // 简单 YAML 解析
    for (const line of raw.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.substring(0, colonIdx).trim();
      const value = line.substring(colonIdx + 1).trim();
      // 去掉引号
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        result[key] = value.slice(1, -1);
      } else {
        // 处理 description: | 多行格式
        result[key] = value;
      }
    }

    return result;
  }

  // 安装技能（外部技能，复制目录）
  async installSkill(skillPath: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const skillMd = path.join(skillPath, 'SKILL.md');
      if (!fs.existsSync(skillMd)) {
        return { ok: false, error: '技能目录中没有 SKILL.md' };
      }

      const content = fs.readFileSync(skillMd, 'utf-8');
      const parsed = this.parseSkillMd(content);
      if (!parsed?.name) {
        return { ok: false, error: 'SKILL.md 缺少 name 字段' };
      }

      const id = parsed.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      const targetDir = path.join(this.skillsDir, id);

      if (!fs.existsSync(this.skillsDir)) {
        fs.mkdirSync(this.skillsDir, { recursive: true });
      }

      // 复制目录
      this.copyDir(skillPath, targetDir);

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  private copyDir(src: string, dest: string) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async uninstallSkill(id: string): Promise<{ ok: boolean; error?: string }> {
    try {
      // 不能卸载内置技能
      if (BUILTIN_SKILLS.find(s => s.id === id)) {
        return { ok: false, error: '不能卸载内置技能' };
      }
      const targetDir = path.join(this.skillsDir, id);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true });
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  // ---- 远程技能 ----

  /**
   * 获取远程技能列表
   */
  async fetchRemoteSkills(): Promise<RemoteSkill[]> {
    return WdClawAPI.fetchSkills();
  }

  /**
   * 搜索远程技能
   */
  async searchRemoteSkills(query: string): Promise<RemoteSkill[]> {
    return WdClawAPI.searchSkills(query);
  }

  /**
   * 安装远程技能到本地
   */
  async installRemoteSkill(remote: RemoteSkill): Promise<{ ok: boolean; error?: string }> {
    try {
      const id = remote.id;
      const targetDir = path.join(this.skillsDir, id);

      if (fs.existsSync(targetDir)) {
        return { ok: false, error: '技能已安装' };
      }

      if (!fs.existsSync(this.skillsDir)) {
        fs.mkdirSync(this.skillsDir, { recursive: true });
      }

      // 创建技能目录和 SKILL.md
      fs.mkdirSync(targetDir, { recursive: true });
      const skillMd = `---
name: "${remote.name}"
description: "${remote.description}"
emoji: "${remote.emoji || '📦'}"
category: "${remote.category}"
author: "${remote.author}"
version: "${remote.version}"
---

# ${remote.name}

${remote.description}

## 标签
${remote.tags.map(t => `- ${t}`).join('\n')}

## 安装来源
- 作者: ${remote.author}
- 版本: ${remote.version}
- 下载量: ${remote.downloads}
- 评分: ${remote.rating}/5
`;
      fs.writeFileSync(path.join(targetDir, 'SKILL.md'), skillMd, 'utf-8');

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * 卸载远程安装的技能
   */
  async uninstallRemoteSkill(id: string): Promise<{ ok: boolean; error?: string }> {
    const targetDir = path.join(this.skillsDir, id);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true });
      return { ok: true };
    }
    return { ok: false, error: '技能不存在' };
  }

  /**
   * 检查远程技能是否已安装
   */
  isRemoteSkillInstalled(id: string): boolean {
    const targetDir = path.join(this.skillsDir, id);
    return fs.existsSync(targetDir);
  }

  /**
   * 获取已安装的远程技能列表
   */
  getInstalledRemoteSkills(): Skill[] {
    const skills: Skill[] = [];
    try {
      if (fs.existsSync(this.skillsDir)) {
        const dirs = fs.readdirSync(this.skillsDir);
        for (const dir of dirs) {
          const skillMd = path.join(this.skillsDir, dir, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            const content = fs.readFileSync(skillMd, 'utf-8');
            const parsed = this.parseSkillMd(content);
            if (parsed) {
              skills.push({
                id: dir,
                name: parsed.name || dir,
                description: parsed.description || '',
                emoji: parsed.emoji,
                path: path.join(this.skillsDir, dir),
                category: parsed.category,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[SkillManager] 加载远程技能失败:', err);
    }
    return skills;
  }
}
