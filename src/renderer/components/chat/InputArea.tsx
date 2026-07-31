// ============================================================
// 输入区域 — 模型选择 + 文件选择 + Agent 选择 + 工具栏
// ============================================================
import React, { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react';
import { Button, Input, Tooltip, Dropdown, message, Select, Modal, Checkbox, Tag, List } from 'antd';
import { themeEngine } from '../settings/themeEngine';
import {
  SendOutlined,
  PauseOutlined,
  PaperClipOutlined,
  AudioOutlined,
  RobotOutlined,
  AppstoreOutlined,
  FileOutlined,
  CloseOutlined,
  DownOutlined,
  UserOutlined,
  PlusOutlined,
  BulbOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

export interface Agent {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  avatar?: string;
  builtin?: boolean;
}

export interface SelectedFile {
  name: string;
  size: number;
  path?: string;
  data?: string; // base64 data (fallback when path is unavailable)
}

interface Props {
  onSend: (text: string, opts?: { agentIds?: string[]; files?: SelectedFile[]; modelId?: string }) => void;
  onStop: () => void;
  disabled: boolean;
  generating: boolean;
  models?: Array<{ id: string; name: string; free?: boolean }>;
  defaultModel?: string;
  agents?: Agent[];
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
}

export default function InputArea({
  onSend, onStop, disabled, generating,
  models = [], defaultModel, agents = [],
  currentModel, onModelChange,
}: Props) {
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(themeEngine.getTheme());

  useEffect(() => {
    const unsub = themeEngine.onChange((t) => setTheme(t));
    return unsub;
  }, []);

  const inputPlaceholder = theme.inputPlaceholder || (disabled ? '请先创建或选择对话...' : '输入消息...');

  // 当前选中的模型
  const activeModel = currentModel || defaultModel || models[0]?.id;
  const activeModelObj = models.find(m => m.id === activeModel);

  // 处理文件选择
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: SelectedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file as any).path;
      newFiles.push({
        name: file.name,
        size: file.size,
        path,
      });

      // Fallback: if File.path is unavailable, read file as base64
      if (!path) {
        console.warn('[InputArea] File.path 不可用，使用 base64 回退:', file.name);
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setSelectedFiles(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(f => f.name === file.name && f.size === file.size && !f.path);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], data: base64 };
            }
            return updated;
          });
        };
        reader.readAsDataURL(file);
      }
    }
    setSelectedFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // 粘贴图片处理
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: SelectedFile[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const wf: SelectedFile = { name: file.name || 'pasted-image.png', size: file.size };
        // Electron: try to get path
        const anyFile = file as any;
        if (anyFile.path) {
          wf.path = anyFile.path;
        }
        imageFiles.push(wf);
        // Always read base64 for preview
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setSelectedFiles(prev => {
            const idx = prev.indexOf(wf);
            if (idx < 0) return prev;
            const updated = [...prev];
            updated[idx] = { ...updated[idx], data: dataUrl };
            return updated;
          });
        };
        reader.readAsDataURL(file);
      }
    }
    if (imageFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...imageFiles]);
    }
  }, []);

  // 切换 Agent 选中
  const toggleAgent = (agent: Agent) => {
    setSelectedAgents(prev => {
      const exists = prev.find(a => a.id === agent.id);
      if (exists) return prev.filter(a => a.id !== agent.id);
      return [...prev, agent];
    });
  };

  // 发送
  const handleSend = () => {
    const text = input.trim();
    if (!text || disabled || generating) return;
    onSend(text, {
      agentIds: selectedAgents.map(a => a.id),
      files: selectedFiles,
      modelId: activeModel,
    });
    setInput('');
    setSelectedFiles([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 文件上传到消息（实际场景可以改为读取内容）
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // 模型选择下拉
  const modelMenuItems = models.map(m => ({
    key: m.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <RobotOutlined style={{ color: 'var(--accent)' }} />
        <span>{m.name}</span>
        {m.free && <Tag color="green" style={{ fontSize: 10, padding: '0 4px' }}>免费</Tag>}
        {m.id === activeModel && <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>当前</Tag>}
      </div>
    ),
    onClick: () => {
      onModelChange?.(m.id);
      setModelDropdownOpen(false);
    },
  }));

  return (
    <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-primary)', flexShrink: 0 }}>
      {/* 已选择的文件/Agent 预览 */}
      {(selectedFiles.length > 0 || selectedAgents.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selectedFiles.map((f, idx) => {
            const isImage = f.data?.startsWith('data:image') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name);
            return (
              <Tag
                key={idx}
                closable
                onClose={() => removeFile(idx)}
                icon={isImage && f.data ? undefined : <FileOutlined />}
                style={{ fontSize: 12, padding: isImage && f.data ? '2px 2px 2px 8px' : '2px 8px' }}
              >
                {isImage && f.data ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={f.data} alt={f.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                    <span>{f.name}</span>
                  </div>
                ) : (
                  <span>{f.name} ({formatFileSize(f.size)})</span>
                )}
              </Tag>
            );
          })}
          {selectedAgents.map(a => (
            <Tag
              key={a.id}
              closable
              onClose={() => setSelectedAgents(prev => prev.filter(x => x.id !== a.id))}
              color="purple"
              style={{ fontSize: 12, padding: '2px 8px' }}
            >
              {a.emoji || '🤖'} {a.name}
            </Tag>
          ))}
        </div>
      )}

      {/* 输入框主体 — 加大加高 */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--bg-secondary)', borderRadius: 12,
        border: '1px solid var(--border-light)',
        padding: '12px 14px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        minHeight: 80,
      }}>
        {/* 添加附件按钮 */}
        <Tooltip title="添加附件">
          <Button type="text" size="middle" icon={<PaperClipOutlined style={{ fontSize: 16 }} />} style={{ color: 'var(--text-tertiary)', flexShrink: 0, width: 36, height: 36 }} onClick={handleFileSelect} />
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <TextArea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={inputPlaceholder}
          disabled={disabled}
          autoSize={{ minRows: 2, maxRows: 8 }}
          variant="borderless"
          style={{
            flex: 1, fontSize: 15, lineHeight: 1.6,
            background: 'transparent', padding: 0,
            resize: 'none', color: 'var(--text-primary)',
            minHeight: 56,
          }}
        />

        {/* 语音输入 */}
        <Tooltip title="语音输入">
          <Button type="text" size="middle" icon={<AudioOutlined style={{ fontSize: 16 }} />} style={{ color: 'var(--text-tertiary)', flexShrink: 0, width: 36, height: 36 }} />
        </Tooltip>

        {/* 发送/停止按钮 — 加大 */}
        {generating ? (
          <Tooltip title="停止生成">
            <Button type="default" size="middle" icon={<PauseOutlined />} onClick={onStop} danger style={{ flexShrink: 0, borderRadius: 8, width: 40, height: 40 }} />
          </Tooltip>
        ) : (
          <Tooltip title="发送">
            <Button
              type="primary"
              size="middle"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={disabled || !input.trim()}
              style={{ flexShrink: 0, borderRadius: 8, background: 'var(--accent)', width: 40, height: 40 }}
            />
          </Tooltip>
        )}
      </div>

      {/* 工具栏 — 模型/Agent 选择 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingLeft: 4 }}>
        {/* 模型选择器 */}
        <Dropdown
          menu={{ items: modelMenuItems }}
          open={modelDropdownOpen}
          onOpenChange={setModelDropdownOpen}
          trigger={['click']}
        >
          <Button size="small" type="text" style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '2px 8px', height: 28 }}>
            <RobotOutlined /> {activeModelObj?.name || '选择模型'} <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>

        {/* Agent 选择器 */}
        <Tooltip title="选择协作 Agent">
          <Button
            size="small"
            type="text"
            icon={<AppstoreOutlined />}
            style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '2px 8px', height: 28 }}
            onClick={() => setAgentModalOpen(true)}
          >
            Agents{selectedAgents.length > 0 && ` (${selectedAgents.length})`}
          </Button>
        </Tooltip>

        {/* 已选 Agent 快捷标签 */}
        {selectedAgents.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {selectedAgents.map(a => (
              <Tag
                key={a.id}
                color="purple"
                style={{ fontSize: 11, padding: '1px 6px', lineHeight: 1.6, cursor: 'pointer' }}
                onClick={() => setSelectedAgents(prev => prev.filter(x => x.id !== a.id))}
              >
                {a.emoji || '🤖'} {a.name} <CloseOutlined style={{ fontSize: 8 }} />
              </Tag>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>
          Enter 发送 · Shift+Enter 换行 · Ctrl+V 粘贴图片
        </div>
      </div>

      {/* Agent 选择弹窗 */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AppstoreOutlined style={{ color: 'var(--accent)' }} /> 选择协作 Agent</div>}
        open={agentModalOpen}
        onCancel={() => setAgentModalOpen(false)}
        onOk={() => setAgentModalOpen(false)}
        okText="确定"
        width={480}
      >
        <div style={{ marginBottom: 12, color: 'var(--text-tertiary)', fontSize: 12 }}>
          选择一个或多个 Agent 参与本次对话
        </div>
        <List
          size="small"
          dataSource={agents}
          renderItem={agent => {
            const checked = selectedAgents.some(a => a.id === agent.id);
            return (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: checked ? 'var(--accent-light)' : 'var(--bg-primary)',
                  border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-light)'}`,
                  borderRadius: 8,
                  marginBottom: 6,
                  padding: '10px 14px',
                }}
                onClick={() => toggleAgent(agent)}
              >
                <List.Item.Meta
                  avatar={<span style={{ fontSize: 20 }}>{agent.emoji || '🤖'}</span>}
                  title={<span style={{ fontSize: 13, fontWeight: 500 }}>{agent.name}</span>}
                  description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{agent.description || '无描述'}</span>}
                />
                <Checkbox checked={checked} style={{ pointerEvents: 'none' }} />
              </List.Item>
            );
          }}
          locale={{ emptyText: '暂无 Agent 可用' }}
        />
      </Modal>
    </div>
  );
}
