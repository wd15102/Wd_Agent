// ============================================================
// ClawHub API — 通过 clawhub CLI 与 ClawHub 注册表交互
// 解析文本输出为结构化数据，失败时回退到模拟数据
// ============================================================
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

const execAsync = promisify(exec);

export interface ClawHubSkill {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  category: string;
  tags: string[];
  homepage?: string;
  installed: boolean;
  emoji?: string;
}

export interface ClawHubExpert {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  systemPrompt: string;
  skills: string[];
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  author: string;
}

// 模拟数据（当 clawhub CLI 不可用时回退）
const MOCK_SKILLS: ClawHubSkill[] = [
  { id: 'web-search', name: 'Web Search', description: '互联网搜索技能，支持多搜索引擎', author: 'billyutw', version: '1.0.0', downloads: 39281, rating: 4.7, category: 'productivity', tags: ['搜索', 'web'], installed: false, emoji: '🔍' },
  { id: 'github', name: 'GitHub 助手', description: '搜索仓库、审查 PR、管理 Issue', author: 'wdclaw', version: '1.0.0', downloads: 25000, rating: 4.8, category: 'developer-tools', tags: ['github', 'git'], installed: false, emoji: '🐙' },
  { id: 'notion', name: 'Notion 协作', description: '读写 Notion 数据库、创建和管理文档', author: 'wdclaw', version: '1.0.0', downloads: 18000, rating: 4.6, category: 'productivity', tags: ['notion', '文档'], installed: false, emoji: '📝' },
  { id: 'translation', name: '专业翻译', description: '高质量多语言翻译，支持多种文体', author: 'wdclaw', version: '1.0.0', downloads: 22000, rating: 4.7, category: 'productivity', tags: ['翻译', '多语言'], installed: false, emoji: '🌐' },
  { id: 'image-gen', name: 'AI 绘图', description: '调用 Stable Diffusion / DALL-E 生成图片', author: 'wdclaw', version: '1.0.0', downloads: 30000, rating: 4.9, category: 'ai-intelligence', tags: ['AI', '绘图'], installed: false, emoji: '🖼' },
  { id: 'tts', name: '语音合成', description: '文字转语音，支持多语言、多音色', author: 'wdclaw', version: '1.0.0', downloads: 15000, rating: 4.5, category: 'ai-intelligence', tags: ['TTS', '语音'], installed: false, emoji: '🎤' },
  { id: 'code-test', name: '测试工程师', description: '自动生成单元测试、E2E 测试', author: 'wdclaw', version: '1.0.0', downloads: 12000, rating: 4.4, category: 'developer-tools', tags: ['测试', 'jest'], installed: false, emoji: '🧪' },
  { id: 'doc-gen', name: '文档生成器', description: '自动生成 API 文档、README、CHANGELOG', author: 'wdclaw', version: '1.0.0', downloads: 14000, rating: 4.6, category: 'developer-tools', tags: ['文档', 'API'], installed: false, emoji: '📄' },
];

/**
 * 检查 clawhub CLI 是否可用
 */
async function isClawHubAvailable(): Promise<boolean> {
  try {
    await execAsync('clawhub --cli-version');
    return true;
  } catch {
    return false;
  }
}

/**
 * 解析 clawhub search 的文本输出
 */
function parseSearchResults(text: string): ClawHubSkill[] {
  const skills: ClawHubSkill[] = [];
  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    // 格式: "slug  @author  description  downloads"
    const match = line.match(/^(\S+)\s+@(\S+)\s+(.+?)\s+(\d[\d,]*)\s*downloads?$/i);
    if (match) {
      const [, slug, author, description, downloadsStr] = match;
      skills.push({
        id: slug,
        name: slug.split('/').pop() || slug,
        description: description.trim(),
        author,
        version: '1.0.0',
        downloads: parseInt(downloadsStr.replace(/,/g, ''), 10),
        rating: 4.5,
        category: 'productivity',
        tags: [],
        installed: false,
      });
    }
  }

  return skills;
}

/**
 * 搜索 ClawHub 技能
 */
export async function searchSkills(query: string, limit = 20): Promise<ClawHubSkill[]> {
  const available = await isClawHubAvailable();
  if (!available) {
    // 回退到模拟数据
    return MOCK_SKILLS.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
    );
  }

  try {
    const { stdout } = await execAsync(`clawhub search "${query}" --limit ${limit}`, {
      timeout: 30000,
    });
    const skills = parseSearchResults(stdout);
    return skills.length > 0 ? skills : MOCK_SKILLS;
  } catch {
    return MOCK_SKILLS;
  }
}

/**
 * 浏览最新技能
 */
export async function exploreSkills(limit = 20): Promise<ClawHubSkill[]> {
  const available = await isClawHubAvailable();
  if (!available) {
    return MOCK_SKILLS;
  }

  try {
    const { stdout } = await execAsync(`clawhub explore --limit ${limit}`, {
      timeout: 30000,
    });
    const skills = parseSearchResults(stdout);
    return skills.length > 0 ? skills : MOCK_SKILLS;
  } catch {
    return MOCK_SKILLS;
  }
}

/**
 * 安装技能
 */
export async function installSkill(skillId: string): Promise<{ ok: boolean; error?: string }> {
  const available = await isClawHubAvailable();
  if (!available) {
    return { ok: false, error: 'ClawHub CLI 未安装。请运行: npm i -g clawhub' };
  }

  try {
    const skillsDir = path.join(app.getPath('home'), '.wdclaw', 'skills');
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }

    await execAsync(`clawhub install "${skillId}" --dir "${skillsDir}" --no-input`, {
      timeout: 60000,
    });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * 卸载技能
 */
export async function uninstallSkill(skillId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const skillsDir = path.join(app.getPath('home'), '.wdclaw', 'skills');
    const targetDir = path.join(skillsDir, skillId);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true });
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * 列出已安装技能
 */
export async function listInstalledSkills(): Promise<ClawHubSkill[]> {
  try {
    const skillsDir = path.join(app.getPath('home'), '.wdclaw', 'skills');
    if (!fs.existsSync(skillsDir)) {
      return [];
    }

    const dirs = fs.readdirSync(skillsDir);
    const skills: ClawHubSkill[] = [];

    for (const dir of dirs) {
      const skillMd = path.join(skillsDir, dir, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        const content = fs.readFileSync(skillMd, 'utf-8');
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);
        skills.push({
          id: dir,
          name: nameMatch?.[1]?.trim() || dir,
          description: descMatch?.[1]?.trim() || '',
          author: 'local',
          version: '1.0.0',
          downloads: 0,
          rating: 0,
          category: 'local',
          tags: [],
          installed: true,
        });
      }
    }

    return skills;
  } catch {
    return [];
  }
}

/**
 * 检查 clawhub 是否已登录
 */
export async function isClawHubLoggedIn(): Promise<boolean> {
  const available = await isClawHubAvailable();
  if (!available) return false;

  try {
    await execAsync('clawhub whoami');
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取 ClawHub 登录 URL
 */
export function getClawHubLoginUrl(): string {
  return 'https://clawhub.ai/cli/auth';
}
