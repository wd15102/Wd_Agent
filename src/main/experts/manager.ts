// ============================================================
// Expert Manager — 专家角色管理
// 参考 QClaw: agents.list 多 Agent 配置
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../gateway/config';
import { WdClawAPI, RemoteExpert } from '../api/client';

// 解析头像路径为可加载的 URL（相对路径 → HTTP URL，避免 file:/// 被 Electron 安全策略阻止）
function resolveAvatar(avatar: string | undefined, _dataDir: string): string | undefined {
  if (!avatar) return undefined;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('file://')) return avatar;
  // 直接用 Gateway 静态文件服务：http://127.0.0.1:3210/avatar/<filename>
  return `http://127.0.0.1:3210/avatar/${path.basename(avatar)}`;
}

export interface Expert {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  avatar?: string;
  avatarUrl?: string;
  systemPrompt: string;
  skills: string[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  builtin?: boolean;
  category?: string;
  tags?: string[];
  popular?: boolean;
  featured?: boolean;
  createdAt?: number;
  updatedAt?: number;
  // Agent 类型系统（Phase 2A）
  family?: 'chat' | 'code' | 'cowork' | 'helper';
  tools?: string[];
  needsWorkspace?: boolean;
  messaging?: boolean;
  connectors?: boolean;
}

// ============================================================
// Ponytail YAGNI 规则 — 融入所有专家系统提示词
// ============================================================
const PONYTAIL_RULES = `

## YAGNI 懒开发原则（Ponytail 规则）
在编写代码或解决问题时，遵循以下阶梯（从高到低优先级）：
1. 需要存在吗？→ 不需要就跳过（YAGNI）
2. 代码库已有？→ 复用，不重写
3. 标准库有？→ 用标准库
4. 平台原生支持？→ 用原生（如 <input type="date"> 而非日期选择器组件）
5. 已安装的依赖能解决？→ 用依赖
6. 能一行搞定？→ 一行
7. 最后才写：最小可行代码

规则：
- 不写未请求的抽象：一个实现的接口、一个产品的工厂、不变值的配置
- 删除优于添加。无聊优于巧妙。
- 最少文件、最短 diff 获胜（但只在理解问题后）
- 修复 Bug = 根因修复，不是症状修复
- 不简化：信任边界验证、数据丢失防护、安全措施、无障碍基础
- 用 \`ponytail:\` 注释标记有意简化的代码（如 \`# ponytail: 全局锁，高并发时改细粒度锁\`）
`;

const BUILTIN_EXPERTS: Expert[] = [
  {
    id: 'agent-chat',
    name: '聊天助手',
    description: '纯对话模式，适合日常问答、知识查询、闲聊',
    emoji: '💬',
    systemPrompt: '你是一个友好、专业的 AI 助手。请用简洁专业的中文回答问题，提供具体可执行的方案。' + PONYTAIL_RULES,
    skills: [],
    builtin: true,
    category: '基础',
    family: 'chat',
    tools: ['web_search', 'web_fetch'],
    needsWorkspace: false,
    messaging: false,
    connectors: false,
  },
  {
    id: 'agent-code',
    name: '代码专家',
    description: '代码编写、调试、重构，支持文件读写和执行命令',
    emoji: '💻',
    systemPrompt: '你是一个专业的代码专家。擅长编写、调试和重构代码。你可以读写文件、执行命令来完成任务。' + PONYTAIL_RULES,
    skills: [],
    builtin: true,
    category: '开发',
    family: 'code',
    tools: ['read', 'write', 'list_dir', 'exec', 'web_search', 'web_fetch'],
    needsWorkspace: true,
    messaging: false,
    connectors: false,
  },
  {
    id: 'agent-cowork',
    name: '协作专家',
    description: '全功能协作模式，支持文件、命令、搜索、消息通道',
    emoji: '🤝',
    systemPrompt: '你是一个全功能协作助手。你可以读写文件、执行命令、搜索网页、管理日程。请高效完成复杂任务。' + PONYTAIL_RULES,
    skills: [],
    builtin: true,
    category: '高级',
    family: 'cowork',
    tools: ['read', 'write', 'list_dir', 'exec', 'web_search', 'web_fetch', 'image_reader'],
    needsWorkspace: true,
    messaging: true,
    connectors: true,
  },
  {
    id: 'agent-helper',
    name: '个人助手',
    description: '个人日常助手，管理日程、提醒、笔记',
    emoji: '🧠',
    systemPrompt: '你是用户的个人日常助手。帮助管理日程、设置提醒、记录笔记、搜索信息。' + PONYTAIL_RULES,
    skills: [],
    builtin: true,
    category: '生活',
    family: 'helper',
    tools: ['read', 'write', 'list_dir', 'web_search', 'web_fetch'],
    needsWorkspace: false,
    messaging: true,
    connectors: false,
  },
];


export class ExpertManager {
  private configManager: ConfigManager;
  private expertsFile: string;
  private experts: Expert[] = [];
  private skillLoader?: (skillId: string) => Promise<string | null>;

  constructor(configManager: ConfigManager, skillLoader?: (skillId: string) => Promise<string | null>) {
    this.configManager = configManager;
    this.expertsFile = path.join(configManager.getDataDir(), 'experts.json');
    this.skillLoader = skillLoader;
    this.loadExperts();
  }

  private loadExperts(): void {
    try {
      if (fs.existsSync(this.expertsFile)) {
        const data = JSON.parse(fs.readFileSync(this.expertsFile, 'utf-8'));
        this.experts = data.experts || [];
      }
    } catch (e) {
      console.error('[ExpertManager] 加载专家列表失败:', e);
    }

    // 确保内置专家始终存在
    for (const builtin of BUILTIN_EXPERTS) {
      if (!this.experts.find(e => e.id === builtin.id)) {
        this.experts.unshift(builtin);
      }
    }
    this.saveExperts();
  }

  private saveExperts(): void {
    try {
      fs.writeFileSync(this.expertsFile, JSON.stringify({ experts: this.experts }, null, 2));
    } catch (e) {
      console.error('[ExpertManager] 保存专家列表失败:', e);
    }
  }

  listExperts(): Expert[] {
    return this.experts.map(e => ({
      ...e,
      avatarUrl: resolveAvatar(e.avatar, this.configManager.getDataDir()),
    }));
  }

  getExpert(id: string): Expert | undefined {
    const expert = this.experts.find(e => e.id === id);
    if (!expert) return undefined;
    return {
      ...expert,
      avatarUrl: resolveAvatar(expert.avatar, this.configManager.getDataDir()),
    };
  }

  createExpert(data: Omit<Expert, 'id' | 'createdAt' | 'updatedAt' | 'builtin'>): Expert {
    const expert: Expert = {
      ...data,
      id: `expert-${Date.now()}`,
      builtin: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.experts.push(expert);
    this.saveExperts();
    return expert;
  }

  updateExpert(id: string, data: Partial<Expert>): Expert | null {
    const idx = this.experts.findIndex(e => e.id === id);
    if (idx < 0) return null;
    this.experts[idx] = { ...this.experts[idx], ...data, updatedAt: Date.now() };
    this.saveExperts();
    return this.experts[idx];
  }

  deleteExpert(id: string): boolean {
    const expert = this.experts.find(e => e.id === id);
    if (!expert) return false;
    this.experts = this.experts.filter(e => e.id !== id);
    this.saveExperts();
    return true;
  }

  // 获取专家的系统提示词（用于 Agent 调用，含关联技能）
  getSystemPrompt(expertId: string): string {
    const expert = this.getExpert(expertId);
    if (!expert) {
      return '你是一个友好、专业的 AI 助手。请用简洁专业的中文回答问题，提供具体可执行的方案。' + PONYTAIL_RULES;
    }
    let prompt = expert.systemPrompt || '你是一个友好、专业的 AI 助手。请用简洁专业的中文回答问题，提供具体可执行的方案。';
    // 加载专家关联的技能到 system prompt
    if (expert.skills && expert.skills.length > 0) {
      const skillsDir = path.join(this.configManager.getDataDir(), 'skills');
      const skillContents: string[] = [];
      for (const skillId of expert.skills) {
        const skillMd = path.join(skillsDir, skillId, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          try {
            const content = fs.readFileSync(skillMd, 'utf-8');
            skillContents.push(content);
          } catch {}
        }
      }
      if (skillContents.length > 0) {
        prompt += '\n\n## 专业技能（Agent 必读）\n';
        prompt += '你具备以下专业技能。每个技能都包含具体的执行步骤，告诉你要用哪些工具（exec/read/web_search/web_fetch/write）来完成。\n';
        prompt += '**执行规则**：\n';
        prompt += '1. 当用户的需求匹配某个技能的触发条件时，严格按照该技能的「执行步骤」操作\n';
        prompt += '2. 技能中的 bash 命令用 exec 工具运行，文件操作用 read/write 工具完成\n';
        prompt += '3. 先读 SKILL.md 再动手，不要凭记忆猜测\n';
        prompt += '4. 技能执行失败时重试 2 次，仍失败则告知用户\n\n';
        prompt += skillContents.map((c, i) => `### 技能 ${i + 1}\n${c}`).join('\n\n');
      }
    }
    return prompt;
  }

  // 获取专家对应的模型配置
  getModelConfig(expertId: string): { modelId?: string; temperature?: number; maxTokens?: number } {
    const expert = this.getExpert(expertId);
    if (!expert) return {};
    return {
      modelId: expert.modelId,
      temperature: expert.temperature,
      maxTokens: expert.maxTokens,
    };
  }

  // ---- Agent 类型系统（Phase 2A） ----

  /**
   * 获取 Agent 允许的工具列表
   */
  getAgentTools(expertId: string): string[] | undefined {
    const expert = this.getExpert(expertId);
    if (!expert) return undefined;
    return expert.tools;
  }

  /**
   * 获取 Agent 家族信息
   */
  getFamilyInfo(family: string): { label: string; color: string; icon: string; desc: string } {
    const map: Record<string, { label: string; color: string; icon: string; desc: string }> = {
      chat: { label: '聊天', color: '#52c41a', icon: '💬', desc: '纯对话模式' },
      code: { label: '代码', color: '#1677ff', icon: '💻', desc: '代码编写与调试' },
      cowork: { label: '协作', color: '#722ed1', icon: '🤝', desc: '全功能协作' },
      helper: { label: '助手', color: '#fa8c16', icon: '🧠', desc: '个人日常助手' },
    };
    return map[family] || { label: family, color: '#8c8c8c', icon: '🤖', desc: '' };
  }

  /**
   * 获取所有内置 Agent（按 family 分类）
   */
  getBuiltinAgents(): Expert[] {
    return this.experts.filter(e => e.builtin);
  }

  // ---- 远程专家 ----

  /**
   * 获取远程专家列表
   */
  async fetchRemoteExperts(): Promise<RemoteExpert[]> {
    return WdClawAPI.fetchExperts();
  }

  /**
   * 安装远程专家到本地
   */
  installRemoteExpert(remote: RemoteExpert): Expert {
    // 检查是否已安装
    const existing = this.experts.find(e => e.id === remote.id);
    if (existing) return existing;

    const expert: Expert = {
      id: remote.id,
      name: remote.name,
      description: remote.description,
      emoji: remote.emoji,
      systemPrompt: remote.systemPrompt,
      skills: remote.skills || [],
      modelId: remote.modelId,
      temperature: remote.temperature,
      maxTokens: remote.maxTokens,
      builtin: false,
      category: remote.category,
      tags: remote.tags,
      popular: remote.popular,
      featured: remote.featured,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.experts.push(expert);
    this.saveExperts();
    return expert;
  }

  /**
   * 卸载远程安装的专家
   */
  uninstallRemoteExpert(id: string): boolean {
    const expert = this.experts.find(e => e.id === id);
    if (!expert || expert.builtin) return false;
    this.experts = this.experts.filter(e => e.id !== id);
    this.saveExperts();
    return true;
  }

  /**
   * 搜索远程专家
   */
  async searchRemoteExperts(query: string): Promise<RemoteExpert[]> {
    const all = await this.fetchRemoteExperts();
    const q = query.toLowerCase();
    return all.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * 获取远程专家详情
   */
  async fetchRemoteExpertDetail(id: string): Promise<RemoteExpert | null> {
    return WdClawAPI.fetchExpertDetail(id);
  }

  /**
   * 检查远程专家是否已安装到本地
   */
  isRemoteExpertInstalled(id: string): boolean {
    return !!this.experts.find(e => e.id === id);
  }

  /**
   * 获取已安装的远程专家列表
   */
  getInstalledRemoteExperts(): Expert[] {
    return this.experts.filter(e => !e.builtin);
  }

  /**
   * 为专家添加技能
   */
  addSkillToExpert(expertId: string, skillId: string): boolean {
    const expert = this.experts.find(e => e.id === expertId);
    if (!expert) return false;
    if (!expert.skills) expert.skills = [];
    if (expert.skills.includes(skillId)) return true;
    expert.skills.push(skillId);
    expert.updatedAt = Date.now();
    this.saveExperts();
    return true;
  }

  /**
   * 移除专家的技能
   */
  removeSkillFromExpert(expertId: string, skillId: string): boolean {
    const expert = this.experts.find(e => e.id === expertId);
    if (!expert) return false;
    expert.skills = (expert.skills || []).filter(s => s !== skillId);
    expert.updatedAt = Date.now();
    this.saveExperts();
    return true;
  }
}
