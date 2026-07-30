// ============================================================
// 顶部导航栏
// ============================================================
import React, { useState, useEffect } from 'react';
import { MessageSquare, Settings, Terminal } from 'lucide-react';
import type { Page } from '../../App';
import { themeEngine } from '../settings/themeEngine';

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export default function Header({ activePage, onNavigate }: Props) {
  const [theme, setTheme] = useState(themeEngine.getTheme());

  useEffect(() => {
    const unsub = themeEngine.onChange((t) => setTheme(t));
    return unsub;
  }, []);

  const brandName = theme.brandSubtitle || '吴东的Claw智能助手';
  return (
    <header style={{
      height: 48, display: 'flex', alignItems: 'center', padding: '0 16px',
      background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)',
      userSelect: 'none', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32 }}>
        <Terminal size={20} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.025em', color: 'var(--text-primary)' }}>{brandName}</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onNavigate('chat')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6, fontSize: 14,
            transition: 'all 0.15s', border: 'none', cursor: 'pointer',
            background: activePage === 'chat' ? 'var(--accent-light)' : 'transparent',
            color: activePage === 'chat' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          onMouseEnter={e => { if (activePage !== 'chat') e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (activePage !== 'chat') e.currentTarget.style.background = 'transparent'; }}
        >
          <MessageSquare size={15} />
          <span>对话</span>
        </button>
        <button
          onClick={() => onNavigate('settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6, fontSize: 14,
            transition: 'all 0.15s', border: 'none', cursor: 'pointer',
            background: activePage === 'settings' ? 'var(--accent-light)' : 'transparent',
            color: activePage === 'settings' ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          onMouseEnter={e => { if (activePage !== 'settings') e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (activePage !== 'settings') e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings size={15} />
          <span>设置</span>
        </button>
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status Text (DreamSkin) */}
      {theme.statusText && (
        <div style={{
          fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '1px',
          padding: '2px 8px', borderRadius: 4,
          border: '1px solid var(--border-light)',
          background: 'var(--bg-tertiary)', marginRight: 12,
        }}>
          {theme.statusText}
        </div>
      )}

      {/* KUN 右上角徽章 */}
      {theme.badgeTopRight && (
        <div className="kun-badge" style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--accent)',
          padding: '3px 10px', borderRadius: 12,
          border: '1px solid var(--border-default)',
          background: 'var(--accent-bg)',
          marginRight: 12, letterSpacing: '0.5px',
        }}>
          {theme.badgeTopRight}
        </div>
      )}
    </header>
  );
}
