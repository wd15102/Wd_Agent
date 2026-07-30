import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/globals.css';
import { themeEngine } from './components/settings/themeEngine';

let root: Root | null = null;

/**
 * 渲染/重新渲染整个应用
 * @param antdTheme Ant Design 主题配置
 */
function render(antdTheme: any) {
  if (!root) root = createRoot(document.getElementById('root')!);
  root.render(
    <React.StrictMode>
      <ConfigProvider locale={zhCN} theme={antdTheme}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </React.StrictMode>
  );
}

/**
 * 根据当前主题引擎状态渲染
 */
function renderFromTheme() {
  const antdTheme = themeEngine.getAntdTheme();
  const themeId = themeEngine.getTheme().id;
  document.documentElement.setAttribute('data-theme', themeId);
  render(antdTheme);
}

// 主题切换 — App 里通过 Select 触发（兼容旧接口）
(window as any).__applyTheme = (mode: 'light' | 'dark') => {
  try { localStorage.setItem('wdclaw-theme', mode); } catch {}
  themeEngine.setTheme(mode);
  renderFromTheme();
};

// 启动时读取主题
async function bootstrap() {
  try {
    const cfg = await (window as any).electronAPI.getConfig();
    const saved = localStorage.getItem('wdclaw-theme');
    const mode = (cfg?.ui?.theme || saved || 'light') as 'light' | 'dark';
    // 初始化主题引擎
    themeEngine.applyTheme();
    // 用主题引擎的配置渲染
    renderFromTheme();
  } catch {
    themeEngine.applyTheme();
    renderFromTheme();
  }
}

bootstrap();

// 监听主题引擎变化 — 当用户在 ThemePickerPanel 切换主题时自动重渲染
themeEngine.onChange(() => {
  requestAnimationFrame(() => renderFromTheme());
});
