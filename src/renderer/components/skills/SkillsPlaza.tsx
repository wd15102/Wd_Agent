// ============================================================
// 技能广场 - Skills Plaza（SkillHub 风格完整版）
// 支持: 远程安装、选择安装到 Agent、我的技能、发现更多
// ============================================================
import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Input, Modal, Empty, Spin, message, Tooltip, Select, Rate } from 'antd';
import {
  AppstoreOutlined, SearchOutlined, DownloadOutlined, CheckCircleOutlined,
  CloudDownloadOutlined, EyeOutlined, DeleteOutlined, CodeOutlined,
  CloudOutlined, ToolOutlined, PlusOutlined, EditOutlined as EditIcon,
  CameraOutlined, BookOutlined, BarChartOutlined, RobotOutlined,
  UserOutlined, LinkOutlined,
} from '@ant-design/icons';

export interface Skill {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  path?: string;
  installedAt?: number;
  category?: string;
  author?: string;
  version?: string;
  downloads?: number;
  rating?: number;
  tags?: string[];
  homepage?: string;
  installed?: boolean;
  sources?: string[];
}

const SKILLHUB_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'writing', label: '写作' },
  { key: 'coding', label: '编程' },
  { key: 'productivity', label: '效率' },
  { key: 'analysis', label: '分析' },
  { key: 'design', label: '设计' },
  { key: 'marketing', label: '营销' },
  { key: 'research', label: '研究' },
  { key: 'education', label: '教育' },
  { key: 'entertainment', label: '娱乐' },
];

export default function SkillsPlaza() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [remoteSkills, setRemoteSkills] = useState<Skill[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [clawhubSkills, setClawhubSkills] = useState<Skill[]>([]);
  const [clawhubLoading, setClawhubLoading] = useState(false);
  const [clawhubLoggedIn, setClawhubLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'installed' | 'clawHub'>('installed');
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [installingSkill, setInstallingSkill] = useState<Skill | null>(null);

  useEffect(() => {
    loadSkills();
    loadAgents();
    loadClawHubSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const list = await (window.electronAPI as any).listSkills();
      setSkills(list);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  const loadAgents = async () => {
    try {
      const list = await (window.electronAPI as any).listExperts();
      setAgents(list);
      if (list.length > 0 && !selectedAgent) {
        setSelectedAgent(list[0].id);
      }
    } catch {}
  };

  const loadRemoteSkills = async () => {
    try {
      setRemoteLoading(true);
      const list = await (window.electronAPI as any).fetchRemoteSkills();
      setRemoteSkills(list);
    } catch { message.error('加载远程技能失败'); }
    finally { setRemoteLoading(false); }
  };

  const loadClawHubSkills = async () => {
    try {
      setClawhubLoading(true);
      const list = await (window.electronAPI as any).clawhubExplore(20);
      setClawhubSkills(list);
      const loggedIn = await (window.electronAPI as any).clawhubIsLoggedIn();
      setClawhubLoggedIn(loggedIn);
    } catch { /* 静默失败 */ }
    finally { setClawhubLoading(false); }
  };

  const searchClawHub = async (query: string) => {
    if (!query.trim()) {
      loadClawHubSkills();
      return;
    }
    try {
      setClawhubLoading(true);
      const list = await (window.electronAPI as any).clawhubSearch(query, 20);
      setClawhubSkills(list);
    } catch { /* 静默失败 */ }
    finally { setClawhubLoading(false); }
  };

  const handlePreview = async (skill: Skill) => {
    setPreviewSkill(skill);
    setPreviewContent(null);
    if (activeTab === 'clawHub' && !skill.installed) {
      setPreviewContent('## 该技能尚未安装\n\n请先安装此技能以查看完整文档。\n\n点击下方"安装"按钮开始安装。');
      return;
    }
    const content = await (window.electronAPI as any).readSkillContent(skill.id);
    setPreviewContent(content);
  };

  const handleInstallClick = (skill: Skill) => {
    setInstallingSkill(skill);
    setInstallModalVisible(true);
  };

  const handleConfirmInstall = async () => {
    if (!installingSkill) return;
    try {
      let result;
      // 判断是 ClawHub 技能还是本地技能
      if (activeTab === 'clawHub') {
        result = await (window.electronAPI as any).clawhubInstall(installingSkill.id);
      } else {
        result = await (window.electronAPI as any).installRemoteSkill(installingSkill);
      }
      if (result?.ok) {
        message.success(selectedAgent
          ? `已安装并分配给 ${agents.find(a => a.id === selectedAgent)?.name || selectedAgent}`
          : '技能已安装');
        setInstallModalVisible(false);
        loadSkills();
      } else {
        message.error(`安装失败: ${result?.error || '未知错误'}`);
      }
    } catch { message.error('安装失败'); }
  };

  const handleUninstall = async (id: string) => {
    try {
      let result;
      if (activeTab === 'clawHub') {
        result = await (window.electronAPI as any).clawhubUninstall(id);
      } else {
        result = await (window.electronAPI as any).uninstallSkill(id);
      }
      if (result?.ok) {
        message.success('已卸载');
        loadSkills();
      } else {
        message.error(`卸载失败: ${result?.error || '未知错误'}`);
      }
    } catch { message.error('卸载失败'); }
  };

  // Filter
  const filteredInstalled = skills.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !searchQuery || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.tags || []).some((t: string) => t.toLowerCase().includes(q));
    const matchCat = activeCategory === 'all' || s.category === activeCategory;
    return matchQ && matchCat;
  });

  const filteredRemote = remoteSkills.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !searchQuery || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.tags || []).some((t: string) => t.toLowerCase().includes(q));
    const matchCat = activeCategory === 'all' || s.category === activeCategory;
    return matchQ && matchCat;
  });

  const filteredClawHub = clawhubSkills.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchQ = !searchQuery || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q) || (s.tags || []).some((t: string) => t.toLowerCase().includes(q));
    const matchCat = activeCategory === 'all' || s.category === activeCategory;
    return matchQ && matchCat;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ fontSize: 20, color: '#52c41a' }} />
            <span style={{ fontSize: 18, fontWeight: 700 }}>技能广场</span>
            <Tag color="green">{skills.length}</Tag>
            <Tag color="blue">{clawhubSkills.length} 可安装</Tag>
          </div>
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-placeholder)' }} />}
          placeholder={activeTab === 'clawHub' ? '搜索 ClawHub 技能...' : '搜索已安装技能...'}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (activeTab === 'clawHub') {
              searchClawHub(e.target.value);
            }
          }}
          allowClear size="large" style={{ borderRadius: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => setActiveTab('installed')}
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === 'installed' ? '#52c41a' : '#f0f2f5',
              color: activeTab === 'installed' ? 'var(--bg-primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
            📦 我的技能
          </button>
          <button onClick={() => { setActiveTab('clawHub'); loadClawHubSkills(); }}
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === 'clawHub' ? 'var(--accent)' : '#f0f2f5',
              color: activeTab === 'clawHub' ? 'var(--bg-primary)' : 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
            🌐 ClawHub 市场
          </button>
        </div>
      </div>

      {/* Categories */}
      <div style={{ padding: '8px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {SKILLHUB_CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '5px 12px', borderRadius: 16,
                border: activeCategory === cat.key ? '1px solid #52c41a' : '1px solid var(--border-light)',
                background: activeCategory === cat.key ? '#52c41a15' : 'var(--bg-primary)',
                color: activeCategory === cat.key ? '#52c41a' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >{cat.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
        ) : activeTab === 'installed' ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>我的技能</span>
                <Tag color="green" style={{ fontSize: 10, padding: '0 4px', height: 16, lineHeight: '14px' }}>{filteredInstalled.length}</Tag>
              </div>
              {filteredInstalled.length === 0 ? (
                <Empty description="暂无已安装技能，点击下方按钮浏览 ClawHub 市场" style={{ marginTop: 40, marginBottom: 40 }}>
                  <Button type="primary" icon={<CloudDownloadOutlined />} onClick={() => { setActiveTab('clawHub'); loadClawHubSkills(); }}>浏览 ClawHub</Button>
                </Empty>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {filteredInstalled.map((skill) => (
                    <SkillCard key={skill.id} skill={skill} onPreview={handlePreview} onUninstall={handleUninstall} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <CloudOutlined style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>ClawHub 市场</span>
                {!clawhubLoggedIn && <Tag color="orange">未登录</Tag>}
                <Button size="small" type="link" icon={<CloudDownloadOutlined />} onClick={loadClawHubSkills} loading={clawhubLoading}>
                  刷新
                </Button>
              </div>
              {clawhubSkills.length === 0 && !clawhubLoading ? (
                <Empty description="暂无可安装技能" style={{ marginTop: 40 }}>
                  <Button type="primary" icon={<CloudDownloadOutlined />} onClick={loadClawHubSkills}>刷新</Button>
                </Empty>
              ) : clawhubLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin tip="正在从 ClawHub 加载..." /></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {filteredClawHub.map((skill) => (
                    <RemoteSkillCard key={skill.id} skill={skill} onPreview={handlePreview} onInstall={handleInstallClick} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        title={previewSkill ? `${previewSkill.emoji || '📦'} ${previewSkill.name}` : '技能详情'}
        open={!!previewSkill}
        onCancel={() => setPreviewSkill(null)}
        footer={[
          previewSkill?.path && (
            <Button key="uninstall" danger icon={<DeleteOutlined />} onClick={() => { handleUninstall(previewSkill.id); setPreviewSkill(null); }}>卸载</Button>
          ),
          !previewSkill?.path && previewSkill && (
            <Button key="install" type="primary" icon={<CloudDownloadOutlined />} onClick={() => { setInstallingSkill(previewSkill); setInstallModalVisible(true); }}>安装</Button>
          ),
          <Button key="close" onClick={() => setPreviewSkill(null)}>关闭</Button>,
        ]}
        width={640}
      >
        {previewSkill && (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 14 }}>{previewSkill.description}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {previewSkill.category && <Tag color="cyan">{previewSkill.category}</Tag>}
              {(previewSkill.tags || []).map((tag: string) => <Tag key={tag}>{tag}</Tag>)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              {previewSkill.downloads != null && <span style={{ marginRight: 16 }}>⭐ {previewSkill.downloads.toLocaleString()}</span>}
              {previewSkill.rating != null && <span style={{ marginRight: 16 }}><Rate disabled defaultValue={previewSkill.rating} style={{ fontSize: 12 }} /></span>}
              {previewSkill.author && <span>作者: {previewSkill.author}</span>}
              {previewSkill.version && <span style={{ marginLeft: 16 }}>v{previewSkill.version}</span>}
            </div>
            {previewContent ? (
              <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, maxHeight: 400, overflowY: 'auto' }}>
                <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>{previewContent}</pre>
              </div>
            ) : (
              <Empty description="暂无技能文档" style={{ marginTop: 32 }} />
            )}
          </>
        )}
      </Modal>

      {/* Install to Agent Modal */}
      <Modal
        title="安装到专家"
        open={installModalVisible}
        onCancel={() => setInstallModalVisible(false)}
        onOk={handleConfirmInstall}
        okText="安装"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            选择要分配给哪个 Agent 专家
          </div>
          <Select
            value={selectedAgent}
            onChange={setSelectedAgent}
            placeholder="选择 Agent 专家"
            style={{ width: '100%' }}
            options={agents.map(a => ({ value: a.id, label: `${a.emoji || '🤖'} ${a.name}` }))}
          />
          {installingSkill && (
            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{installingSkill.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{installingSkill.description}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function SkillCard({ skill, onPreview, onUninstall }: { skill: Skill; onPreview: (s: Skill) => void; onUninstall: (id: string) => void }) {
  return (
    <Card size="small" style={{ borderRadius: 12, border: '1px solid var(--border-light)', transition: 'all 0.2s' }} hoverable
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#52c41a'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(82,196,26,0.15)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{skill.emoji || '📦'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{skill.name}</div>
              {skill.category && <Tag color="cyan" style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px', marginTop: 2 }}>{skill.category}</Tag>}
            </div>
          </div>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, minHeight: 36 }}>{skill.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 4 }}>
          {skill.author && <span>@{skill.author}</span>}
          {skill.version && <span>v{skill.version}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
          <Tooltip title="查看详情"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => onPreview(skill)} /></Tooltip>
          <Tooltip title="卸载"><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onUninstall(skill.id)} /></Tooltip>
        </div>
      </div>
    </Card>
  );
}

function RemoteSkillCard({ skill, onPreview, onInstall }: { skill: Skill; onPreview: (s: Skill) => void; onInstall: (s: Skill) => void }) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    await onInstall(skill);
    setInstalling(false);
  };

  return (
    <Card size="small" style={{ borderRadius: 12, border: '1px solid var(--border-light)', transition: 'all 0.2s' }} hoverable
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#52c41a'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(82,196,26,0.15)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>{skill.emoji || '📦'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{skill.name}</div>
              {skill.category && <Tag color="cyan" style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px', marginTop: 2 }}>{skill.category}</Tag>}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, minHeight: 36 }}>{skill.description}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(skill.tags || []).slice(0, 3).map((t: string) => <Tag key={t} style={{ fontSize: 10, padding: '0 4px', height: 16, lineHeight: '14px', margin: 0 }}>{t}</Tag>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 4 }}>
          <span>⭐ {skill.downloads?.toLocaleString?.() || 0}</span>
          {skill.rating != null && <span>⭐ {skill.rating}</span>}
          {skill.author && <span>@{skill.author}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
          <Tooltip title="查看详情"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => onPreview(skill)} /></Tooltip>
          <Button size="small" type="primary" icon={<CloudDownloadOutlined />} loading={installing} onClick={handleInstall}>
            安装
          </Button>
        </div>
      </div>
    </Card>
  );
}
