// ============================================================
// WorkflowManager — 工作流模板管理 + 执行引擎
// ============================================================
import { EventEmitter } from 'events';
import {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowExecution,
  StepResult,
  WorkflowStatus,
} from './types';
import { ConfigManager } from '../gateway/config';
import { Agent } from '../agent';
import { ToolRegistry } from '../tools/registry';
import { BrowserWindow } from 'electron';
import { generateId } from '../../shared/utils';

const MAX_EXECUTIONS = 20;

export class WorkflowManager extends EventEmitter {
  private config: ConfigManager;
  private agent: Agent;
  private tools: ToolRegistry;
  private mainWindow: BrowserWindow | null = null;
  private templates = new Map<string, WorkflowTemplate>();
  private executions = new Map<string, WorkflowExecution>();
  private running = new Set<string>();

  constructor(config: ConfigManager, agent: Agent, tools: ToolRegistry) {
    super();
    this.config = config;
    this.agent = agent;
    this.tools = tools;
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  // ---- 生命周期 ----

  async load(): Promise<void> {
    const stored = this.config.get().workflows?.templates || [];
    for (const t of stored) {
      this.templates.set(t.id, t);
    }
    console.log(`[Workflow] 已加载 ${this.templates.size} 个模板`);
  }

  private async save(): Promise<void> {
    const templates = Array.from(this.templates.values());
    this.config.set('workflows.templates', templates);
    await this.config.save();
  }

  // ---- CRUD ----

  list(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  get(id: string): WorkflowTemplate | undefined {
    return this.templates.get(id);
  }

  async create(data: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'version'>): Promise<WorkflowTemplate> {
    const template: WorkflowTemplate = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      runCount: 0,
      version: 1,
    };
    this.templates.set(template.id, template);
    await this.save();
    return template;
  }

  async update(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | null> {
    const t = this.templates.get(id);
    if (!t) return null;
    const updated = { ...t, ...updates, updatedAt: Date.now(), version: t.version + 1 };
    this.templates.set(id, updated);
    await this.save();
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.templates.delete(id);
    await this.save();
  }

  /** 从对话历史创建模板 */
  async fromConversation(name: string, description: string, messages: any[]): Promise<WorkflowTemplate> {
    const steps: WorkflowStep[] = [];
    let prevStepId: string | undefined;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user' && typeof msg.content === 'string') {
        const stepId = generateId();
        const step: WorkflowStep = {
          id: stepId,
          type: 'prompt',
          label: msg.content.slice(0, 50),
          prompt: msg.content,
          next: undefined,
        };
        if (prevStepId) {
          const prevStep = steps.find(s => s.id === prevStepId);
          if (prevStep) prevStep.next = stepId;
        }
        steps.push(step);
        prevStepId = stepId;
      }
    }

    return this.create({
      name,
      description,
      category: '对话导入',
      tags: ['from-conversation'],
      steps,
      source: 'conversation',
    });
  }

  // ---- 执行引擎 ----

  async execute(templateId: string, variables?: Record<string, string>): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('模板不存在');
    if (this.running.has(templateId)) throw new Error('模板正在执行中');

    const executionId = generateId();
    const execution: WorkflowExecution = {
      id: executionId,
      templateId,
      templateName: template.name,
      status: 'running',
      stepResults: new Map(),
      variables: variables || {},
      startedAt: Date.now(),
    };

    // 初始化所有步骤为 pending
    for (const step of template.steps) {
      execution.stepResults.set(step.id, { stepId: step.id, status: 'pending', attempts: 0 });
    }

    this.executions.set(executionId, execution);
    this.running.add(templateId);

    // 更新运行次数
    await this.update(templateId, { runCount: (template.runCount || 0) + 1 });

    // 异步执行
    this.runWorkflow(execution, template).catch(console.error);

    return executionId;
  }

  private async runWorkflow(execution: WorkflowExecution, template: WorkflowTemplate): Promise<void> {
    this.emit('started', { executionId: execution.id, templateName: template.name });
    this.mainWindow?.webContents.send('workflow:started', {
      executionId: execution.id,
      templateName: template.name,
    });

    try {
      // 找到第一个步骤（没有被指向前驱的）
      const allNextIds = new Set(template.steps.map(s => s.next).filter(Boolean));
      const firstStep = template.steps.find(s => !allNextIds.has(s.id)) || template.steps[0];

      if (firstStep) {
        await this.runStep(firstStep, execution, template);
      }

      execution.status = 'completed';
      execution.completedAt = Date.now();
      this.emit('completed', { executionId: execution.id });
      this.mainWindow?.webContents.send('workflow:completed', {
        executionId: execution.id,
        templateName: template.name,
        duration: execution.completedAt - execution.startedAt,
      });
    } catch (err: any) {
      execution.status = 'error';
      execution.completedAt = Date.now();
      this.emit('error', { executionId: execution.id, error: err.message });
      this.mainWindow?.webContents.send('workflow:error', {
        executionId: execution.id,
        error: err.message,
      });
    } finally {
      this.running.delete(template.templateId);
    }
  }

  private async runStep(step: WorkflowStep, execution: WorkflowExecution, template: WorkflowTemplate): Promise<string> {
    const result = execution.stepResults.get(step.id)!;
    result.status = 'running';
    result.startedAt = Date.now();
    execution.currentStepId = step.id;

    this.emit('step:started', { executionId: execution.id, stepId: step.id, label: step.label });
    this.mainWindow?.webContents.send('workflow:step', {
      executionId: execution.id,
      stepId: step.id,
      label: step.label,
      status: 'running',
    });

    let output = '';
    const maxRetries = step.retries || 0;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        attempts++;
        result.attempts = attempts;

        switch (step.type) {
          case 'prompt':
            output = await this.executePrompt(step, execution);
            break;
          case 'tool':
            output = await this.executeToolStep(step, execution);
            break;
          case 'condition':
            output = await this.executeCondition(step, execution, template);
            break;
          case 'parallel':
            output = await this.executeParallel(step, execution, template);
            break;
        }

        result.status = 'success';
        result.output = output;
        result.completedAt = Date.now();

        this.emit('step:completed', { executionId: execution.id, stepId: step.id, output });
        this.mainWindow?.webContents.send('workflow:step', {
          executionId: execution.id,
          stepId: step.id,
          label: step.label,
          status: 'success',
          output: output.slice(0, 200),
        });

        // 执行下一步
        if (step.next) {
          const nextStep = template.steps.find(s => s.id === step.next);
          if (nextStep) {
            await this.runStep(nextStep, execution, template);
          }
        }

        return output;
      } catch (err: any) {
        result.error = err.message;
        if (attempts > maxRetries) {
          result.status = 'error';
          result.completedAt = Date.now();
          this.emit('step:error', { executionId: execution.id, stepId: step.id, error: err.message });
          this.mainWindow?.webContents.send('workflow:step', {
            executionId: execution.id,
            stepId: step.id,
            label: step.label,
            status: 'error',
            error: err.message,
          });
          throw err;
        }
        // 重试前等待
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }

    return output;
  }

  private async executePrompt(step: WorkflowStep, execution: WorkflowExecution): Promise<string> {
    const modelConfig = this.config.get().models;
    const toolDefs = this.tools.getDefinitions();

    // 替换变量
    let prompt = step.prompt || '';
    for (const [key, value] of Object.entries(execution.variables)) {
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    const messages: any[] = [
      { role: 'system', content: '你是工作流执行器。请完成以下步骤任务。\n\n## YAGNI 懒开发原则\n1. 需要存在吗？不需要就跳过\n2. 代码库已有？复用，不重写\n3. 标准库有？用标准库\n4. 平台原生支持？用原生\n5. 已安装的依赖能解决？用依赖\n6. 能一行搞定？一行\n7. 最后才写最小可行代码\n\n规则：不写未请求的抽象、删除优于添加、最少文件最短diff、修复根因不修症状、不简化安全措施。' },
      { role: 'user', content: prompt },
    ];

    let fullContent = '';
    for await (const evt of this.agent.streamChat(messages, modelConfig, toolDefs, `workflow_${execution.id}`)) {
      if (evt.type === 'assistant_delta') {
        fullContent += evt.text;
      }
    }

    // 保存输出到变量
    execution.variables[`step_${step.id}_output`] = fullContent;
    return fullContent;
  }

  private async executeToolStep(step: WorkflowStep, execution: WorkflowExecution): Promise<string> {
    if (!step.toolName) throw new Error('工具名称未指定');

    const args = { ...step.toolArgs };
    // 替换变量
    for (const [key, value] of Object.entries(execution.variables)) {
      for (const argKey of Object.keys(args)) {
        if (typeof args[argKey] === 'string') {
          args[argKey] = args[argKey].replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
      }
    }

    const result = await this.tools.execute(step.toolName, args);
    const output = typeof result === 'string' ? result : JSON.stringify(result);
    execution.variables[`step_${step.id}_output`] = output;
    return output;
  }

  private async executeCondition(step: WorkflowStep, execution: WorkflowExecution, template: WorkflowTemplate): Promise<string> {
    if (!step.condition) return '';

    const varName = `step_${step.id}_output`;
    const fieldValue = execution.variables[varName] || '';
    let conditionMet = false;

    switch (step.condition.operator) {
      case 'contains':
        conditionMet = fieldValue.includes(step.condition.value);
        break;
      case 'equals':
        conditionMet = fieldValue === step.condition.value;
        break;
      case 'not_empty':
        conditionMet = fieldValue.trim().length > 0;
        break;
      case 'matches':
        try {
          conditionMet = new RegExp(step.condition.value).test(fieldValue);
        } catch {
          conditionMet = false;
        }
        break;
    }

    const nextStepId = conditionMet ? step.onTrue : step.onFalse;
    if (nextStepId) {
      const nextStep = template.steps.find(s => s.id === nextStepId);
      if (nextStep) {
        return await this.runStep(nextStep, execution, template);
      }
    }

    return conditionMet ? 'true' : 'false';
  }

  private async executeParallel(step: WorkflowStep, execution: WorkflowExecution, template: WorkflowTemplate): Promise<string> {
    if (!step.parallelSteps?.length) return '';

    const results = await Promise.allSettled(
      step.parallelSteps.map(async (sid) => {
        const s = template.steps.find(st => st.id === sid);
        if (s) return await this.runStep(s, execution, template);
        return '';
      })
    );

    const outputs = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return `步骤 ${step.parallelSteps![i]} 失败: ${r.reason}`;
    });

    const combined = outputs.join('\n---\n');
    execution.variables[`step_${step.id}_output`] = combined;
    return combined;
  }

  // ---- 查询 ----

  getExecution(id: string): WorkflowExecution | undefined {
    return this.executions.get(id);
  }

  listExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values()).slice(-MAX_EXECUTIONS);
  }

  isRunning(templateId: string): boolean {
    return this.running.has(templateId);
  }
}
