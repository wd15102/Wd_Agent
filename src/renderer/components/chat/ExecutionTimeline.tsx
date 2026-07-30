// ============================================================
// 可视化执行时间轴 — 展示 Agent 思考/工具调用过程
// ============================================================
import React from 'react';
import {
  LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined,
  BulbOutlined, ToolOutlined, FileOutlined, EditOutlined,
  SearchOutlined, ThunderboltOutlined, ClockCircleOutlined,
} from '@ant-design/icons';

interface ExecutionStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'file_read' | 'file_write' | 'search' | 'command' | 'done' | 'error';
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  startedAt?: number;
  endedAt?: number;
  duration?: number;
}

interface Props {
  steps: ExecutionStep[];
  collapsed?: boolean;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  thinking: <BulbOutlined />,
  tool_call: <ToolOutlined />,
  file_read: <FileOutlined />,
  file_write: <EditOutlined />,
  search: <SearchOutlined />,
  command: <ThunderboltOutlined />,
  done: <CheckCircleOutlined />,
  error: <CloseCircleOutlined />,
};

const STEP_COLORS: Record<string, string> = {
  thinking: '#722ed1',
  tool_call: '#1677ff',
  file_read: '#13c2c2',
  file_write: '#fa8c16',
  search: '#52c41a',
  command: '#f5222d',
  done: '#52c41a',
  error: '#f5222d',
};

function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export default function ExecutionTimeline({ steps, collapsed = false }: Props) {
  if (steps.length === 0) return null;

  // 折叠模式：只显示最后几步
  const displaySteps = collapsed ? steps.slice(-3) : steps;
  const hiddenCount = steps.length - displaySteps.length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      padding: '4px 0',
      maxWidth: 'min(80%, 700px)',
      marginTop: 6,
    }}>
      {hiddenCount > 0 && (
        <div style={{
          fontSize: 11,
          color: 'var(--text-placeholder)',
          textAlign: 'center',
          padding: '4px 0',
          fontStyle: 'italic',
        }}>
          ...还有 {hiddenCount} 个步骤
        </div>
      )}
      {displaySteps.map((step, idx) => {
        const isLast = idx === displaySteps.length - 1;
        const icon = STEP_ICONS[step.type] || <ToolOutlined />;
        const color = STEP_COLORS[step.type] || '#8c8c8c';
        const statusIcon = step.status === 'running'
          ? <LoadingOutlined style={{ fontSize: 11, color: 'var(--accent)' }} />
          : step.status === 'done'
          ? <CheckCircleOutlined style={{ fontSize: 11, color: '#52c41a' }} />
          : step.status === 'error'
          ? <CloseCircleOutlined style={{ fontSize: 11, color: '#ff4d4f' }} />
          : null;

        return (
          <div key={step.id} style={{ display: 'flex', gap: 10, position: 'relative' }}>
            {/* 时间轴竖线 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 20,
              flexShrink: 0,
            }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color,
                flexShrink: 0,
                border: `1.5px solid ${step.status === 'running' ? color : 'transparent'}`,
              }}>
                {icon}
              </div>
              {!isLast && (
                <div style={{
                  width: 1.5,
                  flex: 1,
                  minHeight: 8,
                  background: 'var(--border-light)',
                  margin: '2px 0',
                }} />
              )}
            </div>

            {/* 内容 */}
            <div style={{
              paddingBottom: isLast ? 0 : 10,
              flex: 1,
              minWidth: 0,
              paddingTop: 1,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--text-primary)',
                fontWeight: 500,
              }}>
                <span>{step.title}</span>
                {statusIcon}
                {step.duration != null && step.duration > 0 && (
                  <span style={{
                    fontSize: 10,
                    color: 'var(--text-placeholder)',
                    fontWeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}>
                    <ClockCircleOutlined style={{ fontSize: 9 }} />
                    {formatDuration(step.duration)}
                  </span>
                )}
              </div>
              {step.description && (
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  lineHeight: 1.5,
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  background: 'var(--bg-secondary)',
                  borderRadius: 4,
                  padding: '3px 6px',
                  marginTop: 4,
                  maxHeight: 60,
                  overflow: 'hidden',
                }}>
                  {step.description.length > 150 ? step.description.slice(0, 150) + '...' : step.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
