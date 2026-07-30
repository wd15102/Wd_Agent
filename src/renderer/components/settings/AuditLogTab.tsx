/**
 * 审计日志标签页 — 展示所有 Agent 操作记录
 * 基于 OpenWorker audit.py 设计
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Select, Tag, Tooltip, Empty } from 'antd';
import { ClearOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';

interface AuditEvent {
  id: string;
  timestamp: number;
  session_id: string;
  agent: string;
  tool: string;
  stage: string;
  status: string;
  approval?: string;
  args?: Record<string, any>;
  result_preview?: string;
  resource?: string;
  duration_ms?: number;
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  success: 'green',
  failure: 'red',
  denied: 'orange',
  pending: 'blue',
};

const STAGE_LABELS: Record<string, string> = {
  start: '开始',
  approval_required: '待审批',
  approved: '已批准',
  denied: '已拒绝',
  executed: '已执行',
  error: '错误',
};

export default function AuditLogTab() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterTool, setFilterTool] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.auditQuery({
        tool: filterTool,
        status: filterStatus,
        limit: 200,
      });
      setEvents(result.events);
      setTotal(result.total);
    } catch (e) {
      console.error('[AuditTab] 加载失败:', e);
    }
    setLoading(false);
  }, [filterTool, filterStatus]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleClear = async () => {
    if (confirm('确定要清空所有审计日志吗？此操作不可恢复。')) {
      await window.electronAPI.auditClear();
      loadEvents();
    }
  };

  const handleExport = async () => {
    const data = await window.electronAPI.auditExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  // 获取所有工具类型（用于筛选）
  const toolSet = new Set<string>();
  events.forEach(e => toolSet.add(e.tool));
  const tools = Array.from(toolSet).sort();

  return (
    <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 统计 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          padding: '10px 16px', background: 'var(--bg-primary)', borderRadius: 8,
          border: '1px solid var(--border-light)', minWidth: 120,
        }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent)' }}>{total}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>总事件数</div>
        </div>
        <div style={{
          padding: '10px 16px', background: 'var(--bg-primary)', borderRadius: 8,
          border: '1px solid var(--border-light)', minWidth: 120,
        }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
            {events.filter(e => e.status === 'success').length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>成功</div>
        </div>
        <div style={{
          padding: '10px 16px', background: 'var(--bg-primary)', borderRadius: 8,
          border: '1px solid var(--border-light)', minWidth: 120,
        }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#ff4d4f' }}>
            {events.filter(e => e.status === 'failure' || e.status === 'denied').length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>失败/拒绝</div>
        </div>
      </div>

      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          placeholder="按工具筛选"
          allowClear
          size="small"
          style={{ minWidth: 140 }}
          value={filterTool}
          onChange={setFilterTool}
          options={tools.map(t => ({ label: t, value: t }))}
        />
        <Select
          placeholder="按状态筛选"
          allowClear
          size="small"
          style={{ minWidth: 140 }}
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { label: '成功', value: 'success' },
            { label: '失败', value: 'failure' },
            { label: '拒绝', value: 'denied' },
            { label: '待审批', value: 'pending' },
          ]}
        />
        <Button size="small" icon={<ReloadOutlined />} onClick={loadEvents} loading={loading}>
          刷新
        </Button>
        <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
        <Button size="small" danger icon={<ClearOutlined />} onClick={handleClear}>
          清空
        </Button>
      </div>

      {/* 事件列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {events.length === 0 ? (
          <Empty description="暂无审计记录" style={{ padding: '40px 0' }} />
        ) : (
          events.map(evt => (
            <div
              key={evt.id}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-primary)',
                borderRadius: 6,
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onClick={() => setExpandedId(expandedId === evt.id ? null : evt.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--text-tertiary)', minWidth: 140 }}>
                  {formatTime(evt.timestamp)}
                </span>
                <Tag color={STATUS_COLORS[evt.status] || 'default'} style={{ fontSize: 10, padding: '0 4px' }}>
                  {evt.status}
                </Tag>
                <span style={{ fontWeight: 500, minWidth: 80 }}>{evt.tool}</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {STAGE_LABELS[evt.stage] || evt.stage}
                </span>
                {evt.duration_ms != null && (
                  <span style={{ color: 'var(--text-placeholder)', fontSize: 10 }}>
                    {evt.duration_ms}ms
                  </span>
                )}
                <span style={{ color: 'var(--text-placeholder)', fontSize: 10, marginLeft: 'auto' }}>
                  session: {evt.session_id.slice(0, 8)}...
                </span>
              </div>

              {/* 展开详情 */}
              {expandedId === evt.id && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: 300,
                  overflowY: 'auto',
                }}>
                  {evt.args && (
                    <div style={{ marginBottom: 4 }}>
                      <strong>参数:</strong>
                      {JSON.stringify(evt.args, null, 2)}
                    </div>
                  )}
                  {evt.result_preview && (
                    <div style={{ marginBottom: 4 }}>
                      <strong>结果:</strong>
                      {evt.result_preview}
                    </div>
                  )}
                  {evt.error && (
                    <div style={{ color: '#ff4d4f' }}>
                      <strong>错误:</strong> {evt.error}
                    </div>
                  )}
                  {evt.approval && (
                    <div>
                      <strong>审批:</strong> {evt.approval}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
