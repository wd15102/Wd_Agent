// ============================================================
// App 根组件 — QClaw 0.2.33 风格 · 增强版（含右侧 Agent 详情面板）
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Layout, message } from 'antd';
import Sidebar from './components/layout/Sidebar';
import ChatPanel from './components/chat/ChatPanel';
import SettingsPanel from './components/settings/SettingsPanel';
import SkillsPlaza from './components/skills/SkillsPlaza';
import MemoryPanel from './components/memory/MemoryPanel';
import CronPanel from './components/cron/CronPanel';
import WorkflowMarketplace from './components/workflow/WorkflowMarketplace';
import ExpertMarketplace from './components/experts/ExpertMarketplace';
import AgentDetailPanel, { AgentExpert } from './components/experts/AgentDetailPanel';
import AgentSelectorModal from './components/chat/AgentSelectorModal';
import { themeEngine } from './components/settings/themeEngine';
import type { Agent } from './components/chat/InputArea';
import type { ElectronAPI } from '../shared/types.electron';

const { Sider, Content } = Layout;

export type Page = 'chat' | 'settings' | 'skills' | 'memory' | 'cron' | 'workflows' | 'experts';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('chat');
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [config, setConfig] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [themeVersion, setThemeVersion] = useState(0);

  // 监听主题变化，强制重新渲染
  useEffect(() => {
    const unsub = themeEngine.onChange(() => {
      setThemeVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // 初始化时从 config 读取默认模型
  useEffect(() => {
    async function init() {
      const cfg = await window.electronAPI.getConfig();
      setConfig(cfg);
      // 设置当前模型为默认模型
      if (cfg?.models?.defaultModel) {
        setCurrentModel(cfg.models.defaultModel);
      }
      // ... rest of init
    }
    init();
  }, []);

  const [agents, setAgents] = useState<Agent[]>([
    { id: 'main', name: '主 Agent', description: '通用对话助手', emoji: '🤖', builtin: true },
    { id: 'code', name: '代码专家', description: '代码编写与调试', emoji: '💻', builtin: true },
    { id: 'research', name: '研究员', description: '信息搜索与分析', emoji: '🔍', builtin: true },
    { id: 'writer', name: '写手', description: '文案创作与润色', emoji: '✍️', builtin: true },
  ]);

  // Right-side agent detail panel
  const [selectedExpert, setSelectedExpert] = useState<any>(null);
  const [showExpertDetail, setShowExpertDetail] = useState(false);
  const [collapsedPanel, setCollapsedPanel] = useState(true);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [reloadExpertsKey, setReloadExpertsKey] = useState(0);

  useEffect(() => {
    async function init() {
      const cfg = await window.electronAPI.getConfig();
      setConfig(cfg);
      const sessList = await window.electronAPI.listSessions();
      setSessions(sessList);
      if (sessList.length > 0 && !activeSessionId) {
        setActiveSessionId(sessList[0].id);
      }
      // Load agents from main process
      try {
        const expertList = await (window.electronAPI as any).listExperts();
        if (expertList.length > 0) {
          setAgents(expertList.map((e: any) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            emoji: e.emoji,
            builtin: e.builtin,
          })));
        }
      } catch {}
    }
    init();
    const unsub1 = window.electronAPI.onNavigate((page: string) => setActivePage(page as Page));
    const unsub2 = window.electronAPI.onNewSession(() => handleNewSession());
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleNewSession = useCallback(async () => {
    setShowAgentSelector(true);
  }, []);

  const handleSelectAgent = useCallback(async (agent: any) => {
    setShowAgentSelector(false);
    const expertId = agent.id || undefined;
    const session = await window.electronAPI.createSession(expertId);
    setSessions((prev: any[]) => [session, ...prev]);
    setActiveSessionId(session.id);
    setActivePage('chat');
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setActivePage('chat');
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    await window.electronAPI.deleteSession(id);
    const sessList = await window.electronAPI.listSessions();
    setSessions(sessList);
    if (id === activeSessionId) setActiveSessionId(sessList[0]?.id || '');
  }, [activeSessionId]);

  const handleSessionRenamed = useCallback(async () => {
    const sessList = await window.electronAPI.listSessions();
    setSessions(sessList);
  }, []);

  const handleNavigate = useCallback((page: string) => setActivePage(page as Page), []);

  const handleSelectExpert = useCallback((expert: any) => {
    setSelectedExpert(expert);
    setShowExpertDetail(true);
  }, []);

  const handleRefreshExpert = useCallback(async (expertId: string) => {
    try {
      const latest = await (window.electronAPI as any).getExpert(expertId);
      if (latest) {
        // 强制重新创建对象引用，确保 React 检测到变化
        setSelectedExpert((prev: AgentExpert | null) => prev?.id === expertId ? { ...latest, avatarUrl: latest.avatarUrl } : prev);
      }
    } catch {}
  }, []);

  const handleStartChatWithExpert = useCallback(async (expertId: string) => {
    if (generating) return;
    try {
      const session = await window.electronAPI.createSession(expertId);
      setSessions((prev: any[]) => [session, ...prev]);
      const updatedSession = await window.electronAPI.getSession(session.id);
      setSessions((prev: any[]) => prev.map(s => s.id === session.id ? updatedSession : s));
      setActiveSessionId(session.id);
      setActivePage('chat');
    } catch {}
  }, [generating]);

  const handleDeleteExpert = useCallback(async (expert: any) => {
    try {
      const result = await (window.electronAPI as any).deleteExpert(expert.id);
      if (result?.ok) {
        message.success('已删除');
        setSessions((prev: any[]) => prev.filter((s: any) => s.expertId !== expert.id));
        setReloadExpertsKey(k => k + 1);
      } else {
        message.error('删除失败');
      }
    } catch { message.error('删除失败'); }
  }, []);

  const handleTogglePinExpert = useCallback(async (expert: any) => {
    try {
      const newPinned = !(expert.pinned || expert.starred);
      await (window.electronAPI as any).updateExpert(expert.id, { pinned: newPinned, starred: newPinned });
    } catch {}
  }, []);

  const handleTogglePinSession = useCallback(async (session: any) => {
    try {
      await (window.electronAPI as any).updateSession(session.id, { pinned: !session.pinned });
      const sessList = await window.electronAPI.listSessions();
      setSessions(sessList);
    } catch {}
  }, []);

  const renderContent = () => {
    switch (activePage) {
      case 'chat':
        return (
          <ChatPanel
            sessionId={activeSessionId}
            generating={generating}
            setGenerating={setGenerating}
            onMessagesSent={handleSessionRenamed}
            models={config?.models?.models || []}
            agents={agents}
            currentModel={currentModel || config?.models?.defaultModel || ''}
            onModelChange={(modelId) => {
              setCurrentModel(modelId);
              // 异步更新 config，不影响 UI 响应
              window.electronAPI.setConfig('models.defaultModel', modelId);
              window.electronAPI.saveConfig();
            }}
            hasBgImage={showBg}
            msgOpacity={msgOpacity}
          />
        );
      case 'settings':
        return (
          <>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: 40, borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
              <span onClick={() => handleNavigate('chat')} style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--accent)' }}>← 返回</span>
            </div>
            <SettingsPanel config={config} setConfig={setConfig} />
          </>
        );
      case 'skills':
        return <SkillsPlaza />;
      case 'memory':
        return <MemoryPanel />;
      case 'cron':
        return <CronPanel />;
      case 'workflows':
        return <WorkflowMarketplace />;
      case 'experts':
        return <ExpertMarketplace />;
      default:
        return (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>功能开发中...</div>
              <div style={{ fontSize: 13 }}>{activePage}</div>
            </div>
          </div>
        );
    }
  };

  const currentTheme = themeEngine.getTheme();
  const hasBgImage = !!currentTheme.backgroundImage;

  // 动态扫描主题图片目录
  const [dynamicImages, setDynamicImages] = useState<string[]>([]);
  useEffect(() => {
    if (!currentTheme.id) return;
    const fetchThemeFiles = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:3210/api/themes/${currentTheme.id}/files`);
        const json = await res.json();
        if (json.ok && json.data?.length > 0) {
          setDynamicImages(json.data);
        } else {
          setDynamicImages([]);
        }
      } catch {
        setDynamicImages([]);
      }
    };
    fetchThemeFiles();
    // 每 30 秒轮询一次，检测新图片
    const timer = setInterval(fetchThemeFiles, 30000);
    return () => clearInterval(timer);
  }, [currentTheme.id]);

  const slideshowImages = dynamicImages.length > 0 ? dynamicImages : (currentTheme.backgroundImages || []);
  const hasSlideshow = slideshowImages.length > 0;
  const [slideIndex, setSlideIndex] = useState(0);

  // 轮播定时器
  useEffect(() => {
    if (!hasSlideshow) return;
    const interval = (currentTheme.backgroundSlideshowInterval || 8) * 1000;
    const timer = setInterval(() => {
      setSlideIndex(i => (i + 1) % slideshowImages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [hasSlideshow, slideshowImages.length, currentTheme.backgroundSlideshowInterval]);

  // 获取透明度配置
  const sidebarOpacity = config?.ui?.sidebarOpacity ?? 0.7;
  const chatOpacity = config?.ui?.chatOpacity ?? 0.65;
  const bgOpacity = config?.ui?.backgroundOpacity ?? currentTheme.backgroundOpacity ?? 0.75;
  const bgBlur = config?.ui?.backgroundBlur ?? currentTheme.backgroundBlur ?? 0;
  const msgOpacity = config?.ui?.messageOpacity ?? 0.55;

  // 获取当前背景图 URL
  const bgImage = hasSlideshow ? slideshowImages[slideIndex] : currentTheme.backgroundImage;
  const showBg = hasSlideshow || hasBgImage;

  return (
    <>
      {/* 背景图片层 — 全局 fixed */}
      {showBg && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: config?.ui?.backgroundFit || currentTheme.backgroundFit || 'cover',
            backgroundPosition: `${(currentTheme.focusX ?? 0.5) * 100}% ${(currentTheme.focusY ?? 0.5) * 100}%`,
            backgroundRepeat: 'no-repeat',
            opacity: bgOpacity,
            filter: `blur(${bgBlur}px)`,
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'background-image 1s ease-in-out, opacity 1s ease-in-out',
          }}
        />
      )}
      <Layout style={{ height: '100vh', display: 'flex', position: 'relative', zIndex: 1, background: showBg ? 'transparent' : 'var(--bg-primary)' }}>
        {activePage !== 'settings' && (
          <Sider width={260} style={{ background: showBg ? `color-mix(in srgb, var(--bg-secondary) ${(sidebarOpacity * 100).toFixed(0)}%, transparent)` : 'var(--bg-secondary)', borderRight: '1px solid var(--border-light)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Sidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onNewSessionWithExpert={handleStartChatWithExpert}
              onDeleteSession={handleDeleteSession}
              onTogglePinSession={handleTogglePinSession}
              onReloadSessions={handleSessionRenamed}
              reloadExpertsKey={reloadExpertsKey}
              onNavigate={handleNavigate}
              generating={generating}
              activePage={activePage}
              onSelectExpert={handleSelectExpert}
              onDeleteExpert={handleDeleteExpert}
              onTogglePinExpert={handleTogglePinExpert}
              sidebarImage={currentTheme.sidebarImage}
              sidebarImageOpacity={config?.ui?.sidebarImageOpacity}
            />
          </Sider>
        )}
        <Content style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: showBg ? `color-mix(in srgb, var(--bg-primary) ${(chatOpacity * 100).toFixed(0)}%, transparent)` : 'var(--bg-primary)' }}>
          {renderContent()}
        </Content>
        {/* Right-side agent detail panel */}
        {activePage === 'chat' && showExpertDetail && selectedExpert && (
          <div style={{
            width: collapsedPanel ? 48 : 360,
            borderLeft: '1px solid var(--border-light)',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            position: 'relative',
          }}>
            {/* 折叠按钮 */}
            <button
              onClick={() => setCollapsedPanel(!collapsedPanel)}
              style={{
                position: 'absolute',
                top: 12,
                right: collapsedPanel ? 8 : 12,
                width: 28, height: 28,
                border: '1px solid var(--border-default)',
                borderRadius: 6,
                background: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-tertiary)',
                zIndex: 10,
                transition: 'all 0.2s ease',
              }}
              title={collapsedPanel ? '展开' : '收起'}
            >
              {collapsedPanel ? '▶' : '◀'}
            </button>
            {!collapsedPanel && (
              <AgentDetailPanel
                expert={selectedExpert}
                onClose={() => { setShowExpertDetail(false); setSelectedExpert(null); }}
                onRefresh={() => { if (selectedExpert?.id) handleRefreshExpert(selectedExpert.id); }}
                onStartChat={handleStartChatWithExpert}
              />
            )}
            {collapsedPanel && (
              <div style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                padding: '40px 0 0 0',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
              }} onClick={() => setCollapsedPanel(false)}>
                {selectedExpert.name}
              </div>
            )}
          </div>
        )}
      </Layout>

      {/* Agent 选择器弹窗 */}
      <AgentSelectorModal
        open={showAgentSelector}
        onSelect={handleSelectAgent}
        onCancel={() => setShowAgentSelector(false)}
      />
    </>
  );
}
