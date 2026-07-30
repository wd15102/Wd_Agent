/**
 * Agent 选择器弹窗 — 新建对话时选择 Agent 类型
 * 基于 OpenWorker agents/ 设计：chat/code/cowork/helper 四种类型
 */
import React, { useState, useEffect } from 'react';
import { Modal, Tag, Tooltip } from 'antd';
import { RobotOutlined, CodeOutlined, TeamOutlined, BulbOutlined } from '@ant-design/icons';

interface Agent {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  family?: string;
  tools?: string[];
  needsWorkspace?: boolean;
  messaging?: boolean;
  connectors?: boolean;
}

interface Props {
  open: boolean;
  onSelect: (agent: Agent) => void;
  onCancel: () => void;
}

const FAMILY_ICONS: Record<string, React.ReactNode> = {
  chat: <RobotOutlined />,
  code: <CodeOutlined />,
  cowork: <TeamOutlined />,
  helper: <BulbOutlined />,
};

const FAMILY_COLORS: Record<string, string> = {
  chat: '#52c41a',
  code: '#1677ff',
  cowork: '#722ed1',
  helper: '#fa8c16',
};

export default function AgentSelectorModal({ open, onSelect, onCancel }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (open) {
      window.electronAPI.getBuiltinAgents().then(setAgents);
    }
  }, [open]);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ color: 'var(--accent)' }} />
          <span>选择 Agent 类型</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={560}
      centered
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 0' }}>
        {agents.map(agent => {
          const color = FAMILY_COLORS[agent.family || 'chat'];
          return (
            <div
              key={agent.id}
              onClick={() => onSelect(agent)}
              style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                borderRadius: 12,
                border: `1px solid var(--border-light)`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = color;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${color}20`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* 顶部色条 */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: color,
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color,
                }}>
                  {FAMILY_ICONS[agent.family || 'chat']}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{agent.emoji} {agent.name}</div>
                  <Tag color={color} style={{ fontSize: 10, padding: '0 4px', marginTop: 2 }}>
                    {agent.family}
                  </Tag>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
                {agent.description}
              </div>

              {/* 工具标签 */}
              {agent.tools && agent.tools.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {agent.tools.slice(0, 5).map(tool => (
                    <Tag key={tool} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                      {tool}
                    </Tag>
                  ))}
                  {agent.tools.length > 5 && (
                    <Tag style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                      +{agent.tools.length - 5}
                    </Tag>
                  )}
                </div>
              )}

              {/* 特性标记 */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {agent.needsWorkspace && (
                  <Tooltip title="需要工作目录">
                    <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>📁 工作区</Tag>
                  </Tooltip>
                )}
                {agent.messaging && (
                  <Tooltip title="支持消息通道">
                    <Tag color="purple" style={{ fontSize: 10, padding: '0 4px' }}>📡 消息</Tag>
                  </Tooltip>
                )}
                {agent.connectors && (
                  <Tooltip title="加载连接器">
                    <Tag color="cyan" style={{ fontSize: 10, padding: '0 4px' }}>🔌 连接</Tag>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button
          onClick={() => onSelect({ id: '', name: '默认', description: '', family: 'chat' })}
          style={{
            background: 'none', border: '1px dashed var(--border-light)',
            borderRadius: 8, padding: '8px 24px', cursor: 'pointer',
            color: 'var(--text-tertiary)', fontSize: 12,
          }}
        >
          不使用 Agent（默认模式）
        </button>
      </div>
    </Modal>
  );
}
