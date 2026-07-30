// ============================================================
// 定时任务面板 - Cron Panel v2
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Tag, Tooltip, Empty, Modal, Input, Switch, message, Popconfirm, Divider, Badge } from 'antd';
import {
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  EditOutlined,
  HistoryOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

interface CronJob {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
  lastRun?: number;
  lastStatus?: 'success' | 'error';
  runCount: number;
}

interface ExecutionRecord {
  jobId: string;
  jobName: string;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'success' | 'error' | 'skipped';
  error?: string;
  output?: string;
}

export default function CronPanel() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<CronJob> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyJob, setHistoryJob] = useState<CronJob | null>(null);
  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.electronAPI.listCronJobs();
      setJobs(list);
    } catch {
      // IPC 未注册时用空列表
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // 监听执行事件
  useEffect(() => {
    const startedHandler = (_e: any, data: any) => {
      setRunningIds(prev => new Set(prev).add(data.jobId));
    };
    const executedHandler = (_e: any, data: any) => {
      setRunningIds(prev => {
        const next = new Set(prev);
        next.delete(data.jobId);
        return next;
      });
      loadJobs();
    };

    window.electronAPI.onCronStarted(startedHandler);
    window.electronAPI.onCronExecuted(executedHandler);

    return () => {
      window.electronAPI.offCronStarted?.(startedHandler);
      window.electronAPI.offCronExecuted?.(executedHandler);
    };
  }, [loadJobs]);

  const handleSaveJob = async () => {
    if (!editingJob?.name?.trim() || !editingJob?.prompt?.trim() || !editingJob?.schedule?.trim()) {
      message.warning('请填写任务名称、提示词和调度时间');
      return;
    }
    try {
      if (editingJob.id) {
        await window.electronAPI.updateCronJob(editingJob.id, editingJob);
        message.success('任务已更新');
      } else {
        await window.electronAPI.createCronJob({
          name: editingJob.name!,
          prompt: editingJob.prompt!,
          schedule: editingJob.schedule!,
          enabled: editingJob.enabled ?? true,
        });
        message.success('任务已创建');
      }
      setShowEditor(false);
      setEditingJob(null);
      loadJobs();
    } catch (err: any) {
      message.error(`保存失败: ${err.message}`);
    }
  };

  const handleDeleteJob = async (id: string) => {
    await window.electronAPI.deleteCronJob(id);
    message.success('任务已删除');
    loadJobs();
  };

  const handleToggle = async (job: CronJob) => {
    await window.electronAPI.updateCronJob(job.id, { ...job, enabled: !job.enabled });
    loadJobs();
  };

  const handleRunNow = async (job: CronJob) => {
    if (runningIds.has(job.id)) {
      message.warning('任务正在执行中');
      return;
    }
    try {
      await window.electronAPI.runCronJob(job.id);
      message.success('已触发执行');
    } catch (err: any) {
      message.error(err.message || '执行失败');
    }
  };

  const handleEditJob = (job: CronJob) => {
    setEditingJob({ ...job });
    setShowEditor(true);
  };

  const handleNewJob = () => {
    setEditingJob({
      name: '',
      prompt: '',
      schedule: '0 9 * * *',
      enabled: true,
    });
    setShowEditor(true);
  };

  const handleShowHistory = async (job: CronJob) => {
    setHistoryJob(job);
    setShowHistory(true);
    // 加载历史记录
    try {
      const h = await window.electronAPI.getCronHistory(job.id);
      setHistory(h || []);
    } catch {
      setHistory([]);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return '#52c41a';
      case 'error': return '#ff4d4f';
      default: return 'var(--text-placeholder)';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ fontSize: 18, color: 'var(--accent)' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>定时任务</span>
            <Tag color="default">{jobs.length}</Tag>
            {runningIds.size > 0 && <Tag color="processing"><LoadingOutlined /> {runningIds.size} 执行中</Tag>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadJobs}>刷新</Button>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleNewJob}>新建任务</Button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          后台定时执行 AI 任务 · 错过自动补偿 · 30 秒精度
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <ReloadOutlined spin style={{ fontSize: 24, color: 'var(--accent)' }} />
          </div>
        ) : jobs.length === 0 ? (
          <Empty description="暂无定时任务" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewJob}>创建第一个任务</Button>
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jobs.map((job) => {
              const isRunning = runningIds.has(job.id);
              return (
                <div key={job.id} style={{
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 12,
                  border: `1px solid ${isRunning ? 'var(--accent)' : 'var(--border-light)'}`,
                  transition: 'all 0.2s',
                  opacity: job.enabled ? 1 : 0.6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {isRunning ? (
                          <LoadingOutlined style={{ color: 'var(--accent)' }} />
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{job.name}</span>
                        )}
                        <Badge color={job.enabled ? '#52c41a' : '#d9d9d9'} text={job.enabled ? '运行中' : '已暂停'} style={{ fontSize: 10 }} />
                        {job.lastStatus && (
                          <span style={{ fontSize: 10, color: getStatusColor(job.lastStatus) }}>
                            {job.lastStatus === 'success' ? <><CheckCircleOutlined /> 上次成功</> : <><CloseCircleOutlined /> 上次失败</>}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.prompt.slice(0, 100)}{job.prompt.length > 100 ? '...' : ''}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-placeholder)' }}>
                        <span><ClockCircleOutlined /> {job.schedule}</span>
                        {job.lastRun && <span>上次: {formatTime(job.lastRun)}</span>}
                        <span>执行 {job.runCount} 次</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                      <Tooltip title="立即执行">
                        <Button size="small" type="text" icon={<ThunderboltOutlined />} style={{ color: 'var(--accent)' }} loading={isRunning} onClick={() => handleRunNow(job)} />
                      </Tooltip>
                      <Tooltip title={job.enabled ? '暂停' : '启用'}>
                        <Button size="small" type="text" icon={job.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />} style={{ color: job.enabled ? '#faad14' : '#52c41a' }} onClick={() => handleToggle(job)} />
                      </Tooltip>
                      <Tooltip title="编辑">
                        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleEditJob(job)} />
                      </Tooltip>
                      <Tooltip title="执行记录">
                        <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => handleShowHistory(job)} />
                      </Tooltip>
                      <Popconfirm title="确定删除此任务？" onConfirm={() => handleDeleteJob(job.id)} okText="删除">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <Modal
        title={editingJob?.id ? '编辑定时任务' : '新建定时任务'}
        open={showEditor}
        onCancel={() => { setShowEditor(false); setEditingJob(null); }}
        onOk={handleSaveJob}
        okText="保存"
        width={520}
      >
        {editingJob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>任务名称</label>
              <Input value={editingJob.name} onChange={e => setEditingJob({ ...editingJob, name: e.target.value })} placeholder="如：每日新闻摘要" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>提示词</label>
              <Input.TextArea value={editingJob.prompt} onChange={e => setEditingJob({ ...editingJob, prompt: e.target.value })}
                rows={4} placeholder="输入 AI 每次执行时的提示词..."
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cron 表达式</label>
              <Input value={editingJob.schedule} onChange={e => setEditingJob({ ...editingJob, schedule: e.target.value })} placeholder="如：0 9 * * *" />
              <div style={{ fontSize: 11, color: 'var(--text-placeholder)', lineHeight: 1.6 }}>
                <div>*/30 * * * * — 每 30 分钟</div>
                <div>0 9 * * * — 每日 9:00</div>
                <div>0 9 * * 1 — 每周一 9:00</div>
                <div>0 9 1 * * — 每月 1 号 9:00</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>启用</label>
              <Switch checked={editingJob.enabled} onChange={v => setEditingJob({ ...editingJob, enabled: v })} />
            </div>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal
        title={`执行记录 — ${historyJob?.name || ''}`}
        open={showHistory}
        onCancel={() => { setShowHistory(false); setHistoryJob(null); }}
        footer={null}
        width={640}
      >
        {history.length === 0 ? (
          <div style={{ color: 'var(--text-placeholder)', fontSize: 12, textAlign: 'center', padding: 24 }}>
            暂无执行记录
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {history.map((rec, idx) => (
              <div key={idx} style={{
                padding: '10px 14px',
                background: 'var(--bg-primary)',
                borderRadius: 8,
                border: '1px solid var(--border-light)',
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {rec.status === 'running' && <LoadingOutlined style={{ color: 'var(--accent)' }} />}
                  {rec.status === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  {rec.status === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  {rec.status === 'skipped' && <ClockCircleOutlined style={{ color: '#faad14' }} />}
                  <span style={{ fontWeight: 500 }}>{formatTime(rec.startedAt)}</span>
                  {rec.completedAt && (
                    <span style={{ color: 'var(--text-tertiary)' }}>
                      耗时 {((rec.completedAt - rec.startedAt) / 1000).toFixed(1)}s
                    </span>
                  )}
                  <Tag color={rec.status === 'success' ? 'green' : rec.status === 'error' ? 'red' : 'default'} style={{ fontSize: 10, marginLeft: 'auto' }}>
                    {rec.status === 'running' ? '执行中' : rec.status === 'success' ? '成功' : rec.status === 'error' ? '失败' : '跳过'}
                  </Tag>
                </div>
                {rec.error && <div style={{ color: '#ff4d4f', fontSize: 11 }}>❌ {rec.error}</div>}
                {rec.output && <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 4 }}>📝 {rec.output}</div>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
