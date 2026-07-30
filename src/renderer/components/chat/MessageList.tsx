// ============================================================
// 消息列表 �?QClaw 0.2.33 风格
// ============================================================
import React, { useState, useEffect } from 'react';
import MessageItem from './MessageItem';
import ToolCallGroup from './ToolCallGroup';
import { RobotOutlined, ThunderboltFilled } from '@ant-design/icons';
import { Avatar } from 'antd';
import { themeEngine } from '../settings/themeEngine';

interface Props {
  messages: any[];
  streamingContent: string;
  streamingReasoning: string;
  toolCalls: any[];
  generating: boolean;
}

export default function MessageList({ messages, streamingContent, streamingReasoning, toolCalls, generating }: Props) {
  const [theme, setTheme] = useState(themeEngine.getTheme());
  useEffect(() => {
    const unsub = themeEngine.onChange((t) => setTheme(t));
    return unsub;
  }, []);

  const brandName = theme.brandSubtitle || '吴东的Claw智能助手';
  const hasToolCalls = toolCalls.length > 0;
  const hasStreaming = streamingContent.length > 0;
  const hasReasoning = streamingReasoning.length > 0;


  return (
    <div>
      <div style={{ maxWidth: 'min(90%, 1200px)', margin: '0 auto', padding: '12px 0' }}>
        {messages.map(msg => <MessageItem key={msg.id} message={msg} />)}

        {hasToolCalls && generating && <ToolCallGroup toolCalls={toolCalls} />}

        {/* Reasoning content (thinking) */}
        {hasReasoning && generating && !hasStreaming && (
          <div style={{ display: 'flex', gap: 10, padding: '10px 16px' }} className="fade-in">
            <Avatar size={26} icon={<RobotOutlined />} style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 4 }}>思考中…</div>
              <div style={{
                fontSize: 13, lineHeight: 1.75, color: 'var(--text-tertiary)', whiteSpace: 'pre-wrap',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 12,
                border: '1px solid var(--border-light)',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 8, left: 12,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ThunderboltFilled style={{ fontSize: 9, color: 'var(--bg-primary)' }} />
                </div>
                {streamingReasoning}
              </div>
            </div>
          </div>
        )}

        {hasStreaming && generating && (
          <div style={{ display: 'flex', gap: 10, padding: '10px 16px' }} className="fade-in">
            <Avatar size={26} icon={<RobotOutlined />} style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 2 }}>吴东的Claw智能助手</div>
              <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {streamingContent}
                <span className="typing-cursor" />
              </div>
            </div>
          </div>
        )}

        {generating && !hasStreaming && !hasToolCalls && !hasReasoning && (
          <div style={{ display: 'flex', gap: 10, padding: '10px 16px' }}>
            <Avatar size={26} icon={<RobotOutlined />} style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginBottom: 2 }}>吴东的Claw智能助手</div>
              <div className="thinking-dots" style={{ display: 'flex', gap: 4, height: 16, alignItems: 'center' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !generating && (
          theme.id === 'kun-exclusive' || theme.id === 'wukong' ? (
            // ====== KUN 专属定制 Hero ======
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '0 24px', position: 'relative', overflow: 'hidden' }}>
              {/* 装饰元素 */}
              {(theme.decorations || []).map((emoji, i) => (
                <span key={i} className="kun-decoration" style={{
                  position: 'absolute',
                  fontSize: 14 + Math.random() * 12,
                  top: `${10 + (i * 17) % 70}%`,
                  left: `${5 + (i * 23) % 90}%`,
                  opacity: 0.6,
                  pointerEvents: 'none',
                  animationDelay: `${i * 0.3}s`,
                }}>{emoji}</span>
              ))}
              {/* 签名图片 */}
              {theme.heroSignature && (
                <div style={{
                  width: 200, height: 80,
                  backgroundImage: `url(${theme.heroSignature})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  marginBottom: 8,
                  filter: 'brightness(1.2)',
                }} />
              )}
              {/* 大标题 */}
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', marginBottom: 4, letterSpacing: '2px', textShadow: `0 0 20px ${theme.colors.accent}40` }}>
                {theme.heroTitle || 'KUN 专属定制皮肤'}
              </h1>
              {/* 副标题 */}
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, letterSpacing: '1px' }}>
                {theme.heroSubtitle || 'WdClaw ikun 限定版'}
              </p>
              {/* 小标签 */}
              {theme.heroTag && (
                <span style={{
                  display: 'inline-block', padding: '2px 12px', borderRadius: 12,
                  background: 'var(--accent-bg)', border: '1px solid var(--border-default)',
                  fontSize: 11, color: 'var(--accent)', marginBottom: 16,
                }}>{theme.heroTag}</span>
              )}
              {/* 印章 + ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                {theme.heroStamp && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                    border: '2px solid var(--accent)', borderRadius: 4,
                    padding: '2px 8px', letterSpacing: '2px',
                    opacity: 0.8,
                  }}>{theme.heroStamp}</span>
                )}
                {theme.heroUniqueId && (
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                    {theme.heroUniqueId}
                  </span>
                )}
              </div>
              {/* 快捷卡片 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 520 }}>
                {[
                  { icon: '</>', title: '探索并理解代码' },
                  { icon: '🧩', title: '构建新功能应用或工具' },
                  { icon: '🔍', title: '审查代码并提出修改建议' },
                  { icon: '🐛', title: '修复问题和失败' },
                ].map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 20,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
                    fontSize: 12, color: 'var(--text-secondary)', cursor: 'default',
                  }}>
                    <span>{tip.icon}</span>
                    <span>{tip.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // ====== 默认空状态 ======
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', textAlign: 'center', padding: '0 24px' }}>
              {/* Logo */}
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35)' }}>
                <RobotOutlined style={{ fontSize: 30, color: 'var(--bg-primary)' }} />
              </div>
              {/* Title */}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>你好，我是 {brandName}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.7, marginBottom: 32 }}>
                {theme.tagline || '你的 Windows 桌面 AI 伙伴。有问题尽管问我，我来帮你搞定。'}
              </p>
              {/* Quote (DreamSkin) */}
              {theme.quote && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 24, fontStyle: 'italic', letterSpacing: '0.5px' }}>
                  — {theme.quote}
                </div>
              )}
              {/* 快捷提示 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 520 }}>
                {[
                  { icon: '💡', text: '解释代码错误' },
                  { icon: '📊', text: '分析数据表格' },
                  { icon: '🔍', text: '搜索最新资料' },
                  { icon: '✍️', text: '写文案/邮件' },
                ].map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 20,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
                    fontSize: 12, color: 'var(--text-secondary)', cursor: 'default',
                  }}>
                    <span>{tip.icon}</span>
                    <span>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
