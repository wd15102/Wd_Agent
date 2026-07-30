// ============================================================
// 工具调用汇总卡�?�?QClaw 0.2.33 风格
// ============================================================
import React, { useState } from 'react';
import { Button, Collapse, Tag, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CodeOutlined,
  SearchOutlined,
  GlobalOutlined,
  FileTextOutlined,
  ToolOutlined,
} from '@ant-design/icons';

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface Props {
  toolCalls: ToolCall[];
}

const TOOL_LABELS: Record<string, string> = {
  exec: '执行命令',
  web_search: '网页搜索',
  web_fetch: '网页抓取',
  read: '读取文件',
  write: '写入文件',
  list_dir: '列出目录',
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  exec: <CodeOutlined />,
  web_search: <SearchOutlined />,
  web_fetch: <GlobalOutlined />,
  read: <FileTextOutlined />,
  write: <FileTextOutlined />,
  list_dir: <FileTextOutlined />,
};

export default function ToolCallGroup({ toolCalls }: Props) {
  if (toolCalls.length === 0) return null;

  const doneCount = toolCalls.filter(t => t.status === 'done').length;
  const errorCount = toolCalls.filter(t => t.status === 'error').length;
  const runningCount = toolCalls.filter(t => t.status === 'running' || t.status === 'pending').length;

  const statusIcon = () => {
    if (runningCount > 0) return <LoadingOutlined style={{ color: 'var(--accent)' }} />;
    if (errorCount > 0) return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
  };

  const collapseItems = toolCalls.map(tc => {
    const label = TOOL_LABELS[tc.name] || tc.name;
    const icon = TOOL_ICONS[tc.name] || <ToolOutlined />;
    return {
      key: tc.id,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-placeholder)' }}>{icon}</span>
          <span style={{ fontWeight: 500 }}>{label}</span>
          {tc.status === 'done' && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 11 }} />}
          {tc.status === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 11 }} />}
          {(tc.status === 'running' || tc.status === 'pending') && <LoadingOutlined style={{ color: 'var(--accent)', fontSize: 11 }} />}
        </div>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-placeholder)', marginBottom: 2 }}>参数</div>
            <pre style={{ fontSize: 11, background: 'var(--bg-secondary)', borderRadius: 4, padding: 8, overflow: 'auto', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', margin: 0 }}>
              {JSON.stringify(tc.args, null, 2)}
            </pre>
          </div>
          {tc.result && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-placeholder)', marginBottom: 2 }}>{tc.status === 'error' ? '错误' : '结果'}</div>
              <pre style={{
                fontSize: 11, borderRadius: 4, padding: 8, overflow: 'auto', maxHeight: 200,
                border: '1px solid ' + (tc.status === 'error' ? '#ffccc7' : 'var(--border-light)'),
                background: tc.status === 'error' ? '#fff2f0' : 'var(--bg-secondary)',
                color: tc.status === 'error' ? '#cf1322' : 'var(--text-secondary)', margin: 0,
              }}>
                {tc.result}
              </pre>
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="fade-in" style={{ margin: '6px 16px', borderRadius: 8, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 11, color: 'var(--text-tertiary)' }}>
        {statusIcon()}
        <span style={{ fontWeight: 500 }}>调用 {toolCalls.length} 个工具</span>
        {runningCount > 0 && <span style={{ color: 'var(--text-placeholder)' }}>({runningCount} 进行中)</span>}
      </div>
      <Collapse items={collapseItems} ghost size="small" style={{ fontSize: 12 }} />
    </div>
  );
}
