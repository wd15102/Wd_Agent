// ============================================================
// Sidebar - QClaw 0.2.33 还原版
// 顶部导航 + 专家分组对话列表（点击专家展开对话）
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { Button, Tooltip, Empty, Badge, Dropdown, message } from 'antd';
import { themeEngine } from '../settings/themeEngine';
import {
  PlusOutlined,
  MessageOutlined,
  DeleteOutlined,
  SettingOutlined,
  EditOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ScheduleOutlined,
  BranchesOutlined,
  FolderOpenOutlined,
  RobotOutlined,
  EllipsisOutlined,
  StarFilled,
  PushpinFilled,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  BulbOutlined,
  BulbFilled,
  InfoCircleOutlined,
  MoreOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { formatTime } from '../../../shared/utils';

type NavKey = 'chat' | 'experts' | 'skills' | 'cron' | 'workflows' | 'files' | 'more';

interface Props {
  sessions: any[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onNewSessionWithExpert: (expertId: string) => void;
  onDeleteSession: (id: string) => void;
  onNavigate: (page: string) => void;
  generating: boolean;
  activePage: string;
  onSelectExpert?: (expert: any) => void;
  onDeleteExpert?: (expert: any) => void;
  onTogglePinExpert?: (expert: any) => void;
  onTogglePinSession?: (session: any) => void;
  onReloadSessions?: () => void;
  onReloadExperts?: () => void;
  reloadExpertsKey?: number;
  sidebarImage?: string;
  sidebarImageOpacity?: number;
}

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ReactNode }[] = [
  { key: 'chat', label: '新建对话', icon: <PlusOutlined /> },
  { key: 'experts', label: '专家广场', icon: <RobotOutlined /> },
  { key: 'skills', label: '技能广场', icon: <AppstoreOutlined /> },
  { key: 'cron', label: '定时任务', icon: <ScheduleOutlined /> },
  { key: 'workflows', label: '工作流', icon: <BranchesOutlined /> },
  { key: 'files', label: '文件空间', icon: <FolderOpenOutlined /> },
  { key: 'more', label: '更多', icon: <EllipsisOutlined /> },
];

const MAX_VISIBLE_SESSIONS = 0;

export default function Sidebar({
  sessions, activeSessionId, onSelectSession, onNewSession, onNewSessionWithExpert, onDeleteSession, onNavigate, generating, activePage, onSelectExpert, onDeleteExpert, onTogglePinExpert, onTogglePinSession, onReloadSessions, reloadExpertsKey,
  sidebarImage, sidebarImageOpacity,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(themeEngine.getTheme());

  useEffect(() => {
    const unsub = themeEngine.onChange((t) => setTheme(t));
    return unsub;
  }, []);
  const [experts, setExperts] = useState<any[]>([]);
  const [expandedExperts, setExpandedExperts] = useState<Set<string>>(new Set());

  useEffect(() => { loadExperts(); }, []);
  useEffect(() => { loadExperts(); }, [reloadExpertsKey]);

  const prevSessionsRef = useRef<string[]>([]);
  useEffect(() => {
    if (sessions.length > 0) {
      const currentIds = sessions.map(s => s.id);
      const prevIds = prevSessionsRef.current;
      const newIds = currentIds.filter(id => !prevIds.includes(id));
      if (newIds.length > 0) {
        const newSession = sessions.find(s => s.id === newIds[0]);
        if (newSession) {
          const expertId = newSession.expertId || newSession.experterId;
          if (expertId && !expandedExperts.has(expertId)) {
            setExpandedExperts(prev => new Set(prev).add(expertId));
          }
        }
      }
    }
    prevSessionsRef.current = sessions.map(s => s.id);
  }, [sessions]);

  const loadExperts = async () => {
    try {
      const list = await (window.electronAPI as any).listExperts();
      setExperts(list);
    } catch {}
  };

  const toggleExpertExpand = (expertId: string) => {
    setExpandedExperts(prev => {
      const next = new Set(prev);
      if (next.has(expertId)) { next.delete(expertId); }
      else { next.add(expertId); }
      return next;
    });
  };

  const startRename = (id: string, title: string) => { setEditingId(id); setEditTitle(title); };
  const confirmRename = async (id: string) => {
    if (editTitle.trim()) {
      await window.electronAPI.renameSession(id, editTitle.trim());
      setEditingId(null);
      onReloadSessions?.();
    }
  };

  const handleNavClick = (key: NavKey) => {
    if (key === 'chat') onNewSession();
    else if (key === 'more') onNavigate('memory');
    else onNavigate(key);
  };

  const sessionsByExpert = new Map<string, any[]>();
  sessions.forEach(s => {
    const key = s.experterId || s.expertId || 'general';
    if (!sessionsByExpert.has(key)) sessionsByExpert.set(key, []);
    sessionsByExpert.get(key)!.push(s);
  });

  const sortedExperts = [...experts].sort((a, b) => {
    const aSessions = sessionsByExpert.get(a.id) || [];
    const bSessions = sessionsByExpert.get(b.id) || [];
    if (aSessions.length !== bSessions.length) return bSessions.length - aSessions.length;
    if (a.builtin !== b.builtin) return a.builtin ? -1 : 1;
    return 0;
  });

  const hasSidebarImage = !!sidebarImage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: hasSidebarImage ? 'transparent' : 'var(--bg-secondary)', borderRight: '1px solid var(--border-light)', position: 'relative' }}>
      {hasSidebarImage && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `url(${sidebarImage})`, backgroundSize: 'cover', backgroundPosition: 'center top', opacity: sidebarImageOpacity ?? 0.35, zIndex: 0, pointerEvents: 'none' }} />
      )}
      {hasSidebarImage && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-secondary)', opacity: 0.65, zIndex: 0, pointerEvents: 'none' }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--bg-primary)', fontWeight: 700, fontSize: 13 }}>W</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{theme.brandSubtitle || '吴东的Claw智能助手'}</span>
          </div>
          <Button type="text" size="small" icon={<BulbOutlined />} />
        </div>

        <nav style={{ padding: 6, borderBottom: '1px solid var(--border-light)' }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              disabled={generating && item.key === 'chat'}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8, border: 'none',
                fontSize: 13, marginBottom: 2,
                cursor: generating && item.key === 'chat' ? 'not-allowed' : 'pointer',
                opacity: generating && item.key === 'chat' ? 0.4 : 1,
                color: activePage === item.key ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activePage === item.key ? 500 : 400,
                background: activePage === item.key ? 'var(--accent-light)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (activePage !== item.key) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (activePage !== item.key) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {sortedExperts.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无对话" style={{ marginTop: 24 }} />
          ) : (
            sortedExperts.map(expert => {
              const expertSessions = (sessionsByExpert.get(expert.id) || []).sort((a: any, b: any) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return (b.updatedAt || 0) - (a.updatedAt || 0);
              });
              const isExpanded = expandedExperts.has(expert.id);

              return (
                <div key={expert.id} style={{ marginBottom: 2 }}>
                  <div
                    className="expert-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', cursor: 'pointer',
                      background: 'transparent', transition: 'background 0.15s',
                      borderLeft: '3px solid transparent',
                    }}
                    onClick={() => {
                      if (expertSessions.length > 0) toggleExpertExpand(expert.id);
                      else if (onSelectExpert) onSelectExpert(expert);
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-tertiary)', fontSize: 13, flexShrink: 0,
                    }}>
                      {expert.avatarUrl ? (
                        <img src={expert.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        expert.emoji || '🤖'
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {expert.name}
                      </span>
                      {expertSessions.length > 0 && (
                        <span style={{
                          fontSize: 10, color: 'var(--bg-primary)', background: 'var(--accent)', borderRadius: 10,
                          padding: '0 6px', lineHeight: '16px', flexShrink: 0,
                        }}>
                          {expertSessions.length}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 2, opacity: 1, transition: 'opacity 0.15s' }} className="expert-actions">
                      <Tooltip title="更多">
                        <Dropdown
                          menu={{
                            items: [
                              { key: 'detail', label: '查看详情', icon: <InfoCircleOutlined />, onClick: () => onSelectExpert?.(expert) },
                              { key: 'pin', label: expert.pinned ? '取消置顶' : '置顶', icon: <PushpinFilled />, onClick: () => onTogglePinExpert?.(expert) },
                              { type: 'divider' },
                              { key: 'delete', label: '删除专家', danger: true, icon: <DeleteOutlined />, onClick: () => { if (confirm(`确定删除专家「${expert.name}」？`)) onDeleteExpert?.(expert); } },
                            ],
                          }}
                          trigger={['click']}
                        >
                          <Button size="small" type="text" icon={<MoreOutlined style={{ fontSize: 12 }} />} onClick={e => e.stopPropagation()} />
                        </Dropdown>
                      </Tooltip>
                      <Tooltip title="新建对话">
                        <Button size="small" type="text" icon={<PlusOutlined style={{ fontSize: 12 }} />} onClick={e => { e.stopPropagation(); onNewSessionWithExpert(expert.id); }} />
                      </Tooltip>
                      {expertSessions.length > 0 && (
                        <Tooltip title={isExpanded ? '收起' : '展开'}>
                          <Button
                            size="small"
                            type="text"
                            icon={<DownOutlined style={{ fontSize: 10, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />}
                            onClick={e => { e.stopPropagation(); toggleExpertExpand(expert.id); }}
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {expertSessions.length > 0 && (
                    <>
                      <div style={{ display: isExpanded ? 'block' : 'none' }}>
                        {expertSessions.map((session: any) => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            isActive={session.id === activeSessionId && activePage === 'chat'}
                            expert={expert}
                            editingId={editingId}
                            editTitle={editTitle}
                            onSelectSession={onSelectSession}
                            onStartRename={startRename}
                            onSetEditTitle={setEditTitle}
                            onConfirmRename={confirmRename}
                            onCancelRename={() => setEditingId(null)}
                            onDeleteSession={onDeleteSession}
                          />
                        ))}
                      </div>
                      {!isExpanded && (
                        <>
                          {expertSessions.slice(0, MAX_VISIBLE_SESSIONS).map((session: any) => (
                            <SessionItem
                              key={session.id}
                              session={session}
                              isActive={session.id === activeSessionId && activePage === 'chat'}
                              expert={expert}
                              editingId={editingId}
                              editTitle={editTitle}
                              onSelectSession={onSelectSession}
                              onStartRename={startRename}
                              onSetEditTitle={setEditTitle}
                              onConfirmRename={confirmRename}
                              onCancelRename={() => setEditingId(null)}
                              onDeleteSession={onDeleteSession}
                            />
                          ))}
                          {expertSessions.length > MAX_VISIBLE_SESSIONS && (
                            <div
                              onClick={() => toggleExpertExpand(expert.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 14px 4px 32px', cursor: 'pointer',
                                fontSize: 11, color: 'var(--accent)', fontWeight: 500,
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <DownOutlined style={{ fontSize: 9 }} />
                              查看更多 ({expertSessions.length - MAX_VISIBLE_SESSIONS})
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}

          {sessions.length === 0 && sortedExperts.length === 0 && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击「新建对话」开始" style={{ marginTop: 32 }} />
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={() => onNavigate('settings')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', border: 'none',
              background: activePage === 'settings' ? 'var(--accent-light)' : 'transparent',
              color: activePage === 'settings' ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: activePage === 'settings' ? 500 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (activePage !== 'settings') e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (activePage !== 'settings') e.currentTarget.style.background = 'transparent'; }}
          >
            <SettingOutlined style={{ fontSize: 14 }} />
            <span>设置</span>
          </button>
          <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text-placeholder)', textAlign: 'center' }}>
            {theme.brandSubtitle || '吴东的Claw智能助手'} v0.1.0
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionItem({ session, isActive, expert, editingId, editTitle, onSelectSession, onStartRename, onSetEditTitle, onConfirmRename, onCancelRename, onDeleteSession, onTogglePinSession }: any) {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuClick = (key: string) => {
    setMenuVisible(false);
    switch (key) {
      case 'edit':
        onStartRename(session.id, session.title);
        break;
      case 'pin':
        onTogglePinSession?.(session);
        break;
      case 'delete':
        if (confirm('确定删除此对话？')) onDeleteSession(session.id);
        break;
      case 'share':
        navigator.clipboard.writeText(session.title).then(() => {
          message.success('对话名称已复制到剪贴板');
        });
        break;
    }
  };

  return (
    <div
      onClick={() => onSelectSession(session.id)}
      className="session-item"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 14px 5px 32px', margin: '0 2px', borderRadius: 6,
        cursor: 'pointer', background: isActive ? 'var(--accent-light)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {session.pinned ? (
        <PushpinFilled style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0 }} />
      ) : isActive ? (
        <StarFilled style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0 }} />
      ) : (
        <MessageOutlined style={{ fontSize: 10, color: 'var(--text-placeholder)', flexShrink: 0 }} />
      )}

      {editingId === session.id ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            value={editTitle}
            onChange={e => onSetEditTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onConfirmRename(session.id);
              if (e.key === 'Escape') onCancelRename();
            }}
            autoFocus
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, fontSize: 12, padding: '2px 6px', border: '1px solid var(--border-default)', borderRadius: 4, background: 'var(--bg-primary)' }}
          />
          <Button size="small" type="text" icon={<CheckOutlined />} onClick={e => { e.stopPropagation(); onConfirmRename(session.id); }} />
          <Button size="small" type="text" icon={<CloseOutlined />} onClick={e => { e.stopPropagation(); onCancelRename(); }} />
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4,
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}>
            {session.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--text-placeholder)' }}>
              {formatTime(session.updatedAt || session.createdAt)}
            </span>
          </div>
        </div>
      )}

      {editingId !== session.id && (
        <div style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }} className="session-actions">
          <Dropdown
            menu={{
              items: [
                { key: 'pin', label: '置顶', icon: <PushpinFilled />, onClick: () => handleMenuClick('pin') },
                { key: 'share', label: '分享', icon: <ShareAltOutlined />, onClick: () => handleMenuClick('share') },
                { type: 'divider' },
                { key: 'edit', label: '重命名', icon: <EditOutlined />, onClick: () => handleMenuClick('edit') },
                { type: 'divider' },
                { key: 'delete', label: '删除', danger: true, icon: <DeleteOutlined />, onClick: () => handleMenuClick('delete') },
              ],
            }}
            trigger={['click']}
            onOpenChange={setMenuVisible}
            getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
          >
            <Button
              size="small"
              type="text"
              icon={<EllipsisOutlined style={{ fontSize: 14 }} />}
              onClick={e => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      )}
    </div>
  );
}
