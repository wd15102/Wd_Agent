// ============================================================
// 聊天面板 — QClaw 0.2.33 风格
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import ApprovalModal from './ApprovalModal';
import ExecutionTimeline from './ExecutionTimeline';
import type { Agent } from './InputArea';
import type { SelectedFile } from './InputArea';
import { themeEngine } from '../settings/themeEngine';

interface Props {
  sessionId: string;
  generating: boolean;
  setGenerating: (v: boolean) => void;
  onMessagesSent: () => void;
  models?: Array<{ id: string; name: string; free?: boolean }>;
  agents?: Agent[];
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
  hasBgImage?: boolean;
  msgOpacity?: number;
}

export default function ChatPanel({ sessionId, generating, setGenerating, onMessagesSent, models = [], agents = [], currentModel, onModelChange, hasBgImage, msgOpacity = 0.55 }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);
  const [permissionRequest, setPermissionRequest] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 设置消息气泡透明度 CSS 变量
  useEffect(() => {
    document.documentElement.style.setProperty('--msg-opacity', String(msgOpacity));
  }, [msgOpacity]);

  useEffect(() => {
    async function load() {
      if (sessionId) {
        const session = await window.electronAPI.getSession(sessionId);
        if (session) setMessages(session.messages || []);
      }
      setStreamingContent('');
      setStreamingReasoning('');
      setToolCalls([]);
      setExecutionSteps([]);
    }
    load();
  }, [sessionId]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(window.electronAPI.onToken((data: any) => {
      if (data.sessionId === sessionId) setStreamingContent(data.content);
    }));
    unsubs.push(window.electronAPI.onReasoning((data: any) => {
      if (data.sessionId === sessionId) setStreamingReasoning(data.content);
    }));
    unsubs.push(window.electronAPI.onToolCall((data: any) => {
      if (data.sessionId === sessionId) {
        setToolCalls(prev => {
          const existing = prev.findIndex(t => t.id === data.toolCall.id);
          if (existing >= 0) { const updated = [...prev]; updated[existing] = data.toolCall; return updated; }
          return [...prev, data.toolCall];
        });
      }
    }));
    unsubs.push(window.electronAPI.onToolResult((data: any) => {
      if (data.sessionId === sessionId) {
        setToolCalls(prev => prev.map(t => t.id === data.toolCall.id ? data.toolCall : t));
      }
    }));
    unsubs.push(window.electronAPI.onPermissionRequired((data: any) => {
      if (data.sessionId === sessionId) {
        setPermissionRequest(data.request);
      }
    }));
    unsubs.push(window.electronAPI.onExecutionStep((data: any) => {
      if (data.sessionId === sessionId) {
        setExecutionSteps(prev => {
          const idx = prev.findIndex(s => s.id === data.step.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...data.step };
            return updated;
          }
          return [...prev, data.step];
        });
      }
    }));
    unsubs.push(window.electronAPI.onChatDone(async (data: any) => {
      if (data.sessionId === sessionId) {
        const session = await window.electronAPI.getSession(sessionId);
        if (session) {
          const msgs = session.messages;
          // Preserve thinking and tool calls on the last assistant message
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.role === 'assistant') {
              if (streamingReasoning) lastMsg.thinking = streamingReasoning;
              if (toolCalls.length > 0) lastMsg.toolCalls = toolCalls;
              if (executionSteps.length > 0) lastMsg.executionSteps = executionSteps;
            }
          }
          setMessages(msgs);
        }
        setStreamingContent('');
        setStreamingReasoning('');
        setToolCalls([]);
        setExecutionSteps([]);
        setGenerating(false);
        onMessagesSent();
      }
    }));
    unsubs.push(window.electronAPI.onChatError(async (data: any) => {
      if (data.sessionId === sessionId) {
        const session = await window.electronAPI.getSession(sessionId);
        if (session) {
          const msgs = session.messages;
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.role === 'assistant') {
              if (streamingReasoning) lastMsg.thinking = streamingReasoning;
              if (toolCalls.length > 0) lastMsg.toolCalls = toolCalls;
            }
          }
          setMessages(msgs);
        }
        setStreamingContent('');
        setStreamingReasoning('');
        setToolCalls([]);
        setExecutionSteps([]);
        setGenerating(false);
      }
    }));
    return () => unsubs.forEach(u => u());
  }, [sessionId]);

  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentGif, setCurrentGif] = useState('');
  const [theme, setTheme] = useState(themeEngine.getTheme());

  // 主题变化时随机选一张 GIF
  useEffect(() => {
    const unsub = themeEngine.onChange((t) => {
      setTheme(t);
      const gifs = t.welcomeGifs;
      if (gifs && gifs.length > 0) {
        setCurrentGif(gifs[Math.floor(Math.random() * gifs.length)]);
      } else {
        setCurrentGif('');
      }
    });
    // 初始化
    const gifs = theme.welcomeGifs;
    if (gifs && gifs.length > 0) {
      setCurrentGif(gifs[Math.floor(Math.random() * gifs.length)]);
    }
    return unsub;
  }, []);

  // 新建聊天时（无消息、未生成）随机切换 GIF
  useEffect(() => {
    if (messages.length === 0 && !generating) {
      const gifs = theme.welcomeGifs;
      if (gifs && gifs.length > 0) {
        setCurrentGif(gifs[Math.floor(Math.random() * gifs.length)]);
      }
    }
  }, [messages.length, generating]);

  useEffect(() => {
    if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, streamingReasoning, toolCalls, isUserScrolledUp]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsUserScrolledUp(distFromBottom > 100);
  }, []);

  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = useCallback(async (text: string, opts?: { agentIds?: string[]; files?: SelectedFile[]; modelId?: string }) => {
    if (!sessionId || generating) return;
    setGenerating(true);
    setStreamingContent('');
    setToolCalls([]);
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() }]);
    await window.electronAPI.sendMessage(sessionId, text, opts?.modelId, opts?.agentIds, opts?.files);
  }, [sessionId, generating]);

  const handleStop = useCallback(async () => {
    const result = await window.electronAPI.stopChat();
    if (result?.ok) {
      setGenerating(false);
      setStreamingContent('');
      setStreamingReasoning('');
      setToolCalls([]);
    }
  }, []);

  const handleApproval = useCallback(async (outcome: 'once' | 'always' | 'deny') => {
    if (permissionRequest?.toolCallId) {
      await window.electronAPI.sendApprovalResponse(permissionRequest.toolCallId, outcome);
    }
    setPermissionRequest(null);
  }, [permissionRequest]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: hasBgImage ? 'transparent' : 'var(--bg-primary)' }}>
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', background: hasBgImage ? 'transparent' : 'var(--bg-primary)' }} onScroll={handleScroll} ref={scrollContainerRef}>
        {/* 全屏欢迎 GIF — 新建聊天时展示 */}
        {messages.length === 0 && !generating && currentGif && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', pointerEvents: 'none', overflow: 'hidden' }}>
            <img src={currentGif} alt="welcome" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <MessageList messages={messages} streamingContent={streamingContent} streamingReasoning={streamingReasoning} toolCalls={toolCalls} generating={generating} />
          {generating && executionSteps.length > 0 && (
            <div style={{ padding: '0 24px 8px' }}>
              <ExecutionTimeline steps={executionSteps} collapsed={executionSteps.length > 6} />
            </div>
          )}
        </div>
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </div>
      {isUserScrolledUp && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <button onClick={scrollToBottom} style={{ fontSize: 12, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', color: 'var(--text-secondary)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            回到底部 ↓
          </button>
        </div>
      )}
      <InputArea 
        onSend={handleSend} 
        onStop={handleStop} 
        disabled={!sessionId} 
        generating={generating} 
        models={models} 
        agents={agents} 
        currentModel={currentModel} 
        onModelChange={onModelChange} 
      />
      <ApprovalModal
        visible={!!permissionRequest}
        request={permissionRequest}
        onApprove={handleApproval}
      />
    </div>
  );
}
