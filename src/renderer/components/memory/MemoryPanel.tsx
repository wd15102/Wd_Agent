// ============================================================
// 记忆面板 - Memory Panel（QClaw 风格）
// ============================================================
import React, { useState, useEffect } from 'react';
import { Button, Input, Tabs, Empty, Spin, message, Tooltip, Popconfirm, Divider } from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { MemoryData } from '../../env';

export default function MemoryPanel() {
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingLongTerm, setEditingLongTerm] = useState(false);
  const [longTermDraft, setLongTermDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState('long-term');

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.loadMemory();
      setMemory(data);
      setLongTermDraft(data.longTerm);
    } catch {
      message.error('加载记忆失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLongTerm = async () => {
    await window.electronAPI.updateLongTermMemory(longTermDraft);
    message.success('长期记忆已更新');
    setEditingLongTerm(false);
    loadMemory();
  };

  const handleAppendDaily = async () => {
    const content = prompt('添加今日笔记');
    if (!content?.trim()) return;
    await window.electronAPI.appendMemory(content.trim());
    message.success('笔记已添加');
    loadMemory();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await window.electronAPI.searchMemory(searchQuery.trim());
    setSearchResults(results);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ fontSize: 18, color: 'var(--accent)' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>记忆管理</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<PlusOutlined />} onClick={handleAppendDaily}>
              添加笔记
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadMemory}>
              刷新
            </Button>
          </div>
        </div>
        <Input.Search
          placeholder="搜索记忆内容..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSearch={handleSearch}
          allowClear
          enterButton={<SearchOutlined />}
        />
      </div>

      {/* Search Results */}
      {searchResults !== null && (
        <div style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
            搜索结果: {searchResults.length} 条
          </div>
          {searchResults.length === 0 ? (
            <Empty description="未找到匹配的记忆" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {searchResults.map((item, idx) => (
                <div key={idx} style={{ padding: 8, background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: 12 }}>
                  <span style={{ color: 'var(--accent)', marginRight: 8 }}>[{item.date}]</span>
                  {item.content.slice(0, 200)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: '0 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-light)' }}>
        <Tabs
          size="small"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'long-term', label: '长期记忆' },
            { key: 'daily', label: '每日笔记' },
          ]}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {activeTab === 'long-term' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
                长期记忆 - 精华摘要，注入 System Prompt
              </div>
              {editingLongTerm ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="small" onClick={() => { setEditingLongTerm(false); setLongTermDraft(memory?.longTerm || ''); }}>
                    取消
                  </Button>
                  <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSaveLongTerm}>
                    保存
                  </Button>
                </div>
              ) : (
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditingLongTerm(true)}>
                  编辑
                </Button>
              )}
            </div>
            {editingLongTerm ? (
              <Input.TextArea
                value={longTermDraft}
                onChange={(e) => setLongTermDraft(e.target.value)}
                rows={15}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
              />
            ) : (
              <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, minHeight: 200, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                {memory?.longTerm || <span style={{ color: 'var(--text-placeholder)' }}>暂无长期记忆，点击编辑添加...</span>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {memory?.daily && memory.daily.length > 0 ? (
              [...memory.daily].reverse().map((entry) => (
                <div key={entry.date} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ClockCircleOutlined style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{entry.date}</span>
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {entry.content}
                  </div>
                </div>
              ))
            ) : (
              <Empty description="暂无每日笔记" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
