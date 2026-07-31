// ============================================================
// IPC 路由处理器
// ============================================================
import { IpcMain, BrowserWindow } from 'electron';
import { ConfigManager } from './gateway/config';
import { SessionManager } from './gateway/session';
import { Agent } from './agent';
import { ToolRegistry } from './tools/registry';
import { CronManager } from './cron/manager';
import { ExpertManager } from './experts/manager';
import { AuditManager, getAuditManager } from './audit/manager';
import { mcpManager } from './mcp/manager';
import { channelManager } from './channels/manager';
import { WorkflowManager } from './workflow/manager';;
import { generateId, now } from '../shared/utils';
import { Message } from '../shared/types';
import * as path from 'path';
import * as fs from 'fs';

export function setupIpcHandlers(
  ipc: IpcMain,
  mainWindow: BrowserWindow,
  config: ConfigManager,
  sessions: SessionManager,
  agent: Agent,
  tools: ToolRegistry,
  cronManager: CronManager,
  expertManager: ExpertManager,
  workflowManager: WorkflowManager,
) {
  const audit = getAuditManager(config.getDataDir());
  // ---- 配置 ----
  ipc.handle('config:get', () => config.get());
  ipc.handle('config:set', (_event, key: string, value: unknown) => {
    config.set(key, value);
    return { ok: true };
  });
  ipc.handle('config:save', async () => {
    await config.save();
    return { ok: true };
  });

  // ---- 会话 ----
  ipc.handle('session:list', () => sessions.list());
  ipc.handle('session:create', (_event, expertId?: string) => {
    const cfg = config.get();
    let model = cfg.models.defaultModel;
    let title = '新对话';
    if (expertId) {
      const expert = expertManager.getExpert(expertId);
      if (expert?.modelId) model = expert.modelId;
      if (expert?.name) title = expert.name;
    }
    const session = sessions.create(model, expertId);
    if (title !== '新对话') {
      session.title = title;
      sessions.save(session);
    }
    return session;
  });
  ipc.handle('session:get', (_event, id: string) => {
    const session = sessions.get(id);
    if (!session) return undefined;
    // 附加专家信息
    if (session.expertId) {
      const expert = expertManager.getExpert(session.expertId);
      if (expert) {
        return { ...session, expertName: expert.name, expertEmoji: expert.emoji, expertAvatar: expert.avatar };
      }
    }
    return session;
  });
  ipc.handle('session:delete', (_event, id: string) => {
    sessions.delete(id);
    return { ok: true };
  });
  ipc.handle('session:rename', (_event, id: string, title: string) => {
    sessions.rename(id, title);
    return { ok: true };
  });
  ipc.handle('session:clear', (_event, id: string) => {
    sessions.clear(id);
    return { ok: true };
  });
  ipc.handle('session:update', (_event, id: string, updates: any) => {
    sessions.update(id, updates);
    return { ok: true };
  });

  // ---- 聊天 ----
  ipc.handle('chat:send', async (event, sessionId: string, userMessage: string, modelId?: string, agentIds?: string[], files?: any[]) => {
    const session = sessions.get(sessionId);
    if (!session) return { ok: false, error: '会话不存在' };

    const toolsConfig = config.get().tools;
    let modelConfig: any = JSON.parse(JSON.stringify(config.get().models));
    const effectiveModelId = modelId || modelConfig.defaultModel;

    // 修复：始终尝试从 session 的 expertId 加载专家的模型配置
    if (session.expertId) {
      const expert = expertManager.getExpert(session.expertId);
      if (expert && expert.modelId) {
        const expertModel = (modelConfig.models || []).find((m: any) => m.id === expert.modelId);
        if (expertModel && expertModel.baseUrl) {
          modelConfig.defaultModel = expertModel.id;
          modelConfig.baseUrl = expertModel.baseUrl;
          if (expertModel.apiKey) modelConfig.apiKey = expertModel.apiKey;
        }
      }
    }

    // 修复：如果 models 数组找不到，不报错 — fallback 到全局 baseURL
    const modelsList = modelConfig.models || [];
    let selectedModel: any = modelsList.find((m: any) => m.id === effectiveModelId);
    if (effectiveModelId && selectedModel) {
      if (!selectedModel.baseUrl) {
        return { ok: false, error: `模型 "${selectedModel.name}" 没有配置 API 地址。\n当前请求URL: ${modelConfig.baseUrl}\n请在 设置 > 模型 中编辑此模型。` };
      }
      modelConfig.defaultModel = selectedModel.id;
      modelConfig.baseUrl = selectedModel.baseUrl;
      if (selectedModel.apiKey) modelConfig.apiKey = selectedModel.apiKey;
    }
    // ⚠️ 关键修复：如果找不到模型但 effectiveModelId 是全局 defaultModel，不报错，直接用全局配置


    const expertId = session.expertId || 'general';
    const systemPrompt = expertManager.getSystemPrompt(expertId);

    // ✅ 先保存用户消息到 session（支持图片）
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: now(),
    };

    // 处理文件上传（图片）
    if (files && files.length > 0) {
      console.log(`[chat:send] 收到 ${files.length} 个文件:`, files.map((f: any) => ({ name: f.name, hasPath: !!f.path, hasData: !!f.data })));
      const isMultimodal = selectedModel?.multimodal === true;
      if (isMultimodal) {
        // 多模态模型：直接嵌入 base64 图片
        const imageContents: any[] = [];
        for (const file of files) {
          try {
            let base64Data: string | null = null;
            let mimeType = 'image/jpeg';

            if (file.path) {
              // 有路径：从文件系统读取
              const fileData = fs.readFileSync(file.path);
              const ext = path.extname(file.path).toLowerCase();
              mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
              base64Data = fileData.toString('base64');
            } else if (file.data) {
              // 无路径：使用 renderer 传来的 base64 数据
              const match = file.data.match(/^data:([\w\/]+);base64,(.+)$/);
              if (match) {
                mimeType = match[1];
                base64Data = match[2];
              } else {
                base64Data = file.data;
              }
            } else {
              console.warn('[chat:send] 文件无路径无数据，跳过:', file.name);
              continue;
            }

            if (base64Data) {
              imageContents.push({
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              });
            }
          } catch (err: any) {
            console.error('[chat:send] 读取文件失败:', file.name, err.message);
          }
        }
        if (imageContents.length > 0) {
          (userMsg as any).content = [
            { type: 'text', text: userMessage },
            ...imageContents,
          ];
        }
      } else {
        // 非多模态模型：调用 image_reader 工具读取图片内容
        const imageDescriptions: string[] = [];
        for (const file of files) {
          try {
            if (file.path) {
              // 有路径：直接调用 image_reader
              const desc = await tools.execute('image_reader', { path: file.path, question: `用户上传了图片"${file.name}"，请详细描述图片内容（包括文字、数据、布局等所有细节），以便回答用户的问题：${userMessage}` });
              imageDescriptions.push(`[图片 ${file.name} 的内容描述]\n${desc}`);
              console.log(`[chat:send] 图片已读取: ${file.name} (${desc.length} 字)`);
            } else if (file.data) {
              // 无路径：使用 renderer 传来的 base64 数据，直接调用视觉模型
              const match = file.data.match(/^data:([\w\/]+);base64,(.+)$/);
              const base64Data = match ? match[2] : file.data;
              const mimeType = match ? match[1] : 'image/jpeg';
              const desc = await tools.execute('image_reader', { base64: base64Data, mimeType, question: `用户上传了图片"${file.name}"，请详细描述图片内容（包括文字、数据、布局等所有细节），以便回答用户的问题：${userMessage}` });
              imageDescriptions.push(`[图片 ${file.name} 的内容描述]\n${desc}`);
              console.log(`[chat:send] 图片已读取(base64): ${file.name} (${desc.length} 字)`);
            } else {
              console.warn('[chat:send] 文件无路径无数据，跳过:', file.name);
            }
          } catch (err: any) {
            console.error('[chat:send] 图片读取失败:', file.name, err.message);
            const friendlyError = err.message?.includes('未找到')
              ? '未找到视觉模型配置，请先在设置中添加 GLM-4V-Flash 模型'
              : err.message?.includes('API Key') || err.message?.includes('apiKey')
              ? '视觉模型 API Key 未配置，请在设置中填写'
              : err.message;
            imageDescriptions.push(`[图片 ${file.name} 读取失败: ${friendlyError}]`);
          }
        }
        if (imageDescriptions.length > 0) {
          userMsg.content = `${userMessage}\n\n${imageDescriptions.join('\n\n')}`;
        }
      }
    }

    session.messages.push(userMsg);
    sessions.save(session);

    const messages: any[] = [];
    messages.push({ role: 'system', content: systemPrompt });
    for (const msg of session.messages) {
      if (msg.role === 'system') continue;
      messages.push({ role: msg.role, content: msg.content });
    }

    try {
      let toolDefs = tools.getDefinitions();

      // Agent 类型系统：根据专家 tools 字段过滤可用工具
      if (session.expertId) {
        const agentTools = expertManager.getAgentTools(session.expertId);
        if (agentTools && agentTools.length > 0) {
          toolDefs = toolDefs.filter(td => agentTools.includes(td.name));
        }
      }

      let fullContent = '';
      let fullReasoning = '';
      const toolCalls: any[] = [];
      let aborted = false;

      // 事件驱动流
      const stream = agent.streamChat(messages, modelConfig, toolDefs, sessionId);
      while (true) {
        const { value: evt, done } = await stream.next();
        if (done) break;
        if (agent.isAborted) break;

        switch (evt.type) {
          case 'assistant_delta':
            fullContent += evt.text;
            try { mainWindow.webContents.send('chat:token', { sessionId, token: evt.text, content: fullContent }); } catch {}
            break;
          case 'reasoning_delta':
            fullReasoning += evt.text;
            try { mainWindow.webContents.send('chat:reasoning', { sessionId, content: fullReasoning }); } catch {}
            break;
          case 'tool_call':
            toolCalls.push(evt.toolCall);
            try { mainWindow.webContents.send('chat:tool_call', { sessionId, toolCall: evt.toolCall }); } catch {}
            // 审计：工具调用开始
            audit.log({
              session_id: sessionId,
              agent: 'default',
              tool: evt.toolCall.name,
              stage: 'start',
              status: 'success',
              args: evt.toolCall.args,
            });
            break;
          case 'tool_finished':
            try { mainWindow.webContents.send('chat:tool_result', { sessionId, toolCall: toolCalls.find((tc) => tc.id === evt.toolCallId) }); } catch {}
            // 审计：工具执行完成
            {
              const tc = toolCalls.find((t) => t.id === evt.toolCallId);
              audit.log({
                session_id: sessionId,
                agent: 'default',
                tool: tc?.name || 'unknown',
                stage: 'executed',
                status: tc?.status === 'error' ? 'failure' : 'success',
                result_preview: String(tc?.result || '').slice(0, 500),
              });
            }
            break;
          case 'permission_required':
            try { mainWindow.webContents.send('chat:permission_required', { sessionId, request: evt.request }); } catch {}
            // 审计：需要审批
            audit.log({
              session_id: sessionId,
              agent: 'default',
              tool: evt.request.toolName,
              stage: 'approval_required',
              status: 'pending',
              args: evt.request.args,
            });
            break;
          case 'permission_resolved':
            try { mainWindow.webContents.send('chat:permission_resolved', { sessionId, toolName: evt.toolName, outcome: evt.outcome }); } catch {}
            // 审计：审批结果
            audit.log({
              session_id: sessionId,
              agent: 'default',
              tool: evt.toolName,
              stage: evt.outcome === 'deny' ? 'denied' : 'approved',
              status: evt.outcome === 'deny' ? 'denied' : 'success',
              approval: evt.outcome as any,
            });
            break;
          case 'execution_step':
            try { mainWindow.webContents.send('chat:execution_step', { sessionId, step: evt.step }); } catch {}
            break;
          case 'turn_start':
            try { mainWindow.webContents.send('chat:turn_start', { sessionId }); } catch {}
            break;
          case 'tool_loop_warning':
            try { mainWindow.webContents.send('chat:tool_loop_warning', { sessionId, detector: evt.detector, count: evt.count, message: evt.message }); } catch {}
            break;
          case 'tool_loop_detected':
            try { mainWindow.webContents.send('chat:tool_loop_detected', { sessionId, detector: evt.detector, count: evt.count, message: evt.message }); } catch {}
            break;
          case 'turn_end':
            try { mainWindow.webContents.send('chat:turn_end', { sessionId, status: evt.status, iterations: evt.iterations }); } catch {}
            break;
          case 'interrupted':
            aborted = true;
            break;
          case 'error':
            throw new Error(evt.error);
          case 'max_iterations_warning':
            fullContent += '\n\n⚠️ 已达到最大工具调用轮次限制。';
            break;
        }
      }

      // 检查是否被 abort（通过 stop() 调用导致流提前结束）
      aborted = agent.isAborted;

      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: fullContent,
        timestamp: now(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        thinking: fullReasoning || undefined,
      };
      session.messages.push(assistantMsg);
      sessions.save(session);

      mainWindow.webContents.send('chat:done', { sessionId, message: assistantMsg, aborted });
      return { ok: true, message: assistantMsg };
    } catch (error: any) {
      const errMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: `❌ 错误: ${error.message}`,
        timestamp: now(),
      };
      session.messages.push(errMsg);
      mainWindow.webContents.send('chat:error', { sessionId, error: error.message });
      return { ok: false, error: error.message, message: errMsg };
    }
  });

  ipc.handle('chat:stop', async () => {
    agent.stop();
    return { ok: true };
  });

  // 权限审批响应
  ipc.handle('tool:approval_response', async (_event, toolCallId: string, outcome: 'once' | 'always' | 'deny') => {
    agent.handleApproval(toolCallId, outcome);
    return { ok: true };
  });

  // ---- 专家 ----
  ipc.handle('expert:list', () => expertManager.listExperts());
  ipc.handle('expert:get', (_event, id: string) => expertManager.getExpert(id));
  ipc.handle('expert:create', (_event, data) => expertManager.createExpert(data));
  ipc.handle('expert:update', (_event, id: string, data) => expertManager.updateExpert(id, data));
  ipc.handle('expert:delete', (_event, id: string) => {
    const ok = expertManager.deleteExpert(id);
    return { ok };
  });
  ipc.handle('expert:uploadAvatar', async (_event, id: string, sourcePath: string) => {
    try {
      const expert = expertManager.getExpert(id);
      if (!expert) return { ok: false, error: '专家不存在' };
      const avatarDir = path.join(config.getDataDir(), 'avatars');
      if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
      const ext = path.extname(sourcePath) || '.png';
      const targetPath = path.join(avatarDir, `${id}${ext}`);
      fs.copyFileSync(sourcePath, targetPath);
      const relPath = `avatars/${id}${ext}`;
      expertManager.updateExpert(id, { avatar: relPath });
      return { ok: true, avatar: relPath };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });
  ipc.handle('expert:uploadAvatarFromData', async (_event, id: string, dataUrl: string) => {
    try {
      const expert = expertManager.getExpert(id);
      if (!expert) return { ok: false, error: '专家不存在' };
      const avatarDir = path.join(config.getDataDir(), 'avatars');
      if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
      // 关键修复：提取允许的格式（png/jpeg/jpg/webp）
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
      if (!match) {
        return { ok: false, error: '头像格式仅支持 PNG/JPEG/WebP' };
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const targetPath = path.join(avatarDir, `${id}.${ext}`);
      fs.writeFileSync(targetPath, Buffer.from(base64, 'base64'));
      const relPath = `avatars/${id}.${ext}`;
      expertManager.updateExpert(id, { avatar: relPath });
      return { ok: true, avatar: relPath };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });
  ipc.handle('expert:cropAndUploadAvatar', async (_event, id: string, dataUrl: string) => {
    try {
      const expert = expertManager.getExpert(id);
      if (!expert) return { ok: false, error: '专家不存在' };
      const avatarDir = path.join(config.getDataDir(), 'avatars');
      if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
      // 关键修复：提取允许的格式（png/jpeg/jpg/webp）
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
      if (!match) {
        return { ok: false, error: '头像格式仅支持 PNG/JPEG/WebP' };
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const targetPath = path.join(avatarDir, `${id}.${ext}`);
      fs.writeFileSync(targetPath, Buffer.from(base64, 'base64'));
      const relPath = `avatars/${id}.${ext}`;
      expertManager.updateExpert(id, { avatar: relPath });
      return { ok: true, avatar: relPath };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ---- 工具 ----
  ipc.handle('tools:list', () => tools.getDefinitions());
  ipc.handle('tool:execute', async (_event, name: string, args: Record<string, unknown>) => {
    const result = await tools.execute(name, args);
    return { ok: true, result };
  });

  // ---- 远程专家 ----
  ipc.handle('expert:fetchRemote', async () => expertManager.fetchRemoteExperts());
  ipc.handle('expert:installRemote', async (_event, remote: any) => {
    const expert = expertManager.installRemoteExpert(remote);
    return { ok: true, expert };
  });
  ipc.handle('expert:uninstallRemote', async (_event, id: string) => {
    const ok = expertManager.uninstallRemoteExpert(id);
    return { ok };
  });
  ipc.handle('expert:searchRemote', async (_event, query: string) => expertManager.searchRemoteExperts(query));
  ipc.handle('expert:isInstalled', (_event: any, id: string) => expertManager.isRemoteExpertInstalled(id));
  ipc.handle('expert:getInstalled', () => expertManager.getInstalledRemoteExperts());
  ipc.handle('expert:addSkill', async (_event, expertId: string, skillId: string) => {
    try {
      const ok = expertManager.addSkillToExpert(expertId, skillId);
      return { ok };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });
  ipc.handle('expert:removeSkill', async (_event, expertId: string, skillId: string) => {
    try {
      const ok = expertManager.removeSkillFromExpert(expertId, skillId);
      return { ok };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ---- 技能 ----
  ipc.handle('skills:list', async () => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.listSkills();
  });
  ipc.handle('skills:install', async (_event, skillPath: string) => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.installSkill(skillPath);
  });
  ipc.handle('skills:uninstall', async (_event, id: string) => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.uninstallSkill(id);
  });
  ipc.handle('skills:read', async (_event, id: string) => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.readSkillContent(id);
  });

  // ---- 远程技能 ----
  ipc.handle('skills:fetchRemote', async () => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.fetchRemoteSkills();
  });
  ipc.handle('skills:searchRemote', async (_event, query: string) => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.searchRemoteSkills(query);
  });
  ipc.handle('skills:installRemote', async (_event, remote: any) => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.installRemoteSkill(remote);
  });
  ipc.handle('skills:uninstallRemote', async (_event, id: string) => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.uninstallRemoteSkill(id);
  });
  ipc.handle('skills:isInstalled', async (_event: any, id: string) => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.isRemoteSkillInstalled(id);
  });
  ipc.handle('skills:getInstalled', async () => {
    const { SkillManager } = await import('./skills/manager.js');
    const sm = new SkillManager(config);
    return sm.getInstalledRemoteSkills();
  });

  // ---- ClawHub（真实技能市场） ----
  ipc.handle('clawhub:search', async (_event, query: string, limit?: number) => {
    const { searchSkills } = await import('./api/clawhub.js');
    return searchSkills(query, limit);
  });
  ipc.handle('clawhub:explore', async (_event, limit?: number) => {
    const { exploreSkills } = await import('./api/clawhub.js');
    return exploreSkills(limit);
  });
  ipc.handle('clawhub:install', async (_event, skillId: string) => {
    const { installSkill } = await import('./api/clawhub.js');
    return installSkill(skillId);
  });
  ipc.handle('clawhub:uninstall', async (_event, skillId: string) => {
    const { uninstallSkill } = await import('./api/clawhub.js');
    return uninstallSkill(skillId);
  });
  ipc.handle('clawhub:listInstalled', async () => {
    const { listInstalledSkills } = await import('./api/clawhub.js');
    return listInstalledSkills();
  });
  ipc.handle('clawhub:isLoggedIn', async () => {
    const { isClawHubLoggedIn } = await import('./api/clawhub.js');
    return isClawHubLoggedIn();
  });
  ipc.handle('clawhub:getLoginUrl', () => {
    const { getClawHubLoginUrl } = require('./api/clawhub.js');
    return getClawHubLoginUrl();
  });

  // ---- 记忆 ----
  ipc.handle('memory:load', async () => {
    const { MemoryManager } = await import('./memory/manager.js');
    const mm = new MemoryManager(config);
    return mm.load();
  });
  ipc.handle('memory:append', async (_event, content: string) => {
    const { MemoryManager } = await import('./memory/manager.js');
    const mm = new MemoryManager(config);
    await mm.appendDaily(content);
    return { ok: true };
  });
  ipc.handle('memory:updateLongTerm', async (_event, content: string) => {
    const { MemoryManager } = await import('./memory/manager.js');
    const mm = new MemoryManager(config);
    await mm.updateLongTerm(content);
    return { ok: true };
  });
  ipc.handle('memory:search', async (_event, query: string) => {
    const { MemoryManager } = await import('./memory/manager.js');
    const mm = new MemoryManager(config);
    return mm.search(query);
  });

  // ---- 系统 ----
  ipc.handle('system:info', () => ({
    version: '0.1.0',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
  }));

  // ---- 定时任务 ----
  ipc.handle('cron:list', () => cronManager.list());
  ipc.handle('cron:create', (_event, data) => cronManager.create(data));
  ipc.handle('cron:update', (_event, id, updates) => cronManager.update(id, updates));
  ipc.handle('cron:delete', (_event, id) => {
    cronManager.delete(id);
    return { ok: true };
  });

  // ---- 审计日志 ----
  ipc.handle('audit:query', (_event, options) => audit.query(options));
  ipc.handle('audit:stats', () => audit.stats());
  ipc.handle('audit:get', (_event, id) => audit.getEvent(id));
  ipc.handle('audit:clear', () => { audit.clear(); return { ok: true }; });
  ipc.handle('audit:export', () => audit.export());

  // ---- Agent 类型系统 ----
  ipc.handle('agent:getTools', (_event, expertId) => expertManager.getAgentTools(expertId));
  ipc.handle('agent:getFamilyInfo', (_event, family) => expertManager.getFamilyInfo(family));
  ipc.handle('agent:getBuiltin', () => expertManager.getBuiltinAgents());

  // === MCP ===
  ipc.handle('mcp:list', () => mcpManager.getStatuses());
  ipc.handle('mcp:configs', () => mcpManager.getConfigs());
  ipc.handle('mcp:saveConfigs', (_event, configs) => {
    mcpManager.setConfigs(configs);
    config.set('mcpServers', configs);
    config.save();
    return { ok: true };
  });
  ipc.handle('mcp:connect', async (_event, name) => {
    const ok = await mcpManager.reconnectServer(name);
    if (ok) {
      const client = mcpManager.getServer(name);
      if (client) {
        tools.clearMCPTools(name);
        tools.registerMCPTools(name, client.getTools());
      }
    }
    return { ok };
  });
  ipc.handle('mcp:disconnect', async (_event, name) => {
    await mcpManager.disconnectServer(name);
    tools.clearMCPTools(name);
    return { ok: true };
  });
  ipc.handle('mcp:connectAll', async () => {
    await mcpManager.connectAll();
    tools.clearMCPTools();
    for (const [name, client] of mcpManager.getServers()) {
      if (client.isConnected) {
        tools.registerMCPTools(name, client.getTools());
      }
    }
    return { ok: true };
  });
  ipc.handle('mcp:getTools', () => mcpManager.getAllTools());

  // === Cron ===
  ipc.handle('cron:runNow', async (_event, jobId) => {
    await cronManager.runNow(jobId);
    return { ok: true };
  });
  ipc.handle('cron:getHistory', (_event, jobId?) => {
    return cronManager.getHistory(jobId);
  });
  ipc.handle('cron:clearHistory', (_event, jobId?) => {
    cronManager.clearHistory(jobId);
    return { ok: true };
  });

  // === Workflows ===
  ipc.handle('workflow:list', () => workflowManager.list());
  ipc.handle('workflow:get', (_event, id) => workflowManager.get(id));
  ipc.handle('workflow:create', (_event, data) => workflowManager.create(data));
  ipc.handle('workflow:update', (_event, id, updates) => workflowManager.update(id, updates));
  ipc.handle('workflow:delete', (_event, id) => workflowManager.delete(id));
  ipc.handle('workflow:run', async (_event, id) => {
    const execId = await workflowManager.execute(id);
    return { ok: true, executionId: execId };
  });
  ipc.handle('workflow:fromConversation', (_event, name, desc, messages) =>
    workflowManager.fromConversation(name, desc, messages)
  );
  ipc.handle('workflow:executions', () => workflowManager.listExecutions());
  ipc.handle('workflow:isRunning', (_event, id) => workflowManager.isRunning(id));

  // === Channels ===
  ipc.handle('channel:statuses', () => channelManager.getStatuses());
  ipc.handle('channel:connect', async (_event, platform) => {
    const adapter = channelManager.get(platform);
    if (adapter) await adapter.connect();
    return { ok: true };
  });
  ipc.handle('channel:disconnect', async (_event, platform) => {
    const adapter = channelManager.get(platform);
    if (adapter) await adapter.disconnect();
    return { ok: true };
  });
  ipc.handle('channel:send', async (_event, platform, message) => {
    const id = await channelManager.send(platform, message);
    return { ok: !!id, messageId: id };
  });
}

function buildSystemPrompt(toolsConfig: any): string {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  return `你是吴东的Claw智能助手，一个 Windows 桌面 AI 助手。
当前日期: ${today}
当前时间: ${new Date().toLocaleTimeString('zh-CN')}

你的能力:
${toolsConfig.exec?.enabled ? '- 执行 Shell 命令' : ''}
${toolsConfig.webSearch?.enabled ? '- 网页搜索' : ''}
${toolsConfig.webFetch?.enabled ? '- 网页内容抓取' : ''}
${toolsConfig.filesystem?.enabled ? '- 文件系统操作' : ''}

行为准则:
- 用中文回复
- 回答简洁实用，不啰嗦
- 执行操作前考虑安全性
- 复杂任务拆解为多个步骤
- 文件操作限于工作区目录`;
}
