// ============================================================
// Agent 核心 — 事件驱动架构（Event-Driven TurnEngine）
// ============================================================
import { ConfigManager } from '../gateway/config';
import { ToolRegistry } from '../tools/registry';
import { ToolCall, ToolDef, WdClawEvent, ExecutionStep, PermissionRequest, PermissionOutcome, ToolPermissionConfig } from '../../shared/types';
import { ModelConfig } from '../../shared/types';
import { detectToolCallLoop, recordToolCall, recordToolCallResult, ToolCallRecord, LoopDetectionConfig } from './tool-loop-detection';

// 低风险工具 → 并发执行
const LOW_RISK_TOOLS = new Set(['read', 'list_dir', 'web_search', 'web_fetch', 'image_reader']);
// 高风险工具 → 串行 + 需审批
const HIGH_RISK_TOOLS = new Set(['write', 'exec']);

export class Agent {
  private configManager: ConfigManager;
  private toolRegistry: ToolRegistry;
  private abortController: AbortController | null = null;
  public isAborted = false;
  private permissionConfig: ToolPermissionConfig = {};
  private pendingApprovals: Map<string, { resolve: (outcome: PermissionOutcome) => void }> = new Map();
  // 工具调用历史（用于循环检测）
  private toolCallHistory: ToolCallRecord[] = [];
  private loopDetectionConfig: LoopDetectionConfig | undefined;

  constructor(configManager: ConfigManager, toolRegistry: ToolRegistry) {
    this.configManager = configManager;
    this.toolRegistry = toolRegistry;
    this.loadPermissionConfig();
  }

  private loadPermissionConfig(): void {
    const config = this.configManager.get();
    this.permissionConfig = (config as any).toolPermissions || {
      read: 'auto',
      list_dir: 'auto',
      web_search: 'auto',
      web_fetch: 'auto',
      image_reader: 'auto',
      write: 'ask',
      exec: 'ask',
    };
  }

  stop(): void {
    this.isAborted = true;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /** 处理前端审批响应 */
  handleApproval(toolCallId: string, outcome: PermissionOutcome): void {
    const pending = this.pendingApprovals.get(toolCallId);
    if (pending) {
      pending.resolve(outcome);
      this.pendingApprovals.delete(toolCallId);
    }
  }

  // ============================================================
  // 核心循环 — 事件驱动
  // ============================================================
  async *streamChat(
    messages: any[],
    modelConfig: ModelConfig,
    tools: ToolDef[],
    sessionId: string = ''
  ): AsyncGenerator<WdClawEvent> {
    this.abortController = new AbortController();
    this.isAborted = false;

    const userInput = this.extractUserInput(messages);
    yield { type: 'turn_start', input: userInput, sessionId };

    try {
      let currentMessages = [...messages];
      let round = 0;

      // 加载循环检测配置
      try {
        const cfg = this.configManager.get();
        this.loopDetectionConfig = (cfg as any).loopDetection;
      } catch { /* ignore */ }

      // 无限循环 — 靠智能循环检测来终止（不再硬编码轮次上限）
      while (true) {
        round++;

        // 中断检查点
        if (this.isAborted) {
          yield { type: 'interrupted', iterations: round };
          return;
        }

        // ── 步骤1: 思考中 ──
        const thinkingStep = this.createStep('thinking', '思考中...', '正在分析问题');
        yield { type: 'execution_step', step: { ...thinkingStep, status: 'running' } };

        let fullContent = '';
        let toolCalls: { id: string; name: string; args: any }[] = [];

        // ── 步骤2: 调用模型（流式） ──
        const glmIter = this.callGLM(currentMessages, modelConfig, tools, this.abortController.signal);
        while (true) {
          const { value, done } = await glmIter.next();
          if (done) {
            toolCalls = value?.toolCalls || [];
            break;
          }
          if (this.isAborted) break;

          if (value.type === 'token') {
            fullContent += value.content;
            yield { type: 'assistant_delta', text: value.content };
          }
          if (value.type === 'reasoning') {
            yield { type: 'reasoning_delta', text: value.content };
          }
        }

        // 更新思考步骤为完成
        yield { type: 'execution_step', step: { ...thinkingStep, status: 'done', endedAt: Date.now(), duration: Date.now() - (thinkingStep.startedAt || Date.now()) } };

        if (this.isAborted) {
          yield { type: 'interrupted', iterations: round };
          return;
        }

        // ── 步骤3: 工具调用 ──
        if (toolCalls.length > 0) {
          currentMessages.push({
            role: 'assistant',
            content: fullContent || null,
            tool_calls: toolCalls.map((tc: any) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: JSON.stringify(tc.args) },
            })),
          } as any);

          // 分类：低风险并发，高风险串行
          const lowRiskCalls = toolCalls.filter((tc) => LOW_RISK_TOOLS.has(tc.name));
          const highRiskCalls = toolCalls.filter((tc) => !LOW_RISK_TOOLS.has(tc.name));

          // ── 循环检测：逐个检查每个工具调用 ──
          for (const tc of [...lowRiskCalls, ...highRiskCalls]) {
            const loopResult = detectToolCallLoop(
              this.toolCallHistory,
              tc.name,
              tc.args,
              this.loopDetectionConfig
            );
            if (loopResult.stuck && loopResult.level === 'critical') {
              yield { type: 'tool_loop_detected', detector: loopResult.detector!, count: loopResult.count!, message: loopResult.message! };
              yield { type: 'turn_end', status: 'tool_loop_terminated', iterations: round };
              return;
            }
            if (loopResult.stuck && loopResult.level === 'warning') {
              yield { type: 'tool_loop_warning', detector: loopResult.detector!, count: loopResult.count!, message: loopResult.message! };
            }
            // 记录工具调用（执行前）
            this.toolCallHistory = recordToolCall(this.toolCallHistory, tc.name, tc.args, tc.id);
          }

          // 低风险并发执行
          if (lowRiskCalls.length > 0) {
            const lowRiskResults = await Promise.all(
              lowRiskCalls.map((tc) => this.executeToolWithEvents(tc, currentMessages))
            );
            for (const eventArr of lowRiskResults) {
              for (const event of eventArr) {
                yield event;
              }
            }
          }

          // 高风险串行执行
          for (const tc of highRiskCalls) {
            if (this.isAborted) {
              yield { type: 'interrupted', iterations: round };
              return;
            }
            const events = await this.executeToolWithEvents(tc, currentMessages);
            for (const event of events) {
              yield event;
            }
          }

          continue;
        }

        // ── 步骤4: 纯文本响应 ──
        if (fullContent) {
          yield { type: 'turn_end', status: 'completed', iterations: round };
          return;
        }

        yield { type: 'turn_end', status: 'completed', iterations: round };
        return;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        yield { type: 'interrupted', iterations: 0 };
      } else {
        yield { type: 'error', error: err.message, errorType: err.constructor.name };
        yield { type: 'turn_end', status: 'error', iterations: 0 };
      }
    }
  }

  // ============================================================
  // 工具执行（带权限检查 + 事件发射）
  // ============================================================
  private async executeToolWithEvents(
    tc: { id: string; name: string; args: any },
    currentMessages: any[]
  ): Promise<WdClawEvent[]> {
    const events: WdClawEvent[] = [];
    const toolCall: ToolCall = {
      id: tc.id,
      name: tc.name,
      args: tc.args || {},
      status: 'running',
    };

    // 权限检查
    const permLevel = this.permissionConfig[tc.name] || 'ask';
    if (permLevel === 'deny') {
      toolCall.result = `工具 "${tc.name}" 已被禁止执行`;
      toolCall.status = 'error';
      events.push({ type: 'tool_finished', toolCallId: tc.id, result: toolCall.result });
      return events;
    }

    if (permLevel === 'ask' || HIGH_RISK_TOOLS.has(tc.name)) {
      const request: PermissionRequest = {
        toolName: tc.name,
        args: tc.args || {},
        reason: `执行工具 "${tc.name}" 需要您的批准`,
        toolCallId: tc.id,
      };
      events.push({ type: 'permission_required', request });

      // 等待用户审批
      const outcome = await this.waitForApproval(tc.id);
      events.push({ type: 'permission_resolved', toolName: tc.name, outcome });

      if (outcome === 'deny') {
        toolCall.result = `用户拒绝了工具 "${tc.name}" 的执行`;
        toolCall.status = 'error';
        events.push({ type: 'tool_finished', toolCallId: tc.id, result: toolCall.result });
        return events;
      }
    }

    // 发射 tool_call 事件
    events.push({ type: 'tool_call', toolCall });

    // 创建执行步骤
    const step = this.createStep(
      this.mapToolToStepType(tc.name),
      `执行: ${tc.name}`,
      this.summarizeArgs(tc.args)
    );
    events.push({ type: 'execution_step', step: { ...step, status: 'running' } });

    try {
      const result = await this.toolRegistry.execute(tc.name, tc.args || {});
      toolCall.result = result;
      toolCall.status = 'done';

      events.push({ type: 'execution_step', step: { ...step, status: 'done', endedAt: Date.now(), duration: Date.now() - (step.startedAt || Date.now()) } });

      currentMessages.push({
        role: 'tool',
        content: result,
        tool_call_id: tc.id,
        name: tc.name,
      } as any);

      events.push({ type: 'tool_finished', toolCallId: tc.id, result });

      // 记录工具结果（循环检测用）
      this.toolCallHistory = recordToolCallResult(this.toolCallHistory, tc.name, tc.args, result);
    } catch (err: any) {
      toolCall.result = `Error: ${err.message}`;
      toolCall.status = 'error';

      events.push({ type: 'execution_step', step: { ...step, status: 'error', endedAt: Date.now(), duration: Date.now() - (step.startedAt || Date.now()) } });

      currentMessages.push({
        role: 'tool',
        content: `Error: ${err.message}`,
        tool_call_id: tc.id,
        name: tc.name,
      } as any);

      events.push({ type: 'tool_finished', toolCallId: tc.id, result: toolCall.result });

      // 记录工具错误结果（循环检测用）
      this.toolCallHistory = recordToolCallResult(this.toolCallHistory, tc.name, tc.args, undefined, err.message);
    }

    return events;
  }

  private waitForApproval(toolCallId: string): Promise<PermissionOutcome> {
    return new Promise<PermissionOutcome>((resolve) => {
      this.pendingApprovals.set(toolCallId, { resolve });
    });
  }

  // ============================================================
  // 模型调用（SSE 流式）
  // ============================================================
  private async *callGLM(
    messages: any[],
    modelConfig: ModelConfig,
    tools: ToolDef[],
    signal: AbortSignal
  ): AsyncGenerator<{ type: 'token' | 'reasoning'; content: string }, { toolCalls?: { id: string; name: string; args: any }[] }> {
    const apiKey = modelConfig.apiKey;
    const baseUrl = modelConfig.baseUrl;
    const model = modelConfig.defaultModel;

    const body: any = {
      model,
      messages: this.cleanMessages(messages),
      max_tokens: modelConfig.maxTokens || 4096,
      temperature: modelConfig.temperature || 0.7,
      stream: true,
    };

    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API 错误 (${response.status}) @ [${modelConfig.defaultModel}] ${baseUrl}: ${text}`);
    }

    if (!response.body) {
      throw new Error('API 无响应');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let fullReasoning = '';
    const toolCallChunks: Map<number, { id: string; name: string; args: string }> = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            fullContent += delta.content;
            yield { type: 'token', content: delta.content };
          }

          if (delta.reasoning_content) {
            fullReasoning += delta.reasoning_content;
            yield { type: 'reasoning', content: delta.reasoning_content };
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallChunks.has(idx)) {
                toolCallChunks.set(idx, { id: '', name: '', args: '' });
              }
              const chunk = toolCallChunks.get(idx)!;
              if (tc.id) chunk.id = tc.id;
              if (tc.function?.name) chunk.name += tc.function.name;
              if (tc.function?.arguments) chunk.args += tc.function.arguments;
            }
          }
        } catch {
          // ignore parse error
        }
      }
    }

    if (toolCallChunks.size > 0) {
      const toolCalls: { id: string; name: string; args: any }[] = [];
      for (const [, chunk] of toolCallChunks) {
        toolCalls.push({
          id: chunk.id,
          name: chunk.name,
          args: JSON.parse(chunk.args || '{}'),
        });
      }
      return { toolCalls };
    }

    return { toolCalls: [] };
  }

  // ============================================================
  // 工具函数
  // ============================================================
  private extractUserInput(messages: any[]): string {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return '';
    if (typeof lastUser.content === 'string') return lastUser.content;
    if (Array.isArray(lastUser.content)) {
      const textPart = lastUser.content.find((p: any) => p.type === 'text');
      return textPart?.text || '';
    }
    return '';
  }

  private createStep(type: ExecutionStep['type'], title: string, description?: string): ExecutionStep {
    return {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      description,
      status: 'pending',
      startedAt: Date.now(),
    };
  }

  private mapToolToStepType(toolName: string): ExecutionStep['type'] {
    switch (toolName) {
      case 'read': return 'file_read';
      case 'write': return 'file_write';
      case 'list_dir': return 'file_read';
      case 'web_search': return 'search';
      case 'web_fetch': return 'search';
      case 'exec': return 'command';
      default: return 'tool_call';
    }
  }

  private summarizeArgs(args: any): string {
    if (!args) return '';
    try {
      if (args.path) return args.path;
      if (args.command) return args.command.slice(0, 80);
      if (args.query) return args.query.slice(0, 80);
      if (args.url) return args.url.slice(0, 80);
      const str = JSON.stringify(args);
      return str.length > 80 ? str.slice(0, 80) + '...' : str;
    } catch {
      return '';
    }
  }

  private cleanMessages(messages: any[]): any[] {
    return messages.map((m) => {
      const cleaned: any = { role: m.role };
      if (m.content !== undefined && m.content !== null) {
        cleaned.content = m.content;
      }
      if (m.tool_calls) {
        cleaned.tool_calls = m.tool_calls;
      }
      if (m.tool_call_id) {
        cleaned.tool_call_id = m.tool_call_id;
      }
      if (m.name) {
        cleaned.name = m.name;
      }
      return cleaned;
    });
  }
}
