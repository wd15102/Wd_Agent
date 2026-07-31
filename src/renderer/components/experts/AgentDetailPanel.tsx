import React, { useState, useEffect } from 'react';
import { Tag, Button, Input, Empty, message, Modal, Tooltip, Card, Avatar } from 'antd';
import {
  DeleteOutlined, CameraOutlined, CheckCircleOutlined,
  CalendarOutlined, PlusOutlined, MinusOutlined,
  MessageOutlined, RobotOutlined, CloseOutlined,
  InfoCircleOutlined, UserOutlined, AppstoreOutlined,
  ToolOutlined, SettingOutlined, SearchOutlined,
} from '@ant-design/icons';
import AvatarPicker from '../avatars/AvatarPicker';

export interface AgentExpert {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  avatar?: string;
  avatarUrl?: string;
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
  // Agent 类型系统
  family?: 'chat' | 'code' | 'cowork' | 'helper';
  tools?: string[];
  needsWorkspace?: boolean;
  messaging?: boolean;
  connectors?: boolean;
}

interface Props {
  expert: AgentExpert | null;
  onClose: () => void;
  onRefresh: () => void;
  onStartChat?: (expertId: string) => void;
}

export default function AgentDetailPanel({ expert, onClose, onRefresh, onStartChat }: Props) {
  const [activeTab, setActiveTab] = useState<'chat' | 'expert'>('expert');
  const [memoryContent, setMemoryContent] = useState('');
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedSkillIds, setAddedSkillIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (expert) {
      loadMemory();
      loadDiary();
      loadSkills();
    }
  }, [expert]);

  const loadMemory = async () => {
    if (!expert) return;
    try {
      const memory = await (window.electronAPI as any).loadMemory();
      setMemoryContent(memory?.longTerm || '');
    } catch { setMemoryContent(''); }
  };

  const loadDiary = async () => {
    if (!expert) return;
    try {
      const memory = await (window.electronAPI as any).loadMemory();
      setDiaryEntries(memory?.daily || []);
    } catch { setDiaryEntries([]); }
  };

  const loadSkills = async () => {
    if (!expert) return;
    try {
      const list = await (window.electronAPI as any).listSkills();
      setAllSkills(list);
      setAvailableSkills(list.filter((s: any) => !(expert.skills || []).includes(s.id)));
    } catch { /* ignore */ }
  };

  const handleSaveMemory = async () => {
    if (!expert) return;
    try {
      await (window.electronAPI as any).updateLongTermMemory(memoryContent);
      message.success('记忆已保存');
    } catch { message.error('保存失败'); }
  };

  const handleAvatarSelect = async (dataUrl: string) => {
    if (!expert) return;
    try {
      const result = await (window.electronAPI as any).uploadExpertAvatarFromData(expert.id, dataUrl);
      if (result.ok) {
        message.success('头像已更新');
        onRefresh();
      }
      else message.error(result.error || '上传失败');
    } catch (err: any) { message.error('上传失败: ' + err.message); }
  };

  const handleAddSkill = async (skillId: string) => {
    if (!expert) return;
    try {
      const result = await (window.electronAPI as any).addSkillToExpert(expert.id, skillId);
      if (result.ok) { message.success('技能已添加'); onRefresh(); loadSkills(); }
      else message.error(result.error || '添加失败');
    } catch (err: any) { message.error(err.message); }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!expert) return;
    try {
      const result = await (window.electronAPI as any).removeSkillFromExpert(expert.id, skillId);
      if (result.ok) { message.success('技能已移除'); onRefresh(); loadSkills(); }
      else message.error(result.error || '移除失败');
    } catch (err: any) { message.error(err.message); }
  };

  if (!expert) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-placeholder)' }}>
        <Empty description="请选择一个专家" />
      </div>
    );
  }

  const expertSkills = allSkills.filter(s => (expert.skills || []).includes(s.id));

  // 获取所有分类
  const categories = Array.from(new Set(availableSkills.map((s: any) => s.category).filter(Boolean)));

  // 过滤可用技能
  const filteredSkills = availableSkills.filter((skill: any) => {
    const matchSearch = !searchQuery || skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || (skill.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Top Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 16px' }}>
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'chat' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'chat' ? 'var(--accent)' : 'var(--text-tertiary)',
            fontWeight: activeTab === 'chat' ? 600 : 400,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <MessageOutlined /> 对话信息
        </button>
        <button
          onClick={() => setActiveTab('expert')}
          style={{
            flex: 1,
            padding: '12px 0',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'expert' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'expert' ? 'var(--accent)' : 'var(--text-tertiary)',
            fontWeight: activeTab === 'expert' ? 600 : 400,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <UserOutlined /> 专家信息
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>与 {expert.name} 的对话信息</div>
              <div style={{ fontSize: 12, color: 'var(--text-placeholder)', marginTop: 8 }}>这里将显示对话历史摘要</div>
            </div>
          </div>
        )}

        {activeTab === 'expert' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Avatar & Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowAvatarPicker(true)}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: expert.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, overflow: 'hidden', border: '2px solid var(--border-light)',
                }}>
                  {expert.avatarUrl ? (
                    <img src={expert.avatarUrl} alt={expert.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (expert.emoji || '🤖')}
                </div>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-primary)', cursor: 'pointer',
                }}>
                  <CameraOutlined style={{ fontSize: 10, color: 'var(--bg-primary)' }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{expert.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  {expert.family && (
                    <Tag color={expert.family === 'chat' ? 'green' : expert.family === 'code' ? 'blue' : expert.family === 'cowork' ? 'purple' : 'orange'} style={{ fontSize: 10, padding: '0 4px' }}>
                      {expert.family === 'chat' ? '💬 聊天' : expert.family === 'code' ? '💻 代码' : expert.family === 'cowork' ? '🤝 协作' : '🧠 助手'}
                    </Tag>
                  )}
                  <span>{expert.builtin ? '内置专家' : '自定义专家'} · {expert.category || '通用'}</span>
                </div>
              </div>
            </div>

            {/* Agent 工具集 */}
            {expert.tools && expert.tools.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ToolOutlined /> 工具集
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {expert.tools.map(tool => (
                    <Tag key={tool} color="cyan" style={{ fontSize: 11, padding: '2px 8px' }}>{tool}</Tag>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginTop: 6 }}>
                  此 Agent 只能使用以上工具，其他工具将被禁用
                </div>
              </div>
            )}

            {/* Agent 特性 */}
            {(expert.needsWorkspace || expert.messaging || expert.connectors) && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SettingOutlined /> 特性
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {expert.needsWorkspace && <Tag color="blue">📁 工作区</Tag>}
                  {expert.messaging && <Tag color="purple">📡 消息通道</Tag>}
                  {expert.connectors && <Tag color="cyan">🔌 连接器</Tag>}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <InfoCircleOutlined /> 简介
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{expert.description}</div>
            </div>

            {/* Tags */}
            {expert.tags && expert.tags.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {expert.tags.map(tag => <Tag key={tag} color="blue">{tag}</Tag>)}
                  {expert.popular && <Tag color="red">🔥 热门</Tag>}
                  {expert.featured && <Tag color="gold">⭐ 推荐</Tag>}
                </div>
              </div>
            )}

            {/* Memory */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RobotOutlined /> 记忆
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>专家的记忆内容，会在每次对话中作为上下文注入给 AI</div>
              <Input.TextArea
                value={memoryContent}
                onChange={(e) => setMemoryContent(e.target.value)}
                rows={4}
                placeholder="暂无记忆内容..."
                style={{ fontSize: 12 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={handleSaveMemory}>保存记忆</Button>
              </div>
            </div>

            {/* Diary */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarOutlined /> 日记
              </div>
              {diaryEntries.length === 0 ? (
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: 'var(--text-placeholder)' }}>
                  暂无日记
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {diaryEntries.map((entry, idx) => (
                    <div key={idx} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 4 }}><CalendarOutlined /> {entry.date}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>{entry.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills Grid */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span><AppstoreOutlined /> 技能 ({expertSkills.length})</span>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowAddSkillModal(true)}>添加</Button>
              </div>
              {expertSkills.length === 0 ? (
                <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: 'var(--text-placeholder)' }}>
                  暂未关联技能
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {expertSkills.map((skill: any) => (
                    <div
                      key={skill.id}
                      onClick={() => { setSelectedSkill(skill); setShowSkillModal(true); }}
                      style={{
                        padding: 12,
                        background: 'var(--bg-secondary)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        border: '1px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.background = '#e6f4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.background = 'var(--bg-secondary)';
                      }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{skill.emoji || '📦'}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {skill.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
        <Button
          type="primary"
          block
          icon={<MessageOutlined />}
          onClick={() => onStartChat && onStartChat(expert.id)}
        >
          开始对话
        </Button>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPicker visible={showAvatarPicker} onClose={() => setShowAvatarPicker(false)} onSelect={handleAvatarSelect} currentAvatar={expert.avatarUrl} />

      {/* Skill Detail Modal */}
      <Modal
        title={null}
        open={showSkillModal}
        onCancel={() => setShowSkillModal(false)}
        footer={null}
        width={400}
        closeIcon={false}
      >
        {selectedSkill && (
          <div style={{ padding: '0 0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>{selectedSkill.emoji || '📦'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedSkill.name}</div>
                <Tag color="blue" style={{ fontSize: 11 }}>自定义技能</Tag>
              </div>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setShowSkillModal(false)} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              {selectedSkill.description || '暂无描述'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button danger icon={<DeleteOutlined />} onClick={() => { handleRemoveSkill(selectedSkill.id); setShowSkillModal(false); }}>
                删除技能
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Add Skill Modal */}
      <Modal
        title={null}
        open={showAddSkillModal}
        onCancel={() => { setShowAddSkillModal(false); setSearchQuery(''); setSelectedCategory('all'); setAddedSkillIds(new Set()); }}
        footer={null}
        width={520}
        closeIcon={false}
      >
        <div style={{ padding: '0 0 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}><PlusOutlined /> 添加技能</div>
            <Button type="text" icon={<CloseOutlined />} onClick={() => { setShowAddSkillModal(false); setSearchQuery(''); setSelectedCategory('all'); setAddedSkillIds(new Set()); }} />
          </div>

          {/* Search */}
          <Input
            placeholder="搜索技能名称或描述..."
            prefix={<SearchOutlined style={{ color: 'var(--text-placeholder)' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ marginBottom: 12 }}
          />

          {/* Category Filter */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              <div
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '4px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                  background: selectedCategory === 'all' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: selectedCategory === 'all' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${selectedCategory === 'all' ? 'var(--accent)' : 'var(--border-light)'}`,
                  transition: 'all 0.2s',
                }}
              >全部</div>
              {categories.map(cat => (
                <div
                  key={cat as string}
                  onClick={() => setSelectedCategory(cat as string)}
                  style={{
                    padding: '4px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                    background: selectedCategory === cat ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: selectedCategory === cat ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${selectedCategory === cat ? 'var(--accent)' : 'var(--border-light)'}`,
                    transition: 'all 0.2s',
                  }}
                >{cat}</div>
              ))}
            </div>
          )}

          {/* Skill Grid */}
          {filteredSkills.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-placeholder)', fontSize: 13 }}>
              {searchQuery || selectedCategory !== 'all' ? '没有匹配的技能' : '所有技能已关联，没有可添加的技能'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
              {filteredSkills.map((skill: any) => {
                const isAdded = addedSkillIds.has(skill.id);
                return (
                  <div
                    key={skill.id}
                    onClick={() => {
                      if (isAdded) return;
                      handleAddSkill(skill.id);
                      setAddedSkillIds(prev => new Set(prev).add(skill.id));
                    }}
                    style={{
                      padding: '14px 12px',
                      background: isAdded ? '#f6ffed' : 'var(--bg-secondary)',
                      borderRadius: 12,
                      cursor: isAdded ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      border: `1px solid ${isAdded ? '#b7eb8f' : 'var(--border-light)'}`,
                      transition: 'all 0.2s',
                      opacity: isAdded ? 0.7 : 1,
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => { if (!isAdded) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(82,196,26,0.15)'; } }}
                    onMouseLeave={(e) => { if (!isAdded) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none'; } }}
                  >
                    <div style={{ fontSize: 28 }}>{skill.emoji || '📦'}</div>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.name}</div>
                      {skill.category && <Tag color="cyan" style={{ fontSize: 9, padding: '0 3px', height: 16, lineHeight: '14px', marginTop: 4 }}>{skill.category}</Tag>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%' }}>{skill.description || '暂无描述'}</div>
                    {isAdded ? (
                      <div style={{ fontSize: 10, color: '#52c41a', display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircleOutlined /> 已添加</div>
                    ) : (
                      <div style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 3 }}><PlusOutlined /> 添加</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
