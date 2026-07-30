// ============================================================
// 消息�?�?QClaw 0.2.33 风格
// ============================================================
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar, Collapse, Tag, Tooltip } from 'antd';
import { UserOutlined, RobotOutlined, ThunderboltFilled, CodeOutlined, SearchOutlined, GlobalOutlined, FileTextOutlined, ToolOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, DownOutlined } from '@ant-design/icons';
import CodeBlock from '../common/CodeBlock';
import ExecutionTimeline from './ExecutionTimeline';

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

interface Props {
  message: {
    id: string;
    role: string;
    content: string | any[];
    timestamp: number;
    thinking?: string;
    toolCalls?: ToolCall[];
    executionSteps?: any[];
  };
}

export default function MessageItem({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system' || message.role === 'tool';
  if (isSystem) return null;

  return (
    <div className="fade-in" style={{ display: 'flex', gap: 10, padding: '10px 16px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <Avatar
        size={26}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        style={{
          background: isUser ? 'var(--accent)' : 'var(--bg-tertiary)',
          color: isUser ? 'var(--bg-primary)' : 'var(--accent)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 2, lineHeight: 1.4 }}>
          {isUser ? '你' : '吴东的Claw智能助手'}
        </div>

        {isUser ? (
          <div style={{
            display: 'inline-block', maxWidth: '80%',
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
            padding: '8px 12px', borderRadius: '8px 8px 2px 8px',
            fontSize: 14, lineHeight: 1.75,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {Array.isArray(message.content) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {message.content.map((part: any, idx: number) => {
                  if (part.type === 'text') {
                    return <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>{part.text}</div>;
                  }
                  if (part.type === 'image_url') {
                    return <img key={idx} src={part.image_url.url} alt="uploaded" style={{ maxWidth: 240, borderRadius: 8, border: '1px solid var(--border-light)' }} />;
                  }
                  return null;
                })}
              </div>
            ) : (
              message.content
            )}
          </div>
        ) : (
          <div className="markdown-body" style={{ maxWidth: '100%' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  if (!match) return <code className={className} {...props}>{children}</code>;
                  return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />;
                },
              }}
            >
              {Array.isArray(message.content) ? message.content.find((p: any) => p.type === 'text')?.text || '' : message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* 思考过�?- 折叠展示 */}
        {message.thinking && message.thinking.length > 0 && (
          <div style={{ marginTop: 8, width: '100%', maxWidth: 'min(80%, 700px)' }}>
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: 'thinking',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ThunderboltFilled style={{ color: '#667eea', fontSize: 12 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>深度思考</span>
                    </div>
                  ),
                  children: (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                      padding: '10px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                      border: '1px solid var(--border-light)',
                      marginTop: 6,
                      whiteSpace: 'pre-wrap',
                      fontStyle: 'italic',
                    }}>
                      {message.thinking}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* 工具调用日志 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallLog toolCalls={message.toolCalls} />
        )}

        {/* 执行时间轴（历史消息） */}
        {message.executionSteps && message.executionSteps.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <ExecutionTimeline steps={message.executionSteps} collapsed={message.executionSteps.length > 6} />
          </div>
        )}

        <div style={{ fontSize: 10, color: 'var(--text-placeholder)', marginTop: 2, lineHeight: 1.4, textAlign: isUser ? 'right' : 'left' }}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 工具调用日志 �?显示工具执行过程和结�?// ============================================================
const TOOL_LOG_LABELS: Record<string, string> = {
  exec: '执行命令',
  web_search: '网页搜索',
  web_fetch: '网页抓取',
  read: '读取文件',
  write: '写入文件',
  list_dir: '列出目录',
};

const TOOL_LOG_ICONS: Record<string, React.ReactNode> = {
  exec: <CodeOutlined />,
  web_search: <SearchOutlined />,
  web_fetch: <GlobalOutlined />,
  read: <FileTextOutlined />,
  write: <FileTextOutlined />,
  list_dir: <FileTextOutlined />,
};

function getToolDescription(tc: ToolCall): string {
  const args = tc.args as any;
  switch (tc.name) {
    case 'read':
      return `查看�?${args.path || args.file_path || ''}`;
    case 'write':
      return `写入�?${args.path || args.file_path || ''}`;
    case 'exec':
      return `执行了命�?${args.command ? (args.command.length > 60 ? args.command.slice(0, 60) + '...' : args.command) : ''}`;
    case 'web_search':
      return `搜索�?"${args.query || ''}"`;
    case 'web_fetch':
      return `抓取�?${args.url || ''}`;
    case 'list_dir':
      return `列出�?${args.path || ''}`;
    default:
      return `${tc.name}`;
  }
}

function ToolCallLog({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginTop: 8, width: '100%', maxWidth: 'min(80%, 700px)' }}>
      {/* 标题�?*/}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', cursor: 'pointer',
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          border: '1px solid var(--border-light)',
          fontSize: 12, color: 'var(--text-tertiary)',
          userSelect: 'none',
        }}
      >
        <DownOutlined style={{ fontSize: 10, transition: 'transform 0.2s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
        <ToolOutlined style={{ fontSize: 12 }} />
        <span style={{ fontWeight: 500 }}>调用 {toolCalls.length} 个工具</span>
      </div>

      {/* 工具调用列表 */}
      {expanded && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {toolCalls.map(tc => {
            const icon = TOOL_LOG_ICONS[tc.name] || <ToolOutlined />;
            const description = getToolDescription(tc);
            const statusIcon = tc.status === 'done'
              ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 11 }} />
              : tc.status === 'error'
              ? <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 11 }} />
              : <LoadingOutlined style={{ color: 'var(--accent)', fontSize: 11 }} />;

            return (
              <Collapse
                key={tc.id}
                ghost
                size="small"
                items={[
                  {
                    key: tc.id,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                        <span style={{ color: 'var(--text-placeholder)', fontSize: 12 }}>{icon}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>{description}</span>
                        {statusIcon}
                      </div>
                    ),
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-placeholder)', marginBottom: 2 }}>参数</div>
                          <pre style={{
                            fontSize: 11, background: 'var(--bg-secondary)', borderRadius: 4,
                            padding: 8, overflow: 'auto', border: '1px solid var(--border-light)',
                            color: 'var(--text-secondary)', margin: 0, maxHeight: 150,
                          }}>
                            {JSON.stringify(tc.args, null, 2)}
                          </pre>
                        </div>
                        {tc.result && (
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-placeholder)', marginBottom: 2 }}>
                              {tc.status === 'error' ? '错误' : '结果'}
                            </div>
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
                  },
                ]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
