// ============================================================
// 主题引擎 — Theme Engine
// 支持: 多主题切换、自定义CSS、背景图片、图片取色
// ============================================================

export interface ThemeConfig {
  id: string;
  name: string;
  emoji?: string;
  colors: ThemeColors;
  customCSS?: string;
  backgroundImage?: string;
  backgroundImages?: string[];  // 轮播背景图数组
  backgroundOpacity?: number;
  backgroundBlur?: number;
  backgroundFit?: 'cover' | 'contain'; // 背景图填充模式
  sidebarImage?: string;        // 侧边栏背景图（cover=填满裁剪，contain=完整显示）
  backgroundSlideshowInterval?: number;  // 轮播间隔(秒)
  // DreamSkin 复刻字段
  brandSubtitle?: string;    // 品牌副标题
  tagline?: string;          // 首页标语
  statusText?: string;       // 状态文本
  quote?: string;            // 引用文字
  quotes?: string[];          // 随机台词列表
  welcomeGifs?: string[];      // 新建聊天时展示的 GIF 列表
  focusX?: number;           // 背景焦点 X (0-1)
  focusY?: number;           // 背景焦点 Y (0-1)
  safeArea?: 'left' | 'right'; // 安全区域（侧栏在哪边）
  taskMode?: 'ambient' | 'hidden'; // 任务页背景模式

  // === KUN 深度定制字段 ===
  heroImage?: string;          // Hero 区背景图
  heroSignature?: string;      // Hero 签名图片（KUN 手写体）
  heroTitle?: string;          // Hero 大标题
  heroSubtitle?: string;       // Hero 副标题
  heroTag?: string;            // Hero 小标签
  heroStamp?: string;          // Hero 印章文字
  heroUniqueId?: string;       // 唯一 ID
  badgeTopRight?: string;      // 右上角徽章
  polaroidImage?: string;      // 拍立得图片
  polaroidText?: string;       // 拍立得文字
  decorations?: string[];      // 装饰元素 emoji
  brandFont?: string;          // 品牌字体 CSS
  inputPlaceholder?: string;   // 输入框占位符
  modelLabel?: string;         // 模型选择器文案
  appearance?: 'light' | 'dark' | 'system'; // 外观模式
  readingEnhancement?: boolean; // 阅读增强（AI回复半透明底）
}

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textPlaceholder: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  accentBg: string;
  borderLight: string;
  borderDefault: string;
  borderStrong: string;
}

// 内置主题
export const BUILT_IN_THEMES: ThemeConfig[] = [
  {
    id: 'light',
    name: '浅色',
    emoji: '☀️',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f7f7f8',
      bgTertiary: '#f0f2f5',
      bgHover: '#f1f5f9',
      textPrimary: '#1a1a2e',
      textSecondary: '#4a5568',
      textTertiary: '#8c8c8c',
      textPlaceholder: '#bfbfbf',
      accent: '#1677ff',
      accentHover: '#4096ff',
      accentLight: '#e6f4ff',
      accentBg: 'rgba(22, 119, 255, 0.06)',
      borderLight: '#f0f0f0',
      borderDefault: '#d9d9d9',
      borderStrong: '#bfbfbf',
    },
  },
  {
    id: 'dark',
    name: '深色',
    emoji: '🌙',
    colors: {
      bgPrimary: '#1a1a2e',
      bgSecondary: '#16162a',
      bgTertiary: '#232340',
      bgHover: '#2a2a4a',
      textPrimary: '#e8e8f0',
      textSecondary: '#a8a8c0',
      textTertiary: '#6c6c8a',
      textPlaceholder: '#5a5a78',
      accent: '#4096ff',
      accentHover: '#66aaff',
      accentLight: 'rgba(64, 150, 255, 0.15)',
      accentBg: 'rgba(64, 150, 255, 0.08)',
      borderLight: '#2a2a4a',
      borderDefault: '#3a3a5c',
      borderStrong: '#4a4a6e',
    },
  },
  {
    id: 'midnight',
    name: '午夜蓝',
    emoji: '🌌',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      bgHover: '#1e3a5f',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      textTertiary: '#64748b',
      textPlaceholder: '#475569',
      accent: '#38bdf8',
      accentHover: '#7dd3fc',
      accentLight: 'rgba(56, 189, 248, 0.15)',
      accentBg: 'rgba(56, 189, 248, 0.08)',
      borderLight: '#1e293b',
      borderDefault: '#334155',
      borderStrong: '#475569',
    },
  },
  {
    id: 'warm',
    name: '暖色',
    emoji: '🌅',
    colors: {
      bgPrimary: '#fffbf0',
      bgSecondary: '#fef3e2',
      bgTertiary: '#fde8c8',
      bgHover: '#fcecd6',
      textPrimary: '#3d2e1f',
      textSecondary: '#7a6b5d',
      textTertiary: '#a89b8c',
      textPlaceholder: '#c4b5a5',
      accent: '#e67e22',
      accentHover: '#f39c12',
      accentLight: 'rgba(230, 126, 34, 0.1)',
      accentBg: 'rgba(230, 126, 34, 0.05)',
      borderLight: '#f0e0c8',
      borderDefault: '#e0d0b8',
      borderStrong: '#c8b89e',
    },
  },
  {
    id: 'forest',
    name: '森林绿',
    emoji: '🌲',
    colors: {
      bgPrimary: '#f0fdf4',
      bgSecondary: '#dcfce7',
      bgTertiary: '#bbf7d0',
      bgHover: '#a7f3d0',
      textPrimary: '#064e3b',
      textSecondary: '#065f46',
      textTertiary: '#047857',
      textPlaceholder: '#059669',
      accent: '#10b981',
      accentHover: '#34d399',
      accentLight: 'rgba(16, 185, 129, 0.1)',
      accentBg: 'rgba(16, 185, 129, 0.05)',
      borderLight: '#a7f3d0',
      borderDefault: '#6ee7b7',
      borderStrong: '#34d399',
    },
  },
  {
    id: 'lavender',
    name: '薰衣草',
    emoji: '💜',
    colors: {
      bgPrimary: '#faf5ff',
      bgSecondary: '#f3e8ff',
      bgTertiary: '#e9d5ff',
      bgHover: '#d8b4fe',
      textPrimary: '#3b0764',
      textSecondary: '#581c87',
      textTertiary: '#7c3aed',
      textPlaceholder: '#a78bfa',
      accent: '#8b5cf6',
      accentHover: '#a78bfa',
      accentLight: 'rgba(139, 92, 246, 0.1)',
      accentBg: 'rgba(139, 92, 246, 0.05)',
      borderLight: '#e9d5ff',
      borderDefault: '#d8b4fe',
      borderStrong: '#c4b5fd',
    },
  },
  {
    id: 'rose',
    name: '玫瑰粉',
    emoji: '🌸',
    colors: {
      bgPrimary: '#fff1f2',
      bgSecondary: '#ffe4e6',
      bgTertiary: '#fecdd3',
      bgHover: '#fda4af',
      textPrimary: '#4c0519',
      textSecondary: '#881337',
      textTertiary: '#be123c',
      textPlaceholder: '#fb7185',
      accent: '#f43f5e',
      accentHover: '#fb7185',
      accentLight: 'rgba(244, 63, 94, 0.1)',
      accentBg: 'rgba(244, 63, 94, 0.05)',
      borderLight: '#fecdd3',
      borderDefault: '#fda4af',
      borderStrong: '#fb7185',
    },
  },
  {
    id: 'cyberpunk',
    name: '赛博朋克',
    emoji: '🤖',
    colors: {
      bgPrimary: '#0a0a0f',
      bgSecondary: '#12121a',
      bgTertiary: '#1a1a2e',
      bgHover: '#2a1a3e',
      textPrimary: '#00ff88',
      textSecondary: '#00cc6a',
      textTertiary: '#009944',
      textPlaceholder: '#006633',
      accent: '#00ff88',
      accentHover: '#33ffaa',
      accentLight: 'rgba(0, 255, 136, 0.15)',
      accentBg: 'rgba(0, 255, 136, 0.08)',
      borderLight: '#1a2e1a',
      borderDefault: '#2a4a2a',
      borderStrong: '#3a6a3a',
    },
  },

  // ============================================================
  // CodexSkin 复刻主题 — 源自 github.com/seeyouintokyo/codexskin
  // ============================================================
  {
    id: 'codex-blue',
    name: '深海蓝',
    emoji: '🌊',
    colors: {
      bgPrimary: '#070b13',
      bgSecondary: '#0b1120',
      bgTertiary: '#121c2d',
      bgHover: '#162035',
      textPrimary: '#eaf2ff',
      textSecondary: '#9dafc8',
      textTertiary: '#6e8aad',
      textPlaceholder: '#4a6888',
      accent: '#6ea8fe',
      accentHover: '#93c0ff',
      accentLight: 'rgba(110, 168, 254, 0.15)',
      accentBg: 'rgba(110, 168, 254, 0.08)',
      borderLight: 'rgba(110, 168, 254, 0.12)',
      borderDefault: 'rgba(110, 168, 254, 0.32)',
      borderStrong: 'rgba(110, 168, 254, 0.48)',
    },
  },
  {
    id: 'codex-pink',
    name: '玫瑰粉',
    emoji: '🌹',
    colors: {
      bgPrimary: '#120812',
      bgSecondary: '#1d0d1c',
      bgTertiary: '#261126',
      bgHover: '#2e1530',
      textPrimary: '#fff2fa',
      textSecondary: '#d4a7c4',
      textTertiary: '#b07da0',
      textPlaceholder: '#8a5a7a',
      accent: '#f38bbf',
      accentHover: '#f7a8d0',
      accentLight: 'rgba(243, 139, 191, 0.15)',
      accentBg: 'rgba(243, 139, 191, 0.08)',
      borderLight: 'rgba(243, 139, 191, 0.12)',
      borderDefault: 'rgba(243, 139, 191, 0.34)',
      borderStrong: 'rgba(243, 139, 191, 0.50)',
    },
  },
  {
    id: 'codex-yellow',
    name: '奶油淡黄',
    emoji: '🍦',
    colors: {
      bgPrimary: '#fff7df',
      bgSecondary: '#f8e9bd',
      bgTertiary: '#fffaf0',
      bgHover: '#f0e0b0',
      textPrimary: '#392d18',
      textSecondary: '#806b46',
      textTertiary: '#a08a60',
      textPlaceholder: '#c0a878',
      accent: '#d6a43b',
      accentHover: '#e0b850',
      accentLight: 'rgba(214, 164, 59, 0.10)',
      accentBg: 'rgba(214, 164, 59, 0.05)',
      borderLight: 'rgba(180, 128, 38, 0.12)',
      borderDefault: 'rgba(180, 128, 38, 0.28)',
      borderStrong: 'rgba(180, 128, 38, 0.44)',
    },
  },
  {
    id: 'codex-purple',
    name: '极光紫',
    emoji: '🔮',
    colors: {
      bgPrimary: '#08051a',
      bgSecondary: '#100826',
      bgTertiary: '#1a1038',
      bgHover: '#221548',
      textPrimary: '#f7f2ff',
      textSecondary: '#bba9dd',
      textTertiary: '#8a7ab0',
      textPlaceholder: '#6a5a90',
      accent: '#9b6cff',
      accentHover: '#b08cff',
      accentLight: 'rgba(155, 108, 255, 0.15)',
      accentBg: 'rgba(155, 108, 255, 0.08)',
      borderLight: 'rgba(155, 108, 255, 0.12)',
      borderDefault: 'rgba(155, 108, 255, 0.36)',
      borderStrong: 'rgba(155, 108, 255, 0.52)',
    },
  },
  {
    id: 'codex-red',
    name: '熔岩红',
    emoji: '🔥',
    colors: {
      bgPrimary: '#080606',
      bgSecondary: '#120909',
      bgTertiary: '#1b0c0d',
      bgHover: '#251012',
      textPrimary: '#fff4f4',
      textSecondary: '#caa5a5',
      textTertiary: '#a07878',
      textPlaceholder: '#7a5555',
      accent: '#ff3434',
      accentHover: '#ff5a5a',
      accentLight: 'rgba(255, 52, 52, 0.15)',
      accentBg: 'rgba(255, 52, 52, 0.08)',
      borderLight: 'rgba(255, 52, 52, 0.12)',
      borderDefault: 'rgba(255, 52, 52, 0.36)',
      borderStrong: 'rgba(255, 52, 52, 0.52)',
    },
  },
  {
    id: 'codex-green',
    name: '翡翠绿',
    emoji: '💎',
    colors: {
      bgPrimary: '#020d0a',
      bgSecondary: '#041813',
      bgTertiary: '#09221a',
      bgHover: '#0c2c22',
      textPrimary: '#ecfff8',
      textSecondary: '#94c6b5',
      textTertiary: '#6a9a88',
      textPlaceholder: '#4a7a68',
      accent: '#24e6a2',
      accentHover: '#4aeeb5',
      accentLight: 'rgba(36, 230, 162, 0.15)',
      accentBg: 'rgba(36, 230, 162, 0.08)',
      borderLight: 'rgba(36, 230, 162, 0.12)',
      borderDefault: 'rgba(36, 230, 162, 0.32)',
      borderStrong: 'rgba(36, 230, 162, 0.48)',
    },
  },

  // ============================================================
  // ⚡ KUN 专属定制主题 — ikun 限定版
  // ============================================================
  {
    id: 'kun-exclusive',
    name: 'KUN 专属定制',
    emoji: '⚡',
    brandSubtitle: 'KUN',
    tagline: '把喜欢的画面变成可交互的工作台。',
    statusText: 'KUN ONLINE',
    quote: 'Be Better, Be KUN',
    focusX: 0.7,
    focusY: 0.4,
    safeArea: 'left',
    taskMode: 'ambient',
    // KUN 深度定制
    heroImage: 'http://127.0.0.1:3210/themes/kun/background.png',
    heroSignature: 'http://127.0.0.1:3210/themes/kun/hero-sparkle.png',
    polaroidImage: 'http://127.0.0.1:3210/themes/kun/polaroid.png',
    backgroundImage: 'http://127.0.0.1:3210/themes/kun/background.png',
    backgroundOpacity: 0.6,
    backgroundBlur: 0,
    heroTitle: 'KUN 专属定制皮肤',
    heroSubtitle: 'WdClaw ikun 限定版',
    heroTag: '蔡徐坤专属定制',
    heroStamp: 'KUN EXCLUSIVE',
    heroUniqueId: '独一无二 ID: iKUN_0802_19980802',
    badgeTopRight: 'ikun 集美最喜欢',
    polaroidText: 'Be Better, Be KUN',
    decorations: ['✨', '♥', '⭐', '🌸', '💫'],
    inputPlaceholder: '随心输入，让 KUN 陪你一起写代码吧～',
    modelLabel: '5.6 Sol 中',
    readingEnhancement: true,
    colors: {
      bgPrimary: '#0a0612',
      bgSecondary: '#120a20',
      bgTertiary: '#1a1028',
      bgHover: '#241638',
      textPrimary: '#f5f0ff',
      textSecondary: '#b8a5d4',
      textTertiary: '#8a7aaa',
      textPlaceholder: '#6a5a8a',
      accent: '#e040fb',
      accentHover: '#f55aff',
      accentLight: 'rgba(224, 64, 251, 0.15)',
      accentBg: 'rgba(224, 64, 251, 0.08)',
      borderLight: 'rgba(224, 64, 251, 0.12)',
      borderDefault: 'rgba(224, 64, 251, 0.30)',
      borderStrong: 'rgba(224, 64, 251, 0.48)',
    },
  },

  // ============================================================
  // 🚬 大佬 · 点烟 — HeiGe Codex Skin Studio 彩蛋主题
  // ============================================================
  {
    id: 'dalao-dianyan',
    name: '大佬 · 点烟',
    emoji: '🚬',
    appearance: 'dark',
    brandSubtitle: '大佬',
    tagline: '抽烟只抽芙蓉王，此生只做大佬人。',
    statusText: '大佬 ONLINE',
    quote: '代码写得好，不如烟点得好',
    focusX: 0.5,
    focusY: 0.08,
    heroImage: 'http://127.0.0.1:3210/themes/dalao-dianyan/hero.webp',
    backgroundImage: 'http://127.0.0.1:3210/themes/dalao-dianyan/hero.webp',
    backgroundOpacity: 0.75,
    backgroundBlur: 0,
    heroTitle: '大佬 · 点烟',
    heroSubtitle: '芙蓉王 — 此生只做大佬人',
    heroTag: '彩蛋限定',
    heroStamp: 'DALAO EXCLUSIVE',
    heroUniqueId: 'ID: CN_DALAO_2024',
    badgeTopRight: '🚬 抽烟只抽芙蓉王',
    polaroidText: '代码写得好，不如烟点得好',
    decorations: ['🚬', '💨', '🔥', '💼', '🀄'],
    inputPlaceholder: '大佬，请指点江山...',
    modelLabel: '思考中...',
    readingEnhancement: true,
    colors: {
      bgPrimary: '#111111',
      bgSecondary: '#1a1a1a',
      bgTertiary: '#222222',
      bgHover: '#2a2a2a',
      textPrimary: '#f2e8da',
      textSecondary: '#b8a88a',
      textTertiary: '#8a7a6a',
      textPlaceholder: '#6a5a4a',
      accent: '#e09a52',
      accentHover: '#f0ab62',
      accentLight: 'rgba(224, 154, 82, 0.15)',
      accentBg: 'rgba(224, 154, 82, 0.08)',
      borderLight: 'rgba(224, 154, 82, 0.12)',
      borderDefault: 'rgba(224, 154, 82, 0.30)',
      borderStrong: 'rgba(224, 154, 82, 0.48)',
    },
  },

  // ============================================================
  // 🐵 黑神话 · 悟空 — 自定义生成
  // ============================================================
  {
    id: 'wukong',
    name: '黑神话 · 悟空',
    emoji: '🐵',
    appearance: 'dark',
    brandSubtitle: '悟空',
    tagline: '我若成佛，天下无魔；我若成魔，佛奈我何。',
    statusText: '天命人 ONLINE',
    quote: '我命由我不由天',
    quotes: [
      '我若成佛，天下无魔；我若成魔，佛奈我何。',
      '我命由我不由天。',
      '天地不仁，以万物为刍狗。',
      '大圣，此去欲何？踏南天，碎凌霄。若一去不回？便一去不回！',
      '皇帝轮流做，明年到我家。',
      '俺老孙来也！',
      '金猴奋起千钧棒，玉宇澄清万里埃。',
      '花果山，水帘洞，齐天大圣孙悟空。',
      '吃俺老孙一棒！',
      '俺老孙被你们骗了。',
      '这经，不取也罢。',
      '若命运不公，就和它斗到底。',
      '我若成魔，佛奈我何。',
      '一念成佛，一念成魔。',
      '放下屠刀，立地成佛。',
      '我走我的阳关道，你过你的独木桥。',
      '齐天大圣，不会输。',
      '这天下，容不下我。',
      '俺老孙，不认命。',
      '天要灭我，我偏不亡。',
      '五百年前闹天宫，五百年后取真经。',
      '金箍棒下，无冤魂。',
      '我若不愿，谁也逼不了我。',
      '这世上，没有过不去的坎。',
      '大圣归来，妖魔退散。',
      '心猿意马，不如守正。',
      '道高一尺，魔高一丈。',
      '我本是一只石猴，偏要胜天半子。',
      '生死有命，富贵在天。',
      '俺老孙，从不认输。',
      '这天地，困不住我。',
      '我若为王，天下无双。',
      '一路向西，只为真经。',
      '这经，不取也罢；这佛，不成也罢。',
      '我命由我，不由天。',
      '天要压我，我偏要顶。',
      '地要埋我，我偏要站。',
      '俺老孙，生来就是自由的。',
      '这金箍，困不住我的心。',
      '五百年的孤独，谁人能懂？',
      '我若成佛，天下无魔。',
      '我若成魔，佛奈我何。',
      '一念起，万水千山；一念灭，沧海桑田。',
      '齐天大圣，斗战胜佛。',
      '这天下，是打出来的。',
      '俺老孙，不稀罕。',
      '天若阻我，我偏要逆。',
      '地若埋我，我偏要出。',
      '我若为王，天下皆臣。',
      '这命运，我偏要改。',
      '俺老孙，从不信命。',
      '天要灭我，我偏不灭。',
      '这经，我要取；这佛，我要成。',
      '齐天大圣，名不虚传。',
      '这金箍棒，重一万三千五百斤。',
      '俺老孙，一个筋斗十万八千里。',
      '这天下，没有俺老孙去不了的地方。',
      '我若不愿，天也奈何不了我。',
      '这五百年，俺老孙想明白了很多。',
      '天要压我，我便顶天。',
      '地要埋我，我便立地。',
      '俺老孙，偏不认命。',
      '这命运，由我做主。',
      '齐天大圣，斗战胜佛，孙悟空。',
      '我若成佛，天下无魔；我若成魔，佛奈我何。',
      '这天地之间，再无拘束。',
      '俺老孙，去也！',
      '这一棒，叫你灰飞烟灭。',
      '这经，不取也罢；这佛，不做也罢。',
      '我命由我不由天，天欲灭我我灭天。',
      '五百年的等待，只为今朝。',
      '齐天大圣，从未离开。',
      '俺老孙，又回来了。',
      '这天下，还是那个天下。',
      '我若为魔，天下无佛。',
      '我若为佛，天下无魔。',
      '一念成佛，一念成魔，善恶在一念之间。',
      '俺老孙，不稀罕这佛位。',
      '这金箍，戴得住头，戴不住心。',
      '天要灭我，我偏要活。',
      '这命运，我偏要逆。',
      '齐天大圣，孙悟空，俺老孙来也！',
    ],
    focusX: 0.7,
    focusY: 0.4,
    heroImage: 'http://127.0.0.1:3210/themes/wukong/background.webp',
    backgroundImages: [
      'http://127.0.0.1:3210/themes/wukong/slide_1.jpg',
      'http://127.0.0.1:3210/themes/wukong/char_2.jpg',
      'http://127.0.0.1:3210/themes/wukong/slide_4.jpg',
      'http://127.0.0.1:3210/themes/wukong/char_5.jpg',
      'http://127.0.0.1:3210/themes/wukong/slide_6.jpg',
      'http://127.0.0.1:3210/themes/wukong/char_8.jpg',
      'http://127.0.0.1:3210/themes/wukong/slide_8.jpg',
      'http://127.0.0.1:3210/themes/wukong/char_9.jpg',
      'http://127.0.0.1:3210/themes/wukong/slide_12.jpg',
      'http://127.0.0.1:3210/themes/wukong/char_11.jpg',
      'http://127.0.0.1:3210/themes/wukong/slide_16.jpg',
      'http://127.0.0.1:3210/themes/wukong/slide_19.jpg',
      'http://127.0.0.1:3210/themes/wukong/slide_21.jpg',
    ],
    backgroundSlideshowInterval: 8,
    backgroundFit: 'contain',
    backgroundOpacity: 0.8,
    backgroundBlur: 0,
    sidebarImage: 'http://127.0.0.1:3210/themes/wukong/001.jpg',
    heroTitle: '黑神话 · 悟空',
    heroSubtitle: '我命由我不由天',
    heroTag: '天命人限定',
    heroStamp: 'WUKONG EXCLUSIVE',
    heroUniqueId: 'ID: TIANMINGREN_2024',
    badgeTopRight: '🐵 天命人',
    polaroidImage: 'http://127.0.0.1:3210/themes/wukong/polaroid.webp',
    polaroidText: '我若成佛，天下无魔',
    decorations: ['⚔️', '🔥', '🐵', '💥', '☁️'],
    welcomeGifs: [
      'http://127.0.0.1:3210/themes/wukong/v2-316aeb4f862a914a4b928b745013d8b6_b.gif',
      'http://127.0.0.1:3210/themes/wukong/v2-dccf7e94b5f20a86502c4b499da0313f_b.gif',
    ],
    inputPlaceholder: '天命人，请说出你的诉求...',
    modelLabel: '悟空中...',
    readingEnhancement: true,
    colors: {
      bgPrimary: '#0a0808',
      bgSecondary: '#14100e',
      bgTertiary: '#1e1816',
      bgHover: '#28201c',
      textPrimary: '#f5e6c8',
      textSecondary: '#c4a882',
      textTertiary: '#8a7660',
      textPlaceholder: '#6a5848',
      accent: '#d4a843',
      accentHover: '#e8bc58',
      accentLight: 'rgba(212, 168, 67, 0.15)',
      accentBg: 'rgba(212, 168, 67, 0.08)',
      borderLight: 'rgba(212, 168, 67, 0.12)',
      borderDefault: 'rgba(212, 168, 67, 0.30)',
      borderStrong: 'rgba(212, 168, 67, 0.48)',
    },
  },
];

export class ThemeEngine {
  private currentTheme: ThemeConfig;
  private customCSS: string = '';
  private styleElement: HTMLStyleElement | null = null;
  private listeners: Set<(theme: ThemeConfig) => void> = new Set();

  constructor() {
    const saved = this.loadSavedTheme();
    this.currentTheme = saved || BUILT_IN_THEMES[0];
    this.customCSS = localStorage.getItem('wdclaw-custom-css') || '';
  }

  private loadSavedTheme(): ThemeConfig | null {
    try {
      const savedId = localStorage.getItem('wdclaw-theme-id');
      if (!savedId) return null;

      // 检查是否是内置主题
      const builtIn = BUILT_IN_THEMES.find(t => t.id === savedId);
      if (builtIn) {
        // 加载可能的自定义覆盖
        const overrides = localStorage.getItem(`wdclaw-theme-${savedId}`);
        if (overrides) {
          return { ...builtIn, ...JSON.parse(overrides) };
        }
        return builtIn;
      }

      // 检查是否是自定义主题
      const customThemes = this.getCustomThemes();
      return customThemes.find(t => t.id === savedId) || null;
    } catch {
      return null;
    }
  }

  private saveTheme() {
    try {
      localStorage.setItem('wdclaw-theme-id', this.currentTheme.id);
      localStorage.setItem('wdclaw-custom-css', this.customCSS);
    } catch {}
  }

  getTheme(): ThemeConfig {
    return this.currentTheme;
  }

  getAllThemes(): ThemeConfig[] {
    return [...BUILT_IN_THEMES, ...this.getCustomThemes()];
  }

  getCustomThemes(): ThemeConfig[] {
    try {
      const data = localStorage.getItem('wdclaw-custom-themes');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  setTheme(themeId: string): boolean {
    const theme = this.getAllThemes().find(t => t.id === themeId);
    if (!theme) return false;
    this.currentTheme = theme;
    this.applyTheme();
    this.saveTheme();
    this.notifyListeners();
    return true;
  }

  /**
   * 应用主题到 DOM
   */
  applyTheme() {
    const theme = this.currentTheme;
    const root = document.documentElement;

    // 设置 data-theme 属性
    root.setAttribute('data-theme', theme.id);

    // 应用 CSS 变量
    const c = theme.colors;
    root.style.setProperty('--bg-primary', c.bgPrimary);
    root.style.setProperty('--bg-secondary', c.bgSecondary);
    root.style.setProperty('--bg-tertiary', c.bgTertiary);
    root.style.setProperty('--bg-hover', c.bgHover);
    root.style.setProperty('--text-primary', c.textPrimary);
    root.style.setProperty('--text-secondary', c.textSecondary);
    root.style.setProperty('--text-tertiary', c.textTertiary);
    root.style.setProperty('--text-placeholder', c.textPlaceholder);
    root.style.setProperty('--accent', c.accent);
    root.style.setProperty('--accent-hover', c.accentHover);
    root.style.setProperty('--accent-light', c.accentLight);
    root.style.setProperty('--accent-bg', c.accentBg);
    root.style.setProperty('--border-light', c.borderLight);
    root.style.setProperty('--border-default', c.borderDefault);
    root.style.setProperty('--border-strong', c.borderStrong);

    // 应用背景图片
    if (theme.backgroundImages && theme.backgroundImages.length > 0) {
      // 轮播模式：多图
      root.style.setProperty('--bg-image', `url(${theme.backgroundImages[0]})`);
      root.style.setProperty('--bg-opacity', String(theme.backgroundOpacity ?? 0.15));
      root.style.setProperty('--bg-blur', `${theme.backgroundBlur ?? 0}px`);
      root.style.setProperty('--bg-focus-x', String(theme.focusX ?? 0.5));
      root.style.setProperty('--bg-focus-y', String(theme.focusY ?? 0.5));
      root.setAttribute('data-has-bg-image', 'true');
      root.setAttribute('data-bg-slideshow', JSON.stringify(theme.backgroundImages));
      root.setAttribute('data-bg-interval', String(theme.backgroundSlideshowInterval ?? 8));
    } else if (theme.backgroundImage) {
      // 单图模式
      root.style.setProperty('--bg-image', `url(${theme.backgroundImage})`);
      root.style.setProperty('--bg-opacity', String(theme.backgroundOpacity ?? 0.15));
      root.style.setProperty('--bg-blur', `${theme.backgroundBlur ?? 0}px`);
      root.style.setProperty('--bg-focus-x', String(theme.focusX ?? 0.5));
      root.style.setProperty('--bg-focus-y', String(theme.focusY ?? 0.5));
      root.setAttribute('data-has-bg-image', 'true');
      root.removeAttribute('data-bg-slideshow');
      root.removeAttribute('data-bg-interval');
    } else {
      root.style.removeProperty('--bg-image');
      root.style.removeProperty('--bg-opacity');
      root.style.removeProperty('--bg-blur');
      root.style.removeProperty('--bg-focus-x');
      root.style.removeProperty('--bg-focus-y');
      root.removeAttribute('data-has-bg-image');
      root.removeAttribute('data-bg-slideshow');
      root.removeAttribute('data-bg-interval');
    }

    // DreamSkin 复刻：文本自定义
    if (theme.brandSubtitle) root.setAttribute('data-brand-subtitle', theme.brandSubtitle);
    else root.removeAttribute('data-brand-subtitle');
    if (theme.tagline) root.setAttribute('data-tagline', theme.tagline);
    else root.removeAttribute('data-tagline');
    if (theme.statusText) root.setAttribute('data-status-text', theme.statusText);
    else root.removeAttribute('data-status-text');
    if (theme.quote) root.setAttribute('data-quote', theme.quote);
    else root.removeAttribute('data-quote');

    // KUN 深度定制字段
    if (theme.heroImage) root.style.setProperty('--kun-hero-bg', `url(${theme.heroImage})`);
    else root.style.removeProperty('--kun-hero-bg');
    if (theme.heroSignature) root.style.setProperty('--kun-hero-signature', `url(${theme.heroSignature})`);
    else root.style.removeProperty('--kun-hero-signature');
    if (theme.heroTitle) root.setAttribute('data-hero-title', theme.heroTitle);
    else root.removeAttribute('data-hero-title');
    if (theme.heroSubtitle) root.setAttribute('data-hero-subtitle', theme.heroSubtitle);
    else root.removeAttribute('data-hero-subtitle');
    if (theme.heroTag) root.setAttribute('data-hero-tag', theme.heroTag);
    else root.removeAttribute('data-hero-tag');
    if (theme.heroStamp) root.setAttribute('data-hero-stamp', theme.heroStamp);
    else root.removeAttribute('data-hero-stamp');
    if (theme.heroUniqueId) root.setAttribute('data-hero-unique-id', theme.heroUniqueId);
    else root.removeAttribute('data-hero-unique-id');
    if (theme.badgeTopRight) root.setAttribute('data-badge-top-right', theme.badgeTopRight);
    else root.removeAttribute('data-badge-top-right');
    if (theme.polaroidImage) root.style.setProperty('--kun-polaroid-img', `url(${theme.polaroidImage})`);
    else root.style.removeProperty('--kun-polaroid-img');
    if (theme.polaroidText) root.setAttribute('data-polaroid-text', theme.polaroidText);
    else root.removeAttribute('data-polaroid-text');
    if (theme.decorations) root.setAttribute('data-decorations', JSON.stringify(theme.decorations));
    else root.removeAttribute('data-decorations');
    if (theme.inputPlaceholder) root.setAttribute('data-input-placeholder', theme.inputPlaceholder);
    else root.removeAttribute('data-input-placeholder');
    if (theme.modelLabel) root.setAttribute('data-model-label', theme.modelLabel);
    else root.removeAttribute('data-model-label');
    if (theme.brandFont) root.style.setProperty('--kun-brand-font', theme.brandFont);
    else root.style.removeProperty('--kun-brand-font');

    // 应用外观模式 (light/dark/system)
    if (theme.appearance) {
      root.setAttribute('data-appearance', theme.appearance);
    } else {
      root.removeAttribute('data-appearance');
    }

    // 阅读增强（AI回复半透明底）
    if (theme.readingEnhancement) {
      root.setAttribute('data-reading-enhancement', 'true');
    } else {
      root.removeAttribute('data-reading-enhancement');
    }

    // 应用自定义 CSS
    this.applyCustomCSS(theme.customCSS || '');

    // 更新 Ant Design 主题色
    this.updateAntdTheme(c.accent);
  }

  private applyCustomCSS(css: string) {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'wdclaw-custom-theme-css';
      document.head.appendChild(this.styleElement);
    }
    this.styleElement.textContent = css;
  }

  private updateAntdTheme(accentColor: string) {
    // 通过 antd 的 ConfigProvider 更新主题色
    // 这里通过 CSS 变量覆盖 antd 的主题色
    const root = document.documentElement;
    root.style.setProperty('--ant-color-primary', accentColor);
  }

  /**
   * 设置自定义 CSS
   */
  setCustomCSS(css: string) {
    this.customCSS = css;
    this.applyCustomCSS(css);
    this.saveTheme();
  }

  getCustomCSS(): string {
    return this.customCSS;
  }

  /**
   * 设置背景图片
   */
  setBackgroundImage(dataUrl: string, opacity = 0.15, blur = 0) {
    this.currentTheme.backgroundImage = dataUrl;
    this.currentTheme.backgroundOpacity = opacity;
    this.currentTheme.backgroundBlur = blur;
    this.applyTheme();
    this.saveTheme();
    this.notifyListeners();
  }

  /**
   * 移除背景图片
   */
  removeBackgroundImage() {
    this.currentTheme.backgroundImage = undefined;
    this.currentTheme.backgroundOpacity = undefined;
    this.currentTheme.backgroundBlur = undefined;
    this.applyTheme();
    this.saveTheme();
    this.notifyListeners();
  }

  /**
   * 从图片提取主题色并创建主题
   */
  async createThemeFromImage(imageDataUrl: string, name: string): Promise<ThemeConfig> {
    const colors = await this.extractColors(imageDataUrl);
    const theme: ThemeConfig = {
      id: `custom-${Date.now()}`,
      name,
      emoji: '🖼️',
      colors,
      backgroundImage: imageDataUrl,
      backgroundOpacity: 0.12,
      backgroundBlur: 0,
    };

    // 保存自定义主题
    const customThemes = this.getCustomThemes();
    customThemes.push(theme);
    localStorage.setItem('wdclaw-custom-themes', JSON.stringify(customThemes));

    return theme;
  }

  /**
   * 从图片提取主色调
   */
  private async extractColors(dataUrl: string): Promise<ThemeColors> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const imageData = ctx.getImageData(0, 0, 64, 64).data;
        const colorCounts: Map<string, number> = new Map();

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          // 量化颜色
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
        }

        // 获取最常见的颜色
        const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
        const dominant = sorted[0]?.[0]?.split(',').map(Number) || [240, 240, 240];
        const secondary = sorted[1]?.[0]?.split(',').map(Number) || [200, 200, 200];

        // 根据主色调生成主题
        const isDark = (dominant[0] + dominant[1] + dominant[2]) / 3 < 128;

        if (isDark) {
          resolve({
            bgPrimary: `rgb(${dominant[0]}, ${dominant[1]}, ${dominant[2]})`,
            bgSecondary: `rgb(${Math.min(255, dominant[0] + 20)}, ${Math.min(255, dominant[1] + 20)}, ${Math.min(255, dominant[2] + 20)})`,
            bgTertiary: `rgb(${Math.min(255, dominant[0] + 40)}, ${Math.min(255, dominant[1] + 40)}, ${Math.min(255, dominant[2] + 40)})`,
            bgHover: `rgb(${Math.min(255, dominant[0] + 50)}, ${Math.min(255, dominant[1] + 50)}, ${Math.min(255, dominant[2] + 50)})`,
            textPrimary: '#f1f5f9',
            textSecondary: '#94a3b8',
            textTertiary: '#64748b',
            textPlaceholder: '#475569',
            accent: `rgb(${secondary[0] || 56}, ${secondary[1] || 189}, ${secondary[2] || 248})`,
            accentHover: `rgb(${Math.min(255, (secondary[0] || 56) + 30)}, ${Math.min(255, (secondary[1] || 189) + 30)}, ${Math.min(255, (secondary[2] || 248) + 30)})`,
            accentLight: `rgba(${secondary[0] || 56}, ${secondary[1] || 189}, ${secondary[2] || 248}, 0.15)`,
            accentBg: `rgba(${secondary[0] || 56}, ${secondary[1] || 189}, ${secondary[2] || 248}, 0.08)`,
            borderLight: `rgb(${Math.min(255, dominant[0] + 15)}, ${Math.min(255, dominant[1] + 15)}, ${Math.min(255, dominant[2] + 15)})`,
            borderDefault: `rgb(${Math.min(255, dominant[0] + 30)}, ${Math.min(255, dominant[1] + 30)}, ${Math.min(255, dominant[2] + 30)})`,
            borderStrong: `rgb(${Math.min(255, dominant[0] + 45)}, ${Math.min(255, dominant[1] + 45)}, ${Math.min(255, dominant[2] + 45)})`,
          });
        } else {
          resolve({
            bgPrimary: `rgb(${dominant[0]}, ${dominant[1]}, ${dominant[2]})`,
            bgSecondary: `rgb(${Math.max(0, dominant[0] - 15)}, ${Math.max(0, dominant[1] - 15)}, ${Math.max(0, dominant[2] - 15)})`,
            bgTertiary: `rgb(${Math.max(0, dominant[0] - 30)}, ${Math.max(0, dominant[1] - 30)}, ${Math.max(0, dominant[2] - 30)})`,
            bgHover: `rgb(${Math.max(0, dominant[0] - 40)}, ${Math.max(0, dominant[1] - 40)}, ${Math.max(0, dominant[2] - 40)})`,
            textPrimary: '#1a1a2e',
            textSecondary: '#4a5568',
            textTertiary: '#8c8c8c',
            textPlaceholder: '#bfbfbf',
            accent: `rgb(${secondary[0] || 22}, ${secondary[1] || 119}, ${secondary[2] || 255})`,
            accentHover: `rgb(${Math.min(255, (secondary[0] || 22) + 30)}, ${Math.min(255, (secondary[1] || 119) + 30)}, ${Math.min(255, (secondary[2] || 255) + 30)})`,
            accentLight: `rgba(${secondary[0] || 22}, ${secondary[1] || 119}, ${secondary[2] || 255}, 0.1)`,
            accentBg: `rgba(${secondary[0] || 22}, ${secondary[1] || 119}, ${secondary[2] || 255}, 0.05)`,
            borderLight: `rgb(${Math.max(0, dominant[0] - 10)}, ${Math.max(0, dominant[1] - 10)}, ${Math.max(0, dominant[2] - 10)})`,
            borderDefault: `rgb(${Math.max(0, dominant[0] - 20)}, ${Math.max(0, dominant[1] - 20)}, ${Math.max(0, dominant[2] - 20)})`,
            borderStrong: `rgb(${Math.max(0, dominant[0] - 35)}, ${Math.max(0, dominant[1] - 35)}, ${Math.max(0, dominant[2] - 35)})`,
          });
        }
      };
      img.onerror = () => {
        // 失败时返回默认浅色主题
        resolve(BUILT_IN_THEMES[0].colors);
      };
      img.src = dataUrl;
    });
  }

  /**
   * 删除自定义主题
   */
  deleteCustomTheme(themeId: string) {
    const customThemes = this.getCustomThemes().filter(t => t.id !== themeId);
    localStorage.setItem('wdclaw-custom-themes', JSON.stringify(customThemes));
    if (this.currentTheme.id === themeId) {
      this.setTheme('light');
    }
    this.notifyListeners();
  }

  /**
   * 生成 Ant Design 主题配置
   */
  getAntdTheme(): any {
    const c = this.currentTheme.colors;
    const isDark = this.idDarkColor(c.bgPrimary);
    return {
      token: {
        colorPrimary: c.accent,
        borderRadius: 8,
        fontSize: 14,
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Microsoft YaHei', sans-serif`,
        colorBgContainer: c.bgPrimary,
        colorBgElevated: c.bgSecondary,
        colorBgLayout: c.bgSecondary,
        colorBorder: c.borderDefault,
        colorBorderSecondary: c.borderLight,
        colorText: c.textPrimary,
        colorTextSecondary: c.textSecondary,
        colorTextTertiary: c.textTertiary,
        colorTextPlaceholder: c.textPlaceholder,
      },
      components: {
        Layout: {
          headerBg: c.bgPrimary,
          siderBg: c.bgSecondary,
          bodyBg: c.bgPrimary,
          triggerBg: c.bgTertiary,
        },
        Menu: {
          itemBg: 'transparent',
          itemSelectedBg: c.accentLight,
          itemSelectedColor: c.accent,
          itemHoverBg: c.bgHover,
          itemHeight: 36,
          iconSize: 16,
        },
        Button: { primaryShadow: 'none' },
        Input: { activeShadow: `0 0 0 2px ${c.accent}22` },
        Message: { contentPadding: '8px 16px' },
      },
    };
  }

  private idDarkColor(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return false;
    return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) < 128;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (m) return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
    const m2 = hex.match(/^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/i);
    if (m2) return { r: parseInt(m2[1]), g: parseInt(m2[2]), b: parseInt(m2[3]) };
    return null;
  }

  /**
   * 监听主题变化
   */
  onChange(listener: (theme: ThemeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.currentTheme));
  }
}

// 单例
export const themeEngine = new ThemeEngine();
