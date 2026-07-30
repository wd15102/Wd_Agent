// ============================================================
// 主题选择器 - Theme Picker Panel
// 支持: 主题预览、自定义CSS、背景图片、图片取色
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Modal, Empty, Spin, message, Tooltip, Slider, Tabs, Tag, Popconfirm, Segmented, Pagination } from 'antd';
import {
  AppstoreOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  CloudUploadOutlined, BgColorsOutlined, CodeOutlined, RollbackOutlined,
  CheckCircleOutlined, PlusOutlined, StarOutlined, FireOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { themeEngine, ThemeConfig, BUILT_IN_THEMES } from './themeEngine';

const { TextArea } = Input;

// 主题分类
const THEME_CATEGORIES = [
  { key: 'all', label: '全部', icon: <AppstoreOutlined /> },
  { key: 'basic', label: '基础', icon: <DesktopOutlined /> },
  { key: 'exclusive', label: '限定', icon: <FireOutlined /> },
  { key: 'custom', label: '自定义', icon: <StarOutlined /> },
];

const THEME_CATEGORY_MAP: Record<string, string> = {
  'light': 'basic', 'dark': 'basic', 'classic': 'basic', 'warm': 'basic',
  'codex-blue': 'basic', 'codex-yellow': 'basic', 'codex-red': 'basic',
  'codex-green': 'basic', 'codex-pink': 'basic', 'codex-purple': 'basic',
  'kun-exclusive': 'exclusive', 'dalao-dianyan': 'exclusive', 'wukong': 'exclusive',
};

const PAGE_SIZE = 8;

export default function ThemePickerPanel() {
  const [currentTheme, setCurrentTheme] = useState(themeEngine.getTheme());
  const [allThemes, setAllThemes] = useState<ThemeConfig[]>(themeEngine.getAllThemes());
  const [customCSS, setCustomCSS] = useState(themeEngine.getCustomCSS());
  const [cssModalVisible, setCssModalVisible] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeConfig | null>(null);
  const [bgModalVisible, setBgModalVisible] = useState(false);
  const [bgPreview, setBgPreview] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(currentTheme.backgroundOpacity ?? 0.15);
  const [bgBlur, setBgBlur] = useState(currentTheme.backgroundBlur ?? 0);
  // 分类 & 分页
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredThemes = useMemo(() => {
    if (activeCategory === 'all') return allThemes;
    if (activeCategory === 'custom') return allThemes.filter(t => t.id.startsWith('custom-'));
    return allThemes.filter(t => THEME_CATEGORY_MAP[t.id] === activeCategory);
  }, [allThemes, activeCategory]);

  const pagedThemes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredThemes.slice(start, start + PAGE_SIZE);
  }, [filteredThemes, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredThemes.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    const unsub = themeEngine.onChange((theme: ThemeConfig) => {
      setCurrentTheme(theme);
      setAllThemes(themeEngine.getAllThemes());
    });
    return unsub;
  }, []);

  const handleThemeSelect = (themeId: string) => {
    themeEngine.setTheme(themeId);
    message.success('主题已切换');
  };

  const handleCSSSave = () => {
    themeEngine.setCustomCSS(customCSS);
    setCssModalVisible(false);
    message.success('自定义 CSS 已保存');
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setBgPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleBgApply = () => {
    if (bgPreview) {
      themeEngine.setBackgroundImage(bgPreview, bgOpacity, bgBlur);
      message.success('背景图片已应用');
      setBgModalVisible(false);
    }
  };

  const handleBgRemove = () => {
    themeEngine.removeBackgroundImage();
    setBgPreview(null);
    message.success('背景图片已移除');
  };

  const handleCreateThemeFromImage = async () => {
    if (!bgPreview) return;
    const name = `图片主题 ${new Date().toLocaleTimeString()}`;
    const theme = await themeEngine.createThemeFromImage(bgPreview, name);
    themeEngine.setTheme(theme.id);
    setBgModalVisible(false);
    message.success('已从图片生成主题');
  };

  const handleDeleteTheme = (themeId: string) => {
    themeEngine.deleteCustomTheme(themeId);
    message.success('主题已删除');
  };

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      {/* 当前主题 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <BgColorsOutlined style={{ color: '#8b5cf6' }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>当前主题</span>
          <Tag color="purple">{currentTheme.emoji} {currentTheme.name}</Tag>
        </div>
        <Card size="small" style={{ borderRadius: 12, background: currentTheme.colors.bgSecondary }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.values(currentTheme.colors).slice(0, 6).map((color, i) => (
                <div key={i} style={{ width: 24, height: 24, borderRadius: 6, background: color as string, border: '1px solid rgba(0,0,0,0.1)' }} />
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <Button size="small" icon={<CodeOutlined />} onClick={() => setCssModalVisible(true)}>
              自定义 CSS
            </Button>
            <Button size="small" icon={<CloudUploadOutlined />} onClick={() => setBgModalVisible(true)}>
              背景图片
            </Button>
          </div>
        </Card>
      </div>

      {/* 主题网格 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AppstoreOutlined style={{ color: '#52c41a' }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>选择主题</span>
        <Tag>{filteredThemes.length}</Tag>
      </div>

      {/* 分类筛选 */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={activeCategory}
          onChange={(val) => { setActiveCategory(String(val)); setCurrentPage(1); }}
          options={THEME_CATEGORIES.map(cat => ({
            value: cat.key,
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {cat.icon} {cat.label}
              </span>
            ),
          }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {pagedThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme.id === theme.id}
            onSelect={() => handleThemeSelect(theme.id)}
            onDelete={theme.id.startsWith('custom-') ? () => handleDeleteTheme(theme.id) : undefined}
          />
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, marginBottom: 8 }}>
          <Pagination
            current={currentPage}
            total={filteredThemes.length}
            pageSize={PAGE_SIZE}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
            size="small"
          />
        </div>
      )}

      {/* 自定义 CSS Modal */}
      <Modal
        title="自定义 CSS"
        open={cssModalVisible}
        onCancel={() => setCssModalVisible(false)}
        onOk={handleCSSSave}
        okText="保存"
        width={700}
      >
        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          编写自定义 CSS 来覆盖主题样式。所有 CSS 变量都可以在 globals.css 中找到。
        </div>
        <TextArea
          value={customCSS}
          onChange={(e) => setCustomCSS(e.target.value)}
          placeholder={`/* 示例 CSS */
:root {
  --accent: #ff6b6b;
  --bg-primary: var(--text-primary);
}

/* 自定义滚动条 */
::-webkit-scrollbar-thumb {
  background: var(--accent);
}`}
          rows={15}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />
      </Modal>

      {/* 背景图片 Modal */}
      <Modal
        title="背景图片"
        open={bgModalVisible}
        onCancel={() => setBgModalVisible(false)}
        footer={[
          <Button key="remove" danger icon={<DeleteOutlined />} onClick={handleBgRemove}>移除</Button>,
          <Button key="fromImage" icon={<BgColorsOutlined />} onClick={handleCreateThemeFromImage} disabled={!bgPreview}>
            从图片生成主题
          </Button>,
          <Button key="apply" type="primary" onClick={handleBgApply} disabled={!bgPreview}>应用背景</Button>,
        ]}
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>上传图片作为背景（建议使用暗色低饱和度图片）</div>
            <input type="file" accept="image/*" onChange={handleBgImageUpload} style={{ display: 'none' }} id="bg-image-input" />
            <label htmlFor="bg-image-input">
              <div style={{
                border: '2px dashed var(--border-default)', borderRadius: 12, padding: 32, textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              >
                {bgPreview ? (
                  <img src={bgPreview} alt="预览" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                ) : (
                  <>
                    <CloudUploadOutlined style={{ fontSize: 32, color: 'var(--text-placeholder)' }} />
                    <div style={{ marginTop: 8, color: 'var(--text-tertiary)' }}>点击上传图片</div>
                  </>
                )}
              </div>
            </label>
          </div>

          {bgPreview && (
            <>
              <div>
                <div style={{ fontSize: 13, marginBottom: 8 }}>透明度: {Math.round(bgOpacity * 100)}%</div>
                <Slider min={0} max={100} value={bgOpacity * 100} onChange={(v) => setBgOpacity(v / 100)} />
              </div>
              <div>
                <div style={{ fontSize: 13, marginBottom: 8 }}>模糊: {bgBlur}px</div>
                <Slider min={0} max={50} value={bgBlur} onChange={setBgBlur} />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ThemeCard({ theme, isActive, onSelect, onDelete }: {
  theme: ThemeConfig;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const c = theme.colors;
  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        border: isActive ? `2px solid ${c.accent}` : '2px solid transparent',
        boxShadow: isActive ? `0 0 0 2px ${c.accent}33` : '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
    >
      {/* 主题预览色块 */}
      <div style={{ height: 80, background: c.bgPrimary, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderRadius: 8, background: c.bgSecondary, padding: 8 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: c.accent }} />
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: c.accent, opacity: 0.3 }} />
          </div>
          <div style={{ height: 3, borderRadius: 2, background: c.textTertiary, opacity: 0.3, marginBottom: 3 }} />
          <div style={{ height: 3, borderRadius: 2, background: c.textTertiary, opacity: 0.2, width: '70%' }} />
        </div>
        {isActive && (
          <div style={{ position: 'absolute', top: 4, right: 4, background: c.accent, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircleOutlined style={{ color: 'var(--bg-primary)', fontSize: 12 }} />
          </div>
        )}
      </div>

      {/* 主题信息 */}
      <div style={{ padding: '8px 12px', background: c.bgSecondary }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>
            {theme.emoji} {theme.name}
          </span>
          {onDelete && (
            <Popconfirm title="删除此主题？" onConfirm={(e) => { e?.stopPropagation(); onDelete(); }}>
              <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 12 }} onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
          {[c.bgPrimary, c.bgSecondary, c.accent, c.textPrimary, c.borderDefault].map((color, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
