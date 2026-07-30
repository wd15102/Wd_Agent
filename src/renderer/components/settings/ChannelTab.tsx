// ============================================================
// 消息通道管理 Tab
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Switch, Tag, message, Empty, Divider } from 'antd';
import { ApiOutlined, LinkOutlined, DisconnectOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';

interface ChannelStatus {
  platform: string;
  connected: boolean;
  botName?: string;
  channels?: string[];  // 服务器/频道 ID 列表
  error?: string;
}

const PLATFORM_INFO: Record<string, { label: string; icon: string; color: string; fields: Array<{ key: string; label: string; type: 'text' | 'password'; placeholder: string }> }> = {
  discord: {
    label: 'Discord',
    icon: '🎮',
    color: '#5865F2',
    fields: [
      { key: 'token', label: 'Bot Token', type: 'password', placeholder: '输入 Discord Bot Token' },
      { key: 'appId', label: 'App ID', type: 'text', placeholder: '输入 Application ID' },
      { key: 'prefix', label: '命令前缀', type: 'text', placeholder: '默认 !' },
    ],
  },
};

export default function ChannelTab() {
  const [statuses, setStatuses] = useState<ChannelStatus[]>([]);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [testMessage, setTestMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        window.electronAPI.channelStatuses(),
        window.electronAPI.getConfig(),
      ]);
      setStatuses(s);
      setConfigs(c.channels || {});
    } catch (err) {
      console.error('Failed to load channel data:', err);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (platform: string, enabled: boolean) => {
    const newChannels = { ...configs, [platform]: { ...configs[platform], enabled } };
    setConfigs(newChannels);
    await window.electronAPI.setConfig('channels', newChannels);
    await window.electronAPI.saveConfig();
    message.success(enabled ? '已启用' : '已禁用');
    loadData();
  };

  const handleFieldChange = async (platform: string, field: string, value: string) => {
    const updated = { ...configs, [platform]: { ...configs[platform], [field]: value } };
    setConfigs(updated);
    await window.electronAPI.setConfig('channels', updated);
    await window.electronAPI.saveConfig();
  };

  const handleConnect = async (platform: string) => {
    try {
      const result = await window.electronAPI.channelConnect(platform);
      if (result.ok) {
        message.success(`已连接 ${platform}`);
        loadData();
      } else {
        message.error(`连接失败`);
      }
    } catch {
      message.error('连接出错');
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      await window.electronAPI.channelDisconnect(platform);
      message.success(`已断开 ${platform}`);
      loadData();
    } catch {
      message.error('断开出错');
    }
  };

  const handleSendTest = async (platform: string) => {
    if (!testMessage.trim()) {
      message.warning('请输入测试消息');
      return;
    }
    try {
      const status = statuses.find(s => s.platform === platform);
      const channelId = status?.channels?.[0];
      if (!channelId) {
        message.error('没有可用的频道');
        return;
      }
      const result = await window.electronAPI.channelSend(platform, {
        channelId,
        text: testMessage,
      });
      if (result.ok) {
        message.success('测试消息已发送');
        setTestMessage('');
      } else {
        message.error('发送失败');
      }
    } catch {
      message.error('发送出错');
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <ApiOutlined style={{ fontSize: 18, color: 'var(--accent)' }} />
        <span style={{ fontSize: 15, fontWeight: 500 }}>消息通道</span>
        <Tag color="blue">{statuses.filter(s => s.connected).length} 已连接</Tag>
      </div>

      {Object.keys(PLATFORM_INFO).length === 0 ? (
        <Empty description="暂无可用通道" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(PLATFORM_INFO).map(([platform, info]) => {
            const status = statuses.find(s => s.platform === platform);
            const connected = status?.connected || false;
            const cfg = configs[platform] || {};

            return (
              <div key={platform} style={{
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                padding: 16,
                background: 'var(--bg-secondary)',
              }}>
                {/* 通道头部 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>{info.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{info.label}</span>
                      {connected ? (
                        <Tag color="green" icon={<LinkOutlined />}>已连接</Tag>
                      ) : (
                        <Tag color="default" icon={<DisconnectOutlined />}>未连接</Tag>
                      )}
                      {status?.botName && <Tag color="purple">{status.botName}</Tag>}
                    </div>
                    {status?.error && (
                      <div style={{ fontSize: 11, color: '#ff4d4f', marginTop: 2 }}>{status.error}</div>
                    )}
                  </div>
                  <Switch
                    checked={cfg.enabled !== false}
                    onChange={checked => handleToggle(platform, checked)}
                    size="small"
                  />
                  {!connected ? (
                    <Button size="small" type="primary" icon={<LinkOutlined />} onClick={() => handleConnect(platform)}>连接</Button>
                  ) : (
                    <Button size="small" icon={<DisconnectOutlined />} onClick={() => handleDisconnect(platform)}>断开</Button>
                  )}
                </div>

                {/* 配置字段 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {info.fields.map(field => (
                    <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 70 }}>{field.label}</label>
                      {field.type === 'password' ? (
                        <Input.Password
                          style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}
                          placeholder={field.placeholder}
                          value={cfg[field.key] || ''}
                          onChange={e => handleFieldChange(platform, field.key, e.target.value)}
                          size="small"
                        />
                      ) : (
                        <Input
                          style={{ flex: 1, fontSize: 12 }}
                          placeholder={field.placeholder}
                          value={cfg[field.key] || ''}
                          onChange={e => handleFieldChange(platform, field.key, e.target.value)}
                          size="small"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* 测试消息 */}
                {connected && (
                  <>
                    <Divider style={{ margin: '12px 0 8px' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        placeholder="发送测试消息..."
                        value={testMessage}
                        onChange={e => setTestMessage(e.target.value)}
                        size="small"
                        onPressEnter={() => handleSendTest(platform)}
                      />
                      <Button size="small" icon={<SendOutlined />} onClick={() => handleSendTest(platform)}>发送</Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
