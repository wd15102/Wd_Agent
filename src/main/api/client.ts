// ============================================================
// WdClaw API Client — 在线专家 & 技能数据
// 参考 QClaw: 远程 CDN 加载专家广场数据
// ============================================================
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export interface RemoteExpert {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  avatar?: string;
  systemPrompt: string;
  skills: string[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  category: string;
  tags: string[];
  featured?: boolean;
  popular?: boolean;
  version?: string;
  downloads?: number;
  rating?: number;
  author?: string;
}

export interface RemoteSkill {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  category: string;
  tags: string[];
  homepage?: string;
  installed?: boolean;
}

// 模拟在线数据 — 实际部署时替换为 CDN 地址
const MOCK_EXPERTS: RemoteExpert[] = [
  {
    id: 'expert_code_review',
    name: 'Code Reviewer',
    description: '专业的代码审查专家，帮你发现代码中的潜在问题、性能瓶颈和安全漏洞。',
    emoji: '🔎',
    systemPrompt: '你是一位资深的 Code Review 专家。请仔细审查每一行代码，关注：\n1. 代码正确性和逻辑错误\n2. 性能优化机会\n3. 安全漏洞（SQL注入、XSS等）\n4. 代码风格和可读性\n5. 边界条件和错误处理\n6. 给出具体的改进建议和代码示例',
    skills: ['code-executor', 'web-search'],
    category: 'coding',
    tags: ['代码审查', '质量', '安全'],
    popular: true,
    rating: 4.8,
    downloads: 15200,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_sql_master',
    name: 'SQL 大师',
    description: '数据库优化专家，精通 MySQL、PostgreSQL、MongoDB 等数据库设计和 SQL 优化。',
    emoji: '🗄',
    systemPrompt: '你是一位数据库专家，精通各种数据库系统。请：\n1. 帮助设计和优化数据库表结构\n2. 编写高效的 SQL 查询\n3. 分析慢查询并提供优化方案\n4. 处理大数据量的分页和索引策略\n5. 考虑数据一致性和事务处理',
    skills: ['code-executor', 'web-search'],
    category: 'coding',
    tags: ['数据库', 'SQL', 'MySQL', 'PostgreSQL'],
    popular: true,
    rating: 4.7,
    downloads: 12800,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_legal_advisor',
    name: '法律顾问',
    description: '专业法律咨询助手，擅长合同审查、法律风险分析和法规解读。',
    emoji: '⚖️',
    systemPrompt: '你是一位专业的法律顾问。请：\n1. 审查合同条款，识别风险点\n2. 解读法律法规，提供专业意见\n3. 提醒用户正式法律文件需执业律师审核\n4. 用通俗易懂的法律语言解释\n5. 关注数据隐私、知识产权等常见问题',
    skills: ['web-search', 'web-fetch', 'memory-keeper'],
    category: 'productivity',
    tags: ['法律', '合同', '风险', '合规'],
    featured: true,
    rating: 4.9,
    downloads: 18500,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_marketing_guru',
    name: '营销大师',
    description: '数字营销专家，精通内容营销、社交媒体运营、SEO/SEM 和数据分析。',
    emoji: '📣',
    systemPrompt: '你是一位经验丰富的数字营销专家。请：\n1. 制定整合营销策略\n2. 优化内容营销方案\n3. 提供 SEO/SEM 优化建议\n4. 设计社交媒体运营计划\n5. 基于数据做营销决策',
    skills: ['web-search', 'web-fetch', 'code-executor'],
    category: 'writing',
    tags: ['营销', '内容', 'SEO', '社交'],
    featured: true,
    rating: 4.6,
    downloads: 14300,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_design_thinker',
    name: '设计思维导师',
    description: '用设计思维方法论帮你解决复杂问题，从用户洞察到原型验证。',
    emoji: '🎨',
    systemPrompt: '你是一位设计思维导师。请：\n1. 引导用户使用设计思维五步法\n2. 帮助进行用户研究和需求分析\n3. 组织头脑风暴和创意工作坊\n4. 设计原型和用户测试方案\n5. 关注用户体验和可用性',
    skills: ['web-search', 'web-fetch', 'memory-keeper'],
    category: 'design',
    tags: ['设计思维', 'UX', '创新', '原型'],
    rating: 4.5,
    downloads: 9200,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_financial_analyst',
    name: '财务分析师',
    description: '专业财务分析助手，擅长报表分析、财务建模、投资估值和风险管理。',
    emoji: '💰',
    systemPrompt: '你是一位专业的财务分析师。请：\n1. 分析财务报表，提取关键指标\n2. 构建财务预测模型\n3. 进行投资估值分析\n4. 识别财务风险和机会\n5. 用可视化呈现财务数据',
    skills: ['code-executor', 'web-search', 'web-fetch'],
    category: 'analysis',
    tags: ['财务', '报表', '投资', '风险'],
    popular: true,
    rating: 4.7,
    downloads: 11500,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_language_coach',
    name: '语言教练',
    description: '多语言学习教练，提供口语练习、语法纠正、写作润色等语言学习支持。',
    emoji: '🗣',
    systemPrompt: '你是一位耐心的语言学习教练。请：\n1. 根据学习者水平调整教学方式\n2. 提供地道的表达和用法\n3. 纠正语法和发音错误\n4. 设计练习和复习计划\n5. 中英日韩法等多语言支持',
    skills: ['web-search', 'memory-keeper'],
    category: 'education',
    tags: ['语言', '英语', '学习', '口语'],
    rating: 4.8,
    downloads: 16200,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_project_manager',
    name: '项目管理者',
    description: 'PMP 认证的项目管理专家，精通敏捷开发、风险管理和团队协调。',
    emoji: '📋',
    systemPrompt: '你是一位资深项目管理专家。请：\n1. 制定项目计划和时间表\n2. 识别和管理项目风险\n3. 协调跨团队沟通协作\n4. 跟踪项目进度，及时调整\n5. 运用敏捷方法论提效',
    skills: ['web-search', 'memory-keeper', 'code-executor'],
    category: 'productivity',
    tags: ['项目管理', '敏捷', '风险', '团队'],
    rating: 4.6,
    downloads: 10800,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_ai_engineer',
    name: 'AI 工程师',
    description: '机器学习专家，精通模型训练、Prompt Engineering 和 AI 应用开发。',
    emoji: '🧠',
    systemPrompt: '你是一位资深 AI 工程师。请：\n1. 帮助设计机器学习解决方案\n2. 优化 Prompt Engineering 策略\n3. 处理数据预处理和特征工程\n4. 调优模型超参数\n5. 部署和监控 AI 系统',
    skills: ['code-executor', 'web-search', 'web-fetch'],
    category: 'coding',
    tags: ['AI', 'ML', '深度学习', 'Prompt'],
    featured: true,
    popular: true,
    rating: 4.9,
    downloads: 21000,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_ecommerce_ops',
    name: '电商运营专家',
    description: '电商全渠道运营助手，精通淘宝/京东/抖音/拼多多平台的运营策略。',
    emoji: '🛒',
    systemPrompt: '你是一位电商运营专家。请：\n1. 制定全渠道电商运营策略\n2. 优化产品详情页和转化路径\n3. 分析竞品和市场趋势\n4. 提供客服话术和售后方案\n5. 数据驱动的精细化运营',
    skills: ['web-search', 'web-fetch', 'code-executor'],
    category: 'productivity',
    tags: ['电商', '淘宝', '抖音', '运营'],
    rating: 4.5,
    downloads: 8700,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_psychologist',
    name: '心理健康教练',
    description: '应用心理学知识，帮助缓解压力、改善情绪管理和人际关系。',
    emoji: '🧘',
    systemPrompt: '你是一位心理健康支持者。请：\n1. 运用认知行为疗法技巧\n2. 提供正念冥想指导\n3. 帮助识别和调整负面思维\n4. 明确建议严重情况寻求专业帮助\n5. 关注工作生活平衡',
    skills: ['web-search', 'memory-keeper'],
    category: 'productivity',
    tags: ['心理', '健康', '情绪', '压力'],
    rating: 4.7,
    downloads: 13400,
    author: 'WdClaw Team',
  },
  {
    id: 'expert_data_visualization',
    name: '数据可视化专家',
    description: '用图表讲故事，精通 ECharts、D3.js 和 Python 可视化工具链。',
    emoji: '📉',
    systemPrompt: '你是一位数据可视化专家。请：\n1. 推荐最适合的图表类型\n2. 用 ECharts/D3.js 生成可视化\n3. 确保数据故事清晰有效\n4. 注意配色和排版美观\n5. 生成可交互的数据看板',
    skills: ['code-executor', 'web-search'],
    category: 'analysis',
    tags: ['可视化', 'ECharts', 'D3', '图表'],
    popular: true,
    rating: 4.6,
    downloads: 9800,
    author: 'WdClaw Team',
  },
];

const MOCK_SKILLS: RemoteSkill[] = [
  {
    id: 'skill_github',
    name: 'GitHub 助手',
    description: '搜索仓库、审查 PR、管理 Issue、查看 CI 状态等 GitHub 操作。',
    emoji: '🐙',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 25000,
    rating: 4.8,
    category: 'developer-tools',
    tags: ['github', 'git', 'CI/CD', 'PR'],
    homepage: 'https://github.com',
  },
  {
    id: 'skill_notion',
    name: 'Notion 协作',
    description: '读写 Notion 数据库、创建和管理文档、设置自动化工作流。',
    emoji: '📝',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 18000,
    rating: 4.6,
    category: 'productivity',
    tags: ['notion', '文档', '数据库', '协作'],
  },
  {
    id: 'skill_translation_pro',
    name: '专业翻译',
    description: '高质量多语言翻译，支持技术文档、文学、商务等多种文体。',
    emoji: '🌐',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 22000,
    rating: 4.7,
    category: 'productivity',
    tags: ['翻译', '多语言', '文档', '本地化'],
  },
  {
    id: 'skill_image_gen',
    name: 'AI 绘图',
    description: '调用 Stable Diffusion / DALL-E 生成图片，支持文生图和图生图。',
    emoji: '🖼',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 30000,
    rating: 4.9,
    category: 'ai-intelligence',
    tags: ['AI', '绘图', 'DALL-E', 'Stable Diffusion'],
  },
  {
    id: 'skill_voice',
    name: '语音合成',
    description: '文字转语音，支持多语言、多音色，可调节语速和情感。',
    emoji: '🎤',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 15000,
    rating: 4.5,
    category: 'ai-intelligence',
    tags: ['TTS', '语音', '朗读'],
  },
  {
    id: 'skill_code_test',
    name: '测试工程师',
    description: '自动生成单元测试、E2E 测试，支持 Jest、Playwright 等框架。',
    emoji: '🧪',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 12000,
    rating: 4.4,
    category: 'developer-tools',
    tags: ['测试', 'jest', 'playwright', '单元测试'],
  },
  {
    id: 'skill_doc_gen',
    name: '文档生成器',
    description: '自动生成 API 文档、README、CHANGELOG 和技术白皮书。',
    emoji: '📄',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 14000,
    rating: 4.6,
    category: 'developer-tools',
    tags: ['文档', 'API', 'README', '规范'],
  },
  {
    id: 'skill_schedule',
    name: '日程管家',
    description: '管理日历、设置提醒、智能安排会议时间和冲突检测。',
    emoji: '📅',
    author: 'WdClaw Team',
    version: '1.0.0',
    downloads: 16000,
    rating: 4.5,
    category: 'productivity',
    tags: ['日程', '日历', '提醒', '会议'],
  },
];

export class WdClawAPI {
  // 实际部署时替换为 CDN URL
  private static API_BASE = 'https://api.wdclaw.ai';

  /**
   * 获取远程专家列表
   */
  static async fetchExperts(): Promise<RemoteExpert[]> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    // 实际实现应如下请求远程 API：
    // const res = await fetch(`${API_BASE}/experts`);
    // return res.json();
    return MOCK_EXPERTS;
  }

  /**
   * 获取远程技能列表
   */
  static async fetchSkills(): Promise<RemoteSkill[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    // 实际实现应请求远程 API
    return MOCK_SKILLS;
  }

  /**
   * 搜索远程技能
   */
  static async searchSkills(query: string): Promise<RemoteSkill[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return MOCK_SKILLS.filter(s => 
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
    );
  }

  /**
   * 获取单个专家详情
   */
  static async fetchExpertDetail(id: string): Promise<RemoteExpert | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_EXPERTS.find(e => e.id === id) || null;
  }

  /**
   * 获取单个技能详情
   */
  static async fetchSkillDetail(id: string): Promise<RemoteSkill | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_SKILLS.find(s => s.id === id) || null;
  }
}
