// ============================================================
// 设置面板 · QClaw 风格 · 自动保存
// 所有修改自动保存到主进程，无需手动点击保存按钮
// ============================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Select, Slider, Switch, Tabs, InputNumber, Divider, message, Modal, Tag, Tooltip } from 'antd';
import { ApiOutlined, SettingOutlined, BgColorsOutlined, PlusOutlined, DeleteOutlined, EditOutlined, RobotOutlined, CheckOutlined, SafetyOutlined, EyeOutlined, FileTextOutlined, ClearOutlined, DownloadOutlined, ToolOutlined } from '@ant-design/icons';
import ThemePickerPanel from './ThemePickerPanel';
import AuditLogTab from './AuditLogTab';
import MCPTab from './MCPTab';
import ChannelTab from './ChannelTab';

interface Props {
  config: any;
  setConfig: (cfg: any) => void;
}

export default function SettingsPanel({ config, setConfig }: Props) {
  const [localConfig, setLocalConfig] = useState<any>(null);
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingModelIdx, setEditingModelIdx] = useState<number | null>(null);
  const [newModel, setNewModel] = useState({ id: '', name: '', baseUrl: '', apiKey: '', provider: 'openai', free: false, multimodal: false });
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (config) setLocalConfig(JSON.parse(JSON.stringify(config)));
  }, [config]);

  // 自动保存：防抖 500ms
  const autoSave = useCallback((cfg: any) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const topKeys = Object.keys(cfg);
        for (const key of topKeys) {
          await window.electronAPI.setConfig(key, cfg[key]);
        }
        await window.electronAPI.saveConfig();
        setConfig(cfg);
      } catch {
        message.error('保存失败');
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [setConfig]);

  if (!localConfig) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-placeholder)' }}>加载中...</div>;

  const updateConfig = (path: string, value: any) => {
    const newConfig = JSON.parse(JSON.stringify(localConfig));
    const keys = path.split('.');
    let target = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    setLocalConfig(newConfig);
    autoSave(newConfig);
  };

  const handleAddOrUpdateModel = () => {
    if (!newModel.id.trim() || !newModel.name.trim()) {
      message.warning('请填写模型 ID 和名称');
      return;
    }
    if (!newModel.baseUrl.trim()) {
      message.warning('请填写模型的 API 地址（baseUrl）\n否则请求会发到默认 API，导致模型不存在错误');
      return;
    }
    const models = [...(localConfig.models?.models || [])];
    if (editingModelIdx !== null) {
      models[editingModelIdx] = { ...newModel };
      message.success('模型已更新');
    } else {
      const idx = models.findIndex((m: any) => m.id === newModel.id);
      if (idx >= 0) {
        models[idx] = { ...newModel };
        message.success('模型已更新');
      } else {
        models.push({ ...newModel });
        message.success('模型已添加');
      }
    }
    updateConfig('models.models', models);
    setShowAddModel(false);
    setEditingModelIdx(null);
    setNewModel({ id: '', name: '', baseUrl: '', apiKey: '', provider: 'openai', free: false, multimodal: false });
  };

  const handleEditModel = (idx: number) => {
    const m = localConfig.models.models[idx];
    setNewModel({ ...m });
    setEditingModelIdx(idx);
    setShowAddModel(true);
  };

  const handleRemoveModel = (idx: number) => {
    const newModels = [...(localConfig.models?.models || [])];
    const removed = newModels[idx];
    newModels.splice(idx, 1);
    updateConfig('models.models', newModels);
    if (localConfig.models?.defaultModel === removed.id) {
      updateConfig('models.defaultModel', newModels[0]?.id || '');
    }
  };

  const tabItems = [
    {
      key: 'model',
      label: <span style={{ fontSize: 13 }}><ApiOutlined /> 模型</span>,
      children: (
        <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 模型列表 */}
          <SectionCard title={`已添加模型 (${(localConfig.models?.models || []).length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>每个模型配置独立 API 地址和 Key</span>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingModelIdx(null); setNewModel({ id: '', name: '', baseUrl: '', apiKey: '', provider: 'openai', free: false, multimodal: false }); setShowAddModel(true); }}>
                  添加模型
                </Button>
              </div>
              {(localConfig.models?.models || []).map((m: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-light)', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <RobotOutlined style={{ fontSize: 16, color: 'var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {m.name}
                        {m.multimodal && <Tag color="cyan" style={{ fontSize: 10, padding: '0 4px' }}>🖼 视觉</Tag>}
                        {m.free && <Tag color="green" style={{ fontSize: 10, padding: '0 4px' }}>免费</Tag>}
                        {m.provider && <Tag color="purple" style={{ fontSize: 10, padding: '0 4px' }}>{m.provider}</Tag>}
                        {localConfig.models?.defaultModel === m.id && <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>默认</Tag>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-placeholder)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.id}</div>
                      {m.baseUrl && (
                        <div style={{ fontSize: 10, color: '#52c41a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>🔗 {m.baseUrl}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {localConfig.models?.defaultModel !== m.id && (
                      <Tooltip title="设为默认">
                        <Button size="small" type="text" icon={<CheckOutlined />} style={{ color: '#52c41a' }} onClick={() => updateConfig('models.defaultModel', m.id)} />
                      </Tooltip>
                    )}
                    <Tooltip title="编辑">
                      <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleEditModel(idx)} />
                    </Tooltip>
                    <Tooltip title="删除">
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveModel(idx)} />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 模型参数 */}
          <SectionCard title="模型参数">
            <FieldRow label="最大 Token">
              <InputNumber min={256} max={32768} value={localConfig.models?.maxTokens || 4096} onChange={v => updateConfig('models.maxTokens', v || 4096)} style={{ width: 160 }} />
            </FieldRow>
            <FieldRow label="温度">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Slider min={0} max={2} step={0.1} value={localConfig.models?.temperature ?? 0.7} onChange={v => updateConfig('models.temperature', v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 30, textAlign: 'right' }}>{(localConfig.models?.temperature ?? 0.7).toFixed(1)}</span>
              </div>
            </FieldRow>
          </SectionCard>
        </div>
      ),
    },
    {
      key: 'tools',
      label: <span style={{ fontSize: 13 }}><SettingOutlined /> 工具</span>,
      children: (
        <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(['exec', 'webSearch', 'webFetch', 'filesystem'] as const).map(t => {
            const labelMap: any = { exec: 'Shell 命令执行', webSearch: '网页搜索', webFetch: '网页内容抓取', filesystem: '文件系统操作' };
            const pathMap: any = { exec: 'tools.exec.enabled', webSearch: 'tools.webSearch.enabled', webFetch: 'tools.webFetch.enabled', filesystem: 'tools.filesystem.enabled' };
            return (
              <SectionCard key={t} title={labelMap[t]}>
                <FieldRow label="启用">
                  <Switch checked={localConfig.tools?.[t]?.enabled ?? true} onChange={v => updateConfig(pathMap[t], v)} />
                </FieldRow>
              </SectionCard>
            );
          })}
        </div>
      ),
    },
    {
      key: 'security',
      label: <span style={{ fontSize: 13 }}><SafetyOutlined /> 安全</span>,
      children: (
        <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="命令安全沙箱">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>受保护的路径</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>Windows, Program Files, ProgramData, Users\Default 等系统目录不可写入</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>危险命令拦截</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>rm -rf /, format, taskkill, reg delete, net user, Invoke-Expression, bitsadmin, certutil, mshta, schtasks 等命令自动拦截</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>命令注入防护</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>包含 ;  &&  || 反引号 $() 等拼接字符的命令会被拦截</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>文件大小限制</div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>单次写入不超过 10MB，命令超时 60s</div>
              </div>
            </div>
          </SectionCard>
        </div>
      ),
    },
    {
      key: 'toolPerm',
      label: <span style={{ fontSize: 13 }}><SafetyOutlined /> 工具权限</span>,
      children: (
        <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="工具执行权限">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {[
                { name: 'read', label: '读取文件', desc: '读取文件内容', risk: 'low' },
                { name: 'list_dir', label: '列出目录', desc: '查看目录结构', risk: 'low' },
                { name: 'web_search', label: '网页搜索', desc: '搜索互联网', risk: 'low' },
                { name: 'web_fetch', label: '抓取网页', desc: '获取网页内容', risk: 'low' },
                { name: 'write', label: '写入文件', desc: '创建或修改文件', risk: 'high' },
                { name: 'exec', label: '执行命令', desc: '运行 Shell 命令', risk: 'high' },
              ].map(tool => {
                const currentLevel = localConfig.toolPermissions?.[tool.name] || (tool.risk === 'high' ? 'ask' : 'auto');
                return (
                  <div key={tool.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{tool.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tool.desc}</span>
                      {tool.risk === 'high' && <Tag color="warning" style={{ fontSize: 10, padding: '0 4px' }}>高风险</Tag>}
                    </div>
                    <Select
                      value={currentLevel}
                      onChange={v => updateConfig(`toolPermissions.${tool.name}`, v)}
                      style={{ width: 120 }}
                      size="small"
                      options={[
                        { label: '自动允许', value: 'auto' },
                        { label: '每次询问', value: 'ask' },
                        { label: '禁止', value: 'deny' },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-tertiary)' }}>
              💡 设为"每次询问"时，工具执行前会弹出审批窗口，您可以选择仅此一次、永久允许或拒绝
            </div>
          </SectionCard>
        </div>
      ),
    },
    {
      key: 'ui',
      label: <span style={{ fontSize: 13 }}><BgColorsOutlined /> 界面</span>,
      children: <ThemePickerPanel />,
    },
    {
      key: 'bg',
      label: <span style={{ fontSize: 13 }}><EyeOutlined /> 背景</span>,
      children: (
        <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="背景透明度">
            <FieldRow label="不透明度">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Slider min={0} max={1} step={0.05} value={localConfig.ui?.backgroundOpacity ?? 0.75} onChange={v => updateConfig('ui.backgroundOpacity', v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{((localConfig.ui?.backgroundOpacity ?? 0.75) * 100).toFixed(0)}%</span>
              </div>
            </FieldRow>
          </SectionCard>
          <SectionCard title="背景模糊">
            <FieldRow label="模糊程度">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Slider min={0} max={20} step={1} value={localConfig.ui?.backgroundBlur ?? 0} onChange={v => updateConfig('ui.backgroundBlur', v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{(localConfig.ui?.backgroundBlur ?? 0).toFixed(0)}px</span>
              </div>
            </FieldRow>
          </SectionCard>
          <SectionCard title="背景填充模式">
            <FieldRow label="填充方式">
              <Select
                value={localConfig.ui?.backgroundFit || 'cover'}
                onChange={v => updateConfig('ui.backgroundFit', v)}
                style={{ width: 160 }}
                options={[
                  { label: '填满（可裁剪）', value: 'cover' },
                  { label: '完整显示', value: 'contain' },
                ]}
              />
            </FieldRow>
          </SectionCard>
          <SectionCard title="组件透明度">
            <FieldRow label="侧边栏">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Slider min={0} max={1} step={0.05} value={localConfig.ui?.sidebarOpacity ?? 0.7} onChange={v => updateConfig('ui.sidebarOpacity', v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{((localConfig.ui?.sidebarOpacity ?? 0.7) * 100).toFixed(0)}%</span>
              </div>
            </FieldRow>
            <FieldRow label="聊天区">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Slider min={0} max={1} step={0.05} value={localConfig.ui?.chatOpacity ?? 0.65} onChange={v => updateConfig('ui.chatOpacity', v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{((localConfig.ui?.chatOpacity ?? 0.65) * 100).toFixed(0)}%</span>
              </div>
            </FieldRow>
            <FieldRow label="消息气泡">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <Slider min={0} max={1} step={0.05} value={localConfig.ui?.messageOpacity ?? 0.55} onChange={v => updateConfig('ui.messageOpacity', v)} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 40, textAlign: 'right' }}>{((localConfig.ui?.messageOpacity ?? 0.55) * 100).toFixed(0)}%</span>
              </div>
            </FieldRow>
          </SectionCard>
        </div>
      ),
    },
    {
      key: 'audit',
      label: <span style={{ fontSize: 13 }}><FileTextOutlined /> 审计日志</span>,
      children: <AuditLogTab />,
    },
    {
      key: 'mcp',
      label: <span style={{ fontSize: 13 }}><ToolOutlined /> MCP 服务器</span>,
      children: <MCPTab />,
    },
    {
      key: 'channel',
      label: <span style={{ fontSize: 13 }}><ApiOutlined /> 消息通道</span>,
      children: <ChannelTab />,
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs items={tabItems} style={{ padding: '0 24px' }} size="small" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        <div style={{ color: 'var(--text-placeholder)', fontSize: 11, marginBottom: 8 }}>
          配置保存在 ~/.wdclaw/config.json {saving && <span style={{ color: 'var(--accent)', marginLeft: 8 }}>保存中...</span>}
        </div>
      </div>

      {/* 添加/编辑模型 Modal — QClaw 风格 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RobotOutlined style={{ color: 'var(--accent)' }} />
            <span>{editingModelIdx !== null ? '编辑模型' : '添加模型'}</span>
          </div>
        }
        open={showAddModel}
        onCancel={() => { setShowAddModel(false); setEditingModelIdx(null); setNewModel({ id: '', name: '', baseUrl: '', apiKey: '', provider: 'openai', free: false, multimodal: false }); }}
        onOk={handleAddOrUpdateModel}
        okText={editingModelIdx !== null ? '保存修改' : '添加模型'}
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FieldRow label="Provider">
            <Select value={newModel.provider} onChange={v => setNewModel({ ...newModel, provider: v })} style={{ width: '100%' }}>
              <Select.Option value="openai">OpenAI 兼容</Select.Option>
              <Select.Option value="zhipu">智谱 GLM</Select.Option>
              <Select.Option value="anthropic">Anthropic</Select.Option>
              <Select.Option value="longcat">LongCat (美团)</Select.Option>
              <Select.Option value="dashscope">通义千问</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
          </FieldRow>
          <FieldRow label="模型 ID">
            <Input value={newModel.id} onChange={e => setNewModel({ ...newModel, id: e.target.value })} placeholder="如: qwen-vl-max / glm-4-flash" />
          </FieldRow>
          <FieldRow label="显示名称">
            <Input value={newModel.name} onChange={e => setNewModel({ ...newModel, name: e.target.value })} placeholder="如: 通义千问 VL-Max" />
          </FieldRow>
          <FieldRow label="API 地址 🔗">
            <Input value={newModel.baseUrl} onChange={e => setNewModel({ ...newModel, baseUrl: e.target.value })} placeholder="如: https://dashscope.aliyuncs.com/compatible-mode/v1" />
          </FieldRow>
          <div style={{ fontSize: 11, color: '#ff4d4f', paddingLeft: 16, marginTop: -8 }}>必填！不同模型 API 地址不同，否则聊天时会报"模型不存在"</div>
          <FieldRow label="单独 Key">
            <Input.Password value={newModel.apiKey} onChange={e => setNewModel({ ...newModel, apiKey: e.target.value })} placeholder="可选，覆盖全局 Key" />
          </FieldRow>
          <FieldRow label="多模态">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Switch checked={newModel.multimodal} onChange={v => setNewModel({ ...newModel, multimodal: v })} />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>支持图片输入（勾选后图片直接发送给模型）</span>
            </div>
          </FieldRow>
          <FieldRow label="免费模型">
            <Switch checked={newModel.free} onChange={v => setNewModel({ ...newModel, free: v })} />
          </FieldRow>
        </div>
      </Modal>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-light)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>{title}</div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0, minWidth: 80 }}>{label}</label>
      <div style={{ flex: 1, maxWidth: 400 }}>{children}</div>
    </div>
  );
}
