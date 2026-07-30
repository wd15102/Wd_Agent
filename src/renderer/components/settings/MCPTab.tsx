// ============================================================
// MCP Server 管理 Tab
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Switch, Tag, Tooltip, Modal, message, Empty, Divider } from 'antd';
import { ApiOutlined, PlusOutlined, DeleteOutlined, LinkOutlined, DisconnectOutlined, ToolOutlined, CloudServerOutlined } from '@ant-design/icons';
import { MCPServerConfig, MCPServerStatus, MCPTool } from '../../../shared/types.electron';

const { Search } = Input;

export default function MCPTab() {
  const [configs, setConfigs] = useState<MCPServerConfig[]>([]);
  const [statuses, setStatuses] = useState<MCPServerStatus[]>([]);
  const [tools, setTools] = useState<Array<{ serverName: string; tool: MCPTool }>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingConfig, setEditingConfig] = useState<MCPServerConfig | null>(null);
  const [newConfig, setNewConfig] = useState<Partial<MCPServerConfig>>({ transport: 'stdio' });

  const loadData = useCallback(async () => {
    try {
      const [s, c, t] = await Promise.all([
        window.electronAPI.mcpList(),
        window.electronAPI.mcpConfigs(),
        window.electronAPI.mcpGetTools(),
      ]);
      setStatuses(s);
      setConfigs(c);
      setTools(t);
    } catch (err) {
      console.error('Failed to load MCP data:', err);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveConfigs = async (newConfigs: MCPServerConfig[]) => {
    try {
      await window.electronAPI.mcpSaveConfigs(newConfigs);
      setConfigs(newConfigs);
      message.success('配置已保存');
    } catch {
      message.error('保存失败');
    }
  };

  const handleAddServer = () => {
    if (!newConfig.name || !newConfig.command) {
      message.error('请填写名称和命令');
      return;
    }
    const cfg: MCPServerConfig = {
      name: newConfig.name,
      command: newConfig.command,
      args: newConfig.args || [],
      env: newConfig.env || {},
      transport: newConfig.transport || 'stdio',
      url: newConfig.url,
      enabled: true,
    };
    const updated = [...configs.filter(c => c.name !== cfg.name), cfg];
    handleSaveConfigs(updated);
    setShowAdd(false);
    setNewConfig({ transport: 'stdio' });
  };

  const handleDeleteServer = (name: string) => {
    const updated = configs.filter(c => c.name !== name);
    handleSaveConfigs(updated);
  };

  const handleToggleEnabled = (name: string, enabled: boolean) => {
    const updated = configs.map(c => c.name === name ? { ...c, enabled } : c);
    handleSaveConfigs(updated);
  };

  const handleConnect = async (name: string) => {
    try {
      const result = await window.electronAPI.mcpConnect(name);
      if (result.ok) {
        message.success(`已连接 ${name}`);
        loadData();
      } else {
        message.error(`连接失败 ${name}`);
      }
    } catch {
      message.error('连接出错');
    }
  };

  const handleDisconnect = async (name: string) => {
    try {
      await window.electronAPI.mcpDisconnect(name);
      message.success(`已断开 ${name}`);
      loadData();
    } catch {
      message.error('断开出错');
    }
  };

  const handleConnectAll = async () => {
    try {
      await window.electronAPI.mcpConnectAll();
      message.success('已连接所有服务器');
      loadData();
    } catch {
      message.error('连接出错');
    }
  };

  const getStatus = (name: string) => statuses.find(s => s.name === name);
  const getServerTools = (name: string) => tools.filter(t => t.serverName === name);

  return (
    <div style={{ padding: '16px 0' }}>
      {/* 头部操作区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Button type="primary" icon={<LinkOutlined />} onClick={handleConnectAll}>连接全部</Button>
        <Button icon={<PlusOutlined />} onClick={() => setShowAdd(true)}>添加服务器</Button>
        <div style={{ flex: 1 }} />
        <Tag color="blue">{configs.length} 个配置</Tag>
        <Tag color="green">{statuses.filter(s => s.connected).length} 已连接</Tag>
      </div>

      {/* 服务器列表 */}
      {configs.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 MCP 服务器配置">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAdd(true)}>添加第一个</Button>
        </Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {configs.map(cfg => {
            const status = getStatus(cfg.name);
            const serverTools = getServerTools(cfg.name);
            const connected = status?.connected || false;

            return (
              <div key={cfg.name} style={{
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                padding: 16,
                background: 'var(--bg-secondary)',
              }}>
                {/* 服务器头部 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CloudServerOutlined style={{ fontSize: 18, color: connected ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cfg.name}</span>
                      {connected ? (
                        <Tag color="green" icon={<LinkOutlined />}>已连接</Tag>
                      ) : (
                        <Tag color="default" icon={<DisconnectOutlined />}>未连接</Tag>
                      )}
                      <Tag icon={<ToolOutlined />}>{serverTools.length} 工具</Tag>
                      <Tag>{cfg.transport || 'stdio'}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'monospace' }}>
                      {cfg.command} {(cfg.args || []).join(' ')}
                    </div>
                  </div>
                  <Switch
                    checked={cfg.enabled !== false}
                    onChange={checked => handleToggleEnabled(cfg.name, checked)}
                    size="small"
                  />
                  {!connected ? (
                    <Button size="small" type="primary" icon={<LinkOutlined />} onClick={() => handleConnect(cfg.name)}>连接</Button>
                  ) : (
                    <Button size="small" icon={<DisconnectOutlined />} onClick={() => handleDisconnect(cfg.name)}>断开</Button>
                  )}
                  <Tooltip title="删除">
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteServer(cfg.name)} />
                  </Tooltip>
                </div>

                {/* 工具列表 */}
                {connected && serverTools.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0 8px' }} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {serverTools.map(({ tool }) => (
                        <Tooltip key={tool.name} title={tool.description}>
                          <Tag style={{ fontSize: 11 }}>{tool.displayName || tool.name}</Tag>
                        </Tooltip>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 添加服务器 Modal */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlusOutlined style={{ color: 'var(--accent)' }} /><span>添加 MCP 服务器</span></div>}
        open={showAdd}
        onOk={handleAddServer}
        onCancel={() => { setShowAdd(false); setNewConfig({ transport: 'stdio' }); }}
        okText="添加"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>名称 *</label>
            <Input placeholder="例如: filesystem" value={newConfig.name} onChange={e => setNewConfig({ ...newConfig, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>传输方式</label>
            <Input.Group compact>
              <Button type={newConfig.transport === 'stdio' ? 'primary' : 'default'} onClick={() => setNewConfig({ ...newConfig, transport: 'stdio' })}>stdio</Button>
              <Button type={newConfig.transport === 'sse' ? 'primary' : 'default'} onClick={() => setNewConfig({ ...newConfig, transport: 'sse' })}>SSE</Button>
            </Input.Group>
          </div>
          {newConfig.transport === 'stdio' ? (
            <>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>命令 *</label>
                <Input placeholder="例如: npx 或 python" value={newConfig.command} onChange={e => setNewConfig({ ...newConfig, command: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>参数（空格分隔）</label>
                <Input placeholder="例如: -y @modelcontextprotocol/server-filesystem" value={(newConfig.args || []).join(' ')} onChange={e => setNewConfig({ ...newConfig, args: e.target.value.split(' ').filter(Boolean) })} />
              </div>
            </>
          ) : (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>SSE URL *</label>
              <Input placeholder="例如: http://localhost:3000/sse" value={newConfig.url} onChange={e => setNewConfig({ ...newConfig, url: e.target.value })} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>环境变量（可选，KEY=VALUE 每行一个）</label>
            <Input.TextArea
              rows={2}
              placeholder={"API_KEY=xxx\nDEBUG=1"}
              value={Object.entries(newConfig.env || {}).map(([k, v]) => `${k}=${v}`).join('\n')}
              onChange={e => {
                const env: Record<string, string> = {};
                e.target.value.split('\n').forEach(line => {
                  const [k, ...v] = line.split('=');
                  if (k?.trim()) env[k.trim()] = v.join('=').trim();
                });
                setNewConfig({ ...newConfig, env });
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
