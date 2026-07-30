// ============================================================
// 专家广场 - Expert Marketplace（完整版）// 支持: 本地专家 + 远程安装 + 我的专家 + 添加到侧边栏
// ============================================================
import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Input, Modal, Empty, Spin, message, Tooltip, Form, Select, Slider, Tabs, Badge, Segmented, Avatar, List, Divider } from 'antd';
import {
  RobotOutlined, SearchOutlined, PlusOutlined, DeleteOutlined, EyeOutlined,
  EditOutlined, StarOutlined, StarFilled, PlusCircleOutlined, ThunderboltOutlined,
  FireOutlined, ClockCircleOutlined, DownloadOutlined, AppstoreOutlined,
  CodeOutlined, EditOutlined as EditIcon, ToolOutlined, BarChartOutlined,
  CameraOutlined, BookOutlined, HeartOutlined, CloudDownloadOutlined,
  CheckCircleOutlined, SyncOutlined, UserOutlined,
} from '@ant-design/icons';

export interface Expert {
  id: string;
  name: string;
  description: string;
  emoji?: string;
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
  installed?: boolean;
  downloads?: number;
  rating?: number;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
}

const CATEGORIES = [
  { key: 'all', label: '全部', icon: <RobotOutlined /> },
  { key: 'coding', label: '编程开发', icon: <CodeOutlined />, color: 'var(--accent)' },
  { key: 'writing', label: '内容创作', icon: <EditIcon />, color: '#52c41a' },
  { key: 'productivity', label: '效率工具', icon: <ToolOutlined />, color: '#722ed1' },
  { key: 'analysis', label: '数据研究', icon: <BarChartOutlined />, color: '#fa8c16' },
  { key: 'design', label: '设计创意', icon: <CameraOutlined />, color: '#eb2f96' },
  { key: 'education', label: '教育学习', icon: <BookOutlined />, color: '#13c2c2' },
];

export default function ExpertMarketplace() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'market' | 'installed'>('market');
  const [previewExpert, setPreviewExpert] = useState<Expert | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentUsed, setRecentUsed] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteExperts, setRemoteExperts] = useState<Expert[]>([]);

  useEffect(() => {
    loadExperts();
    loadUserPreferences();
  }, []);

  const loadExperts = async () => {
    try {
      setLoading(true);
      const list = await (window.electronAPI as any).listExperts();
      setExperts(list);
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  const loadRemoteExperts = async () => {
    try {
      setRemoteLoading(true);
      const list = await (window.electronAPI as any).fetchRemoteExperts();
      setRemoteExperts(list);
    } catch { message.error('加载远程专家失败'); }
    finally { setRemoteLoading(false); }
  };

  const loadUserPreferences = async () => {
    try {
      const fav = localStorage.getItem('wdclaw_expert_favs');
      if (fav) setFavorites(JSON.parse(fav));
      const rec = localStorage.getItem('wdclaw_expert_recent');
      if (rec) setRecentUsed(JSON.parse(rec));
    } catch {}
  };

  const saveFavorites = (newFavs: string[]) => {
    setFavorites(newFavs);
    localStorage.setItem('wdclaw_expert_favs', JSON.stringify(newFavs));
  };

  const toggleFavorite = (id: string) => {
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    saveFavorites(newFavs);
  };

  const addToRecentUsed = (id: string) => {
    const newRec = [id, ...recentUsed.filter(r => r !== id)].slice(0, 10);
    setRecentUsed(newRec);
    localStorage.setItem('wdclaw_expert_recent', JSON.stringify(newRec));
  };

  const handlePreview = (expert: Expert) => {
    setPreviewExpert(expert);
    addToRecentUsed(expert.id);
  };

  const handleAddToSidebar = async (expert: Expert) => {
    try {
      const session = await window.electronAPI.createSession();
      await window.electronAPI.renameSession(session.id, `${expert.name}对话`);
      message.success('已在侧边栏创建活动对话');
      addToRecentUsed(expert.id);
    } catch { message.error('添加失败'); }
  };

  const handleInstallRemote = async (expert: Expert) => {
    try {
      const result = await (window.electronAPI as any).installRemoteExpert(expert);
      if (result?.ok) {
        message.success('专家已安装');
        loadExperts();
      } else {
        message.error('安装失败');
      }
    } catch { message.error('安装失败'); }
  };

  const handleCreate = () => {
    setEditingExpert(null);
    form.resetFields();
    form.setFieldsValue({ name: '', description: '', emoji: '🤖', systemPrompt: '', skills: [], category: 'productivity', temperature: 0.7, maxTokens: 4096 });
    setEditModalVisible(true);
  };

  const handleEdit = (expert: Expert) => {
    setEditingExpert(expert);
    form.setFieldsValue({
      name: expert.name, description: expert.description, emoji: expert.emoji || '🤖',
      systemPrompt: expert.systemPrompt, skills: expert.skills || [],
      modelId: expert.modelId, temperature: expert.temperature || 0.7,
      maxTokens: expert.maxTokens || 4096, category: expert.category || 'productivity',
    });
    setEditModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await (window.electronAPI as any).deleteExpert(id);
      if (result?.ok) { message.success('已删除'); loadExperts(); }
      else message.error('删除失败');
    } catch { message.error('删除失败'); }
  };

  const handleSaveExpert = async () => {
    try {
      const values = await form.validateFields();
      if (editingExpert) {
        await (window.electronAPI as any).updateExpert(editingExpert.id, values);
        message.success('已更新');
      } else {
        await (window.electronAPI as any).createExpert(values);
        message.success('已创建');
      }
      setEditModalVisible(false);
      loadExperts();
    } catch { message.error('保存失败'); }
  };

  // Filter experts
  const allLocalExperts = experts;
  const filteredLocalExperts = allLocalExperts.filter((e) => {
    const matchSearch = !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === 'all' || e.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const filteredRemoteExperts = remoteExperts.filter((e) => {
    const matchSearch = !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === 'all' || e.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const featuredExperts = filteredRemoteExperts.filter(e => e.featured);
  const popularExperts = filteredRemoteExperts.filter(e => e.popular && !e.featured);

  const builtinLocalExperts = filteredLocalExperts.filter(e => e.builtin);
  const customLocalExperts = filteredLocalExperts.filter(e => !e.builtin);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ fontSize: 20, color: '#722ed1' }} />
            <span style={{ fontSize: 18, fontWeight: 700 }}>专家广场</span>
            <Tag color="purple">{experts.length + remoteExperts.length}</Tag>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
            创建专家
          </Button>
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-placeholder)' }} />}
          placeholder="搜索专家名称、描述或标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear size="large" style={{ borderRadius: 8 }}
        />
      </div>

      {/* Category Tags */}
      <div style={{ padding: '8px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 12px', borderRadius: 16,
                border: activeCategory === cat.key ? `1px solid ${cat.color || 'var(--border-default)'}` : '1px solid var(--border-light)',
                background: activeCategory === cat.key ? `${cat.color}15` : 'var(--bg-primary)',
                color: activeCategory === cat.key ? (cat.color || 'var(--text-primary)') : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >{cat.icon}<span>{cat.label}</span></button>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ padding: '8px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}>
        <Segmented size="small" value={activeTab} onChange={(v) => setActiveTab(v as any)}
          options={[
            { label: `我的专家 (${experts.length})`, value: 'installed' },
            { label: `发现更多`, value: 'market' },
          ]}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
        ) : activeTab === 'installed' ? (
          <>
            {/* My installed experts */}
            {builtinLocalExperts.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 8 }}>
                  <RobotOutlined style={{ color: '#722ed1' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>内置专家</span>
                  <Tag color="purple" style={{ fontSize: 10, padding: '0 4px', height: 16, lineHeight: '14px' }}>{builtinLocalExperts.length}</Tag>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {builtinLocalExperts.map(expert => (
                    <ExpertCard key={expert.id} expert={expert} onPreview={handlePreview} onEdit={handleEdit} onDelete={handleDelete} onAddToSidebar={handleAddToSidebar} isFavorite={favorites.includes(expert.id)} onToggleFavorite={toggleFavorite} />
                  ))}
                </div>
              </>
            )}
            {customLocalExperts.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <UserOutlined style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>我的专家</span>
                  <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', height: 16, lineHeight: '14px' }}>{customLocalExperts.length}</Tag>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {customLocalExperts.map(expert => (
                    <ExpertCard key={expert.id} expert={expert} onPreview={handlePreview} onEdit={handleEdit} onDelete={handleDelete} onAddToSidebar={handleAddToSidebar} isFavorite={favorites.includes(expert.id)} onToggleFavorite={toggleFavorite} />
                  ))}
                </div>
              </>
            )}
            {filteredLocalExperts.length === 0 && (
              <Empty description="还没有专家，去发现更多安装吧">
                <Button type="primary" onClick={() => setActiveTab('market')}>发现更多专家</Button>
              </Empty>
            )}
          </>
        ) : (
          <>
            {/* Remote Marketplace */}
            {remoteExperts.length === 0 && !remoteLoading ? (
              <>
                <Empty description="暂无可安装的远程专家">
                  <Button type="primary" icon={<CloudDownloadOutlined />} onClick={loadRemoteExperts}>刷新</Button>
                </Empty>
              </>
            ) : remoteLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <Spin tip="正在加载..." />
              </div>
            ) : (
              <>
                {/* Featured */}
                {featuredExperts.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 8 }}>
                      <ThunderboltOutlined style={{ color: '#faad14' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>精选推荐</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                      {featuredExperts.map(expert => (
                        <RemoteExpertCard key={expert.id} expert={expert} onPreview={handlePreview} onInstall={handleInstallRemote} onAddToSidebar={handleAddToSidebar} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular */}
                {popularExperts.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <FireOutlined style={{ color: '#ff4d4f' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>热门专家</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {popularExperts.map(expert => (
                        <RemoteExpertCard key={expert.id} expert={expert} onPreview={handlePreview} onInstall={handleInstallRemote} onAddToSidebar={handleAddToSidebar} />
                      ))}
                    </div>
                  </div>
                )}

                {/* All Remote */}
                {filteredRemoteExperts.filter(e => !e.featured && !e.popular).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <AppstoreOutlined style={{ color: '#52c41a' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>更多专家</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                      {filteredRemoteExperts.filter(e => !e.featured && !e.popular).map(expert => (
                        <RemoteExpertCard key={expert.id} expert={expert} onPreview={handlePreview} onInstall={handleInstallRemote} onAddToSidebar={handleAddToSidebar} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        title={previewExpert ? <span>{previewExpert.emoji || '🤖'} {previewExpert.name}</span> : '专家详情'}
        open={!!previewExpert}
        onCancel={() => setPreviewExpert(null)}
        footer={[
          activeTab === 'market' && previewExpert && (
            <Button key="install" type="primary" icon={<CloudDownloadOutlined />} onClick={() => { handleInstallRemote(previewExpert); setPreviewExpert(null); }}>
              安装
            </Button>
          ),
          activeTab === 'installed' && previewExpert && (
            <Button key="sidebar" icon={<PlusCircleOutlined />} onClick={() => { handleAddToSidebar(previewExpert); }}>添加到侧边栏</Button>
          ),
          <Button key="close" onClick={() => setPreviewExpert(null)}>关闭</Button>,
        ]}
        width={640}
      >
        {previewExpert && (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 14 }}>{previewExpert.description}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {previewExpert.builtin && <Tag color="purple">内置</Tag>}
              {!previewExpert.builtin && !previewExpert.installed && <Tag color="blue">未安装</Tag>}
              {previewExpert.installed && <Tag color="green">已安装</Tag>}
              {previewExpert.category && <Tag color="cyan">{CATEGORIES.find(c => c.key === previewExpert.category)?.label || previewExpert.category}</Tag>}
              {(previewExpert.tags || []).map(tag => <Tag key={tag}>{tag}</Tag>)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              {previewExpert.downloads && <span style={{ marginRight: 16 }}>下载 {previewExpert.downloads.toLocaleString()}</span>}
              {previewExpert.rating && <span style={{ marginRight: 16 }}>⭐ {previewExpert.rating}</span>}
              {previewExpert.author && <span>作者: {previewExpert.author}</span>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>系统提示词</div>
              <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, maxHeight: 300, overflowY: 'auto' }}>
                <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{previewExpert.systemPrompt}</pre>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RobotOutlined style={{ color: '#722ed1' }} /><span>{editingExpert ? '编辑专家' : '创建专家'}</span></div>}
        open={editModalVisible} onCancel={() => setEditModalVisible(false)} onOk={handleSaveExpert}
        okText={editingExpert ? '保存修改' : '创建'} width={640} destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false} style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="如：代码专家" /></Form.Item>
            <Form.Item name="emoji" label="Emoji"><Input placeholder="🤖" /></Form.Item>
          </div>
          <Form.Item name="description" label="描述" rules={[{ required: true, message: '请输入描述' }]}><Input.TextArea rows={2} placeholder="简述能力" /></Form.Item>
          <Form.Item name="systemPrompt" label="系统提示词" rules={[{ required: true, message: '请输入系统提示词' }]}><Input.TextArea rows={6} placeholder="定义人格、能力和行为准则" /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="category" label="分类"><Select placeholder="选择分类">{CATEGORIES.filter(c => c.key !== 'all').map(c => <Select.Option key={c.key} value={c.key}>{c.icon} {c.label}</Select.Option>)}</Select></Form.Item>
            <Form.Item name="modelId" label="指定模型（可选）"><Select placeholder="默认模型" allowClear><Select.Option value="glm-4-flash">GLM-4 Flash</Select.Option><Select.Option value="glm-4-plus">GLM-4 Plus</Select.Option></Select></Form.Item>
          </div>
          <Form.Item name="temperature" label="温度">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Slider min={0} max={2} step={0.1} style={{ flex: 1 }} />
              <span style={{ fontSize: 12, width: 30, textAlign: 'right' }}>{(Form.useWatch('temperature', form) ?? 0.7).toFixed(1)}</span>
            </div>
          </Form.Item>
          <Form.Item name="maxTokens" label="最大 Token"><Select defaultValue={4096}><Select.Option value={2048}>2048</Select.Option><Select.Option value={4096}>4096</Select.Option><Select.Option value={8192}>8192</Select.Option><Select.Option value={16384}>16384</Select.Option><Select.Option value={32768}>32768</Select.Option></Select></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function ExpertCard({ expert, onPreview, onEdit, onDelete, onAddToSidebar, isFavorite, onToggleFavorite }: any) {
  const category = CATEGORIES.find(c => c.key === expert.category);
  return (
    <Card size="small" style={{ borderRadius: 12, border: '1px solid var(--border-light)', transition: 'all 0.2s' }} hoverable
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#722ed1'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(114,46,209,0.12)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 28 }}>{expert.emoji || '🤖'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{expert.name}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                {expert.builtin ? <Tag color="purple" style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px' }}>内置</Tag> : <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px' }}>我的</Tag>}
                {expert.popular && <Tag color="red" style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px' }}>🔥</Tag>}
                {category && <Tag color={category.color} style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px' }}>{category.label}</Tag>}
              </div>
            </div>
          </div>
          <Button size="small" type="text" icon={isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined style={{ color: 'var(--border-default)' }} />}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(expert.id); }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, minHeight: 36 }}>{expert.description}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(expert.skills || []).slice(0, 3).map((s: string) => <Tag key={s} style={{ fontSize: 10, padding: '0 4px', height: 16, lineHeight: '14px', margin: 0 }}>{s}</Tag>)}
          {(expert.skills || []).length > 3 && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{expert.skills.length - 3}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
          <Tooltip title="查看详情"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => onPreview(expert)} /></Tooltip>
          <Tooltip title="添加到侧边栏"><Button size="small" type="text" icon={<PlusCircleOutlined />} onClick={() => onAddToSidebar(expert)} /></Tooltip>
          <Tooltip title="编辑"><Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEdit(expert)} /></Tooltip>
          {!expert.builtin && <Tooltip title="删除"><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(expert.id)} /></Tooltip>}
        </div>
      </div>
    </Card>
  );
}

function RemoteExpertCard({ expert, onPreview, onInstall, onAddToSidebar }: any) {
  const [installing, setInstalling] = useState(false);
  const category = CATEGORIES.find(c => c.key === expert.category);

  const handleInstall = async () => {
    setInstalling(true);
    await onInstall(expert);
    setInstalling(false);
  };

  return (
    <Card size="small" style={{ borderRadius: 12, border: '1px solid var(--border-light)', transition: 'all 0.2s' }} hoverable
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#722ed1'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(114,46,209,0.12)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 28 }}>{expert.emoji || '🤖'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{expert.name}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                {expert.featured && <Tag color="gold" style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px' }}>⭐ 推荐</Tag>}
                {expert.popular && <Tag color="red" style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px' }}>🔥 热门</Tag>}
                {category && <Tag color={category.color} style={{ fontSize: 10, padding: '0 4px', height: 18, lineHeight: '16px' }}>{category.label}</Tag>}
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, minHeight: 36 }}>{expert.description}</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(expert.tags || []).slice(0, 3).map((t: string) => <Tag key={t} style={{ fontSize: 10, padding: '0 4px', height: 16, lineHeight: '14px', margin: 0 }}>{t}</Tag>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 4 }}>
          <span>⭐ {expert.downloads?.toLocaleString()}</span>
          {expert.rating && <span>⭐ {expert.rating}</span>}
          {expert.author && <span>@{expert.author}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
          <Tooltip title="查看详情"><Button size="small" type="text" icon={<EyeOutlined />} onClick={() => onPreview(expert)} /></Tooltip>
          <Button size="small" type="primary" icon={<CloudDownloadOutlined />} loading={installing} onClick={handleInstall}>
            安装
          </Button>
        </div>
      </div>
    </Card>
  );
}
