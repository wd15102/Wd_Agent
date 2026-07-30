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
  backgroundOpacity?: number;
  backgroundBlur?: number;
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
    if (theme.backgroundImage) {
      root.style.setProperty('--bg-image', `url(${theme.backgroundImage})`);
      root.style.setProperty('--bg-opacity', String(theme.backgroundOpacity ?? 0.15));
      root.style.setProperty('--bg-blur', `${theme.backgroundBlur ?? 0}px`);
      root.setAttribute('data-has-bg-image', 'true');
    } else {
      root.style.removeProperty('--bg-image');
      root.style.removeProperty('--bg-opacity');
      root.style.removeProperty('--bg-blur');
      root.removeAttribute('data-has-bg-image');
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
