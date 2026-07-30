// ============================================================
// 工作流模板类型定义
// ============================================

/** 工作流步骤 */
export interface WorkflowStep {
  id: string;
  type: 'prompt' | 'tool' | 'condition' | 'parallel';
  label: string;
  description?: string;

  // prompt 类型
  prompt?: string;

  // tool 类型
  toolName?: string;
  toolArgs?: Record<string, any>;

  // condition 类型
  condition?: {
    field: string;           // 'output' | 'status' | 'error'
    operator: 'contains' | 'equals' | 'not_empty' | 'matches';
    value: string;
  };
  onTrue?: string;           // 步骤 ID（条件成立时跳转）
  onFalse?: string;          // 步骤 ID（条件不成立时跳转）

  // parallel 类型
  parallelSteps?: string[];  // 并行执行的步骤 ID 列表

  // 通用
  next?: string;             // 下一步步骤 ID
  retries?: number;          // 失败重试次数
  timeout?: number;          // 超时毫秒
}

/** 工作流模板 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  tags: string[];
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
  runCount: number;
  source?: 'local' | 'imported' | 'conversation';
  version: number;
}

/** 工作流执行状态 */
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'error' | 'paused';

/** 步骤执行结果 */
export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  output?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  attempts: number;
}

/** 工作流执行上下文 */
export interface WorkflowExecution {
  id: string;
  templateId: string;
  templateName: string;
  status: WorkflowStatus;
  currentStepId?: string;
  stepResults: Map<string, StepResult>;
  variables: Record<string, string>;  // 步骤间共享变量
  startedAt: number;
  completedAt?: number;
}
