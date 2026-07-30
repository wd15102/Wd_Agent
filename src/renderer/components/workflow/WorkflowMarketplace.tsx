// ============================================================
// 工作流模板市场 UI
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Tag, Tooltip, Empty, Modal, Input, Select, message, Popconfirm, Divider, Badge } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  BranchesOutlined,
} from '@ant-design/icons';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  steps: any[];
  createdAt: number;
  updatedAt: number;
  runCount: number;
  source?: string;
  version: number;
}

const CATEGORIES = ['全部', '对话导入', '代码开发', '数据处理', '日常办公', '自定义'];

export default function WorkflowMarketplace() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<WorkflowTemplate> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.electronAPI.listWorkflows();
      setTemplates(list);
    } catch {
      // IPC 未注册时用空列表
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // 监听执行事件
  useEffect(() => {
    const startedHandler = (_e: any, data: any) => {
      setRunningIds(prev => new Set(prev).add(data.templateId));
    };
    const completedHandler = (_e: any, data: any) => {
      setRunningIds(prev => {
        const next = new Set(prev);
        next.delete(data.templateId);
        return next;
      });
      message.success(`工作流 "${data.templateName}" 执行完成`);
      loadTemplates();
    };
    const errorHandler = (_e: any, data: any) => {
      setRunningIds(prev => {
        const next = new Set(prev);
        next.delete(data.templateId);
        return next;
      });
      message.error(`工作流执行失败: ${data.error}`);
    };

    window.electronAPI.onWorkflowStarted?.(startedHandler);
    window.electronAPI.onWorkflowCompleted?.(completedHandler);
    window.electronAPI.onWorkflowError?.(errorHandler);

    return () => {};
  }, [loadTemplates]);

  const handleSave = async () => {
    if (!editingTemplate?.name?.trim()) {
      message.warning('请填写模板名称');
      return;
    }
    try {
      if (editingTemplate.id) {
        await window.electronAPI.updateWorkflow(editingTemplate.id, editingTemplate);
        message.success('模板已更新');
      } else {
        await window.electronAPI.createWorkflow({
          name: editingTemplate.name!,
          description: editingTemplate.description || '',
          category: editingTemplate.category || '自定义',
          tags: editingTemplate.tags || [],
          steps: editingTemplate.steps || [],
        });
        message.success('模板已创建');
      }
      setShowEditor(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      message.error(`保存失败: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteWorkflow(id);
    message.success('模板已删除');
    loadTemplates();
  };

  const handleRun = async (template: WorkflowTemplate) => {
    if (runningIds.has(template.id)) {
      message.warning('模板正在执行中');
      return;
    }
    try {
      await window.electronAPI.runWorkflow(template.id);
      message.success('已开始执行');
    } catch (err: any) {
      message.error(err.message || '执行失败');
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate({
      name: '',
      description: '',
      category: '自定义',
      tags: [],
      steps: [],
    });
    setShowEditor(true);
  };

  const filteredTemplates = templates.filter(t => {
    const matchCategory = selectedCategory === '全部' || t.category === selectedCategory;
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BranchesOutlined style={{ fontSize: 18, color: 'var(--accent)' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>工作流模板</span>
            <Tag color="default">{templates.length}</Tag>
            {runningIds.size > 0 && <Tag color="processing"><LoadingOutlined /> {runningIds.size} 执行中</Tag>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadTemplates}>刷新</Button>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleNewTemplate}>新建模板</Button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <Tag
              key={cat}
              color={selectedCategory === cat ? 'blue' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Tag>
          ))}
          <Input.Search
            placeholder="搜索模板..."
            size="small"
            style={{ width: 180 }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onSearch={setSearchQuery}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <ReloadOutlined spin style={{ fontSize: 24, color: 'var(--accent)' }} />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Empty description="暂无工作流模板" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewTemplate}>创建第一个模板</Button>
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTemplates.map((t) => {
              const isRunning = runningIds.has(t.id);
              return (
                <div key={t.id} style={{
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  border: `1px solid ${isRunning ? 'var(--accent)' : 'var(--border-light)'}`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {isRunning ? <LoadingOutlined style={{ color: 'var(--accent)' }} /> : <FileTextOutlined style={{ color: 'var(--text-tertiary)' }} />}
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                        {t.source === 'conversation' && <Tag color="cyan" style={{ fontSize: 10 }}>对话导入</Tag>}
                        <Tag color="default" style={{ fontSize: 10 }}>{t.category}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {t.description || '无描述'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-placeholder)' }}>
                        <span>{t.steps?.length || 0} 个步骤</span>
                        <span>执行 {t.runCount} 次</span>
                        {t.updatedAt && <span>更新: {formatTime(t.updatedAt)}</span>}
                        {t.tags?.filter(tag => !['from-conversation'].includes(tag)).map(tag => (
                          <Tag key={tag} style={{ fontSize: 10, margin: 0 }}>{tag}</Tag>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                      <Tooltip title="立即执行">
                        <Button size="small" type="text" icon={<ThunderboltOutlined />} style={{ color: 'var(--accent)' }} loading={isRunning} onClick={() => handleRun(t)} />
                      </Tooltip>
                      <Tooltip title="编辑">
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditingTemplate({ ...t }); setShowEditor(true); }} />
                      </Tooltip>
                      <Popconfirm title="确定删除此模板？" onConfirm={() => handleDelete(t.id)} okText="删除">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <Modal
        title={editingTemplate?.id ? '编辑工作流模板' : '新建工作流模板'}
        open={showEditor}
        onCancel={() => { setShowEditor(false); setEditingTemplate(null); }}
        onOk={handleSave}
        okText="保存"
        width={560}
      >
        {editingTemplate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>模板名称</label>
              <Input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="如：每日代码审查" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>描述</label>
              <Input.TextArea value={editingTemplate.description} onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })} rows={2} placeholder="描述这个工作流的用途..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>分类</label>
              <Select value={editingTemplate.category} onChange={v => setEditingTemplate({ ...editingTemplate, category: v })}>
                {CATEGORIES.filter(c => c !== '全部').map(c => (
                  <Select.Option key={c} value={c}>{c}</Select.Option>
                ))}
              </Select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>标签（逗号分隔）</label>
              <Input value={editingTemplate.tags?.join(', ')} onChange={e => setEditingTemplate({ ...editingTemplate, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="如：代码, 审查, 自动化" />
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>步骤编辑</div>
              <div style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>
                当前 {editingTemplate.steps?.length || 0} 个步骤。步骤编辑器正在开发中，敬请期待。
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
