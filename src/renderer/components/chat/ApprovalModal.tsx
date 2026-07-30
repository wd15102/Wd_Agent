// ============================================================
// 权限审批弹窗 — 工具执行前的人在公司回路
// ============================================================
import React from 'react';
import { Modal, Button, Tag, Tooltip } from 'antd';
import { SafetyOutlined, CheckOutlined, CloseOutlined, LockOutlined } from '@ant-design/icons';

interface ApprovalModalProps {
  visible: boolean;
  request: {
    toolName: string;
    args: Record<string, unknown>;
    reason: string;
    toolCallId?: string;
  } | null;
  onApprove: (outcome: 'once' | 'always' | 'deny') => void;
}

const TOOL_NAMES: Record<string, string> = {
  read: '读取文件',
  write: '写入文件',
  list_dir: '列出目录',
  exec: '执行命令',
  web_search: '网页搜索',
  web_fetch: '抓取网页',
  image_reader: '读取图片',
};

const TOOL_COLORS: Record<string, string> = {
  read: 'blue',
  write: 'orange',
  list_dir: 'cyan',
  exec: 'red',
  web_search: 'green',
  web_fetch: 'green',
  image_reader: 'purple',
};

function summarizeArgs(toolName: string, args: Record<string, unknown>): string {
  if (!args) return '';
  try {
    switch (toolName) {
      case 'read':
        return args.path ? `📄 ${args.path}` : '';
      case 'write':
        return args.path ? `📝 ${args.path}` : '';
      case 'list_dir':
        return args.path ? `📁 ${args.path}` : '';
      case 'exec':
        return args.command ? `⚡ ${String(args.command).slice(0, 120)}` : '';
      case 'web_search':
        return args.query ? `🔍 ${String(args.query).slice(0, 80)}` : '';
      case 'web_fetch':
        return args.url ? `🌐 ${String(args.url).slice(0, 80)}` : '';
      default:
        const str = JSON.stringify(args);
        return str.length > 120 ? str.slice(0, 120) + '...' : str;
    }
  } catch {
    return '';
  }
}

export default function ApprovalModal({ visible, request, onApprove }: ApprovalModalProps) {
  if (!request) return null;

  const toolLabel = TOOL_NAMES[request.toolName] || request.toolName;
  const toolColor = TOOL_COLORS[request.toolName] || 'default';
  const summary = summarizeArgs(request.toolName, request.args);

  return (
    <Modal
      open={visible}
      title={null}
      footer={null}
      closable={false}
      centered
      width={420}
      styles={{
        body: { padding: 0 },
      }}
      style={{ borderRadius: 12 }}
    >
      <div style={{ padding: '24px 24px 20px' }}>
        {/* 头部 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(250, 173, 20, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SafetyOutlined style={{ fontSize: 20, color: '#faad14' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              需要您的批准
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              {request.reason || '此操作需要您的许可'}
            </div>
          </div>
        </div>

        {/* 工具信息卡片 */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          padding: '12px 14px',
          border: '1px solid var(--border-light)',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Tag color={toolColor} style={{ fontSize: 12, fontWeight: 500 }}>
              {toolLabel}
            </Tag>
            <span style={{ fontSize: 11, color: 'var(--text-placeholder)', fontFamily: 'monospace' }}>
              {request.toolName}
            </span>
          </div>
          {summary && (
            <div style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>
              {summary}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            block
            size="large"
            icon={<CheckOutlined />}
            type="primary"
            style={{ background: '#52c41a', borderColor: '#52c41a', fontWeight: 500 }}
            onClick={() => onApprove('once')}
          >
            仅此一次
          </Button>
          <Tooltip title="以后此工具不再询问">
            <Button
              block
              size="large"
              icon={<LockOutlined />}
              style={{ fontWeight: 500 }}
              onClick={() => onApprove('always')}
            >
              永久允许
            </Button>
          </Tooltip>
          <Button
            block
            size="large"
            danger
            icon={<CloseOutlined />}
            style={{ fontWeight: 500 }}
            onClick={() => onApprove('deny')}
          >
            拒绝
          </Button>
        </div>
      </div>
    </Modal>
  );
}
