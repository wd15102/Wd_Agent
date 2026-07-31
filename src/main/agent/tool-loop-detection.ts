// ============================================================
// 智能工具循环检测 — 复刻 QClaw/OpenClaw 方案
// ============================================================
// 不再用硬编码 maxToolRounds 粗暴截断，
// 改为检测：同一工具+相同参数+相同结果重复调用 → 才终止

/** 工具调用历史记录 */
export interface ToolCallRecord {
  toolName: string;
  argsHash: string;
  toolCallId?: string;
  resultHash?: string;
  unknownToolName?: string;
  timestamp: number;
}

/** 检测配置 */
export interface LoopDetectionConfig {
  enabled: boolean;
  historySize: number;
  warningThreshold: number;
  unknownToolThreshold: number;
  criticalThreshold: number;
  globalCircuitBreakerThreshold: number;
  detectors: {
    genericRepeat: boolean;
    knownPollNoProgress: boolean;
    pingPong: boolean;
  };
}

/** 检测结果 */
export interface LoopDetectionResult {
  stuck: boolean;
  level?: 'warning' | 'critical';
  detector?: string;
  count?: number;
  message?: string;
  pairedToolName?: string;
}

/** 默认配置 */
const DEFAULT_CONFIG: LoopDetectionConfig = {
  enabled: true,
  historySize: 30,
  warningThreshold: 10,
  unknownToolThreshold: 10,
  criticalThreshold: 20,
  globalCircuitBreakerThreshold: 30,
  detectors: {
    genericRepeat: true,
    knownPollNoProgress: true,
    pingPong: true,
  },
};

/** 简化的 JSON 序列化哈希 */
function simpleHash(obj: any): string {
  const str = JSON.stringify(obj) || String(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash = hash | 0;
  }
  return Math.abs(hash).toString(36);
}

/** 对工具调用参数生成哈希 */
function hashToolCall(toolName: string, params: any): string {
  return `${toolName}:${simpleHash(params)}`;
}

/** 对工具结果生成哈希 */
function hashToolResult(toolName: string, result: any, error?: string): string {
  if (error) return `error:${simpleHash(error)}`;
  const str = typeof result === 'string' ? result : JSON.stringify(result);
  return simpleHash(str);
}

/** 解析并合并配置 */
export function resolveLoopDetectionConfig(
  cfg?: Partial<LoopDetectionConfig>
): LoopDetectionConfig {
  if (!cfg) return DEFAULT_CONFIG;
  return {
    enabled: cfg.enabled ?? DEFAULT_CONFIG.enabled,
    historySize: cfg.historySize || DEFAULT_CONFIG.historySize,
    warningThreshold: cfg.warningThreshold || DEFAULT_CONFIG.warningThreshold,
    unknownToolThreshold: cfg.unknownToolThreshold || DEFAULT_CONFIG.unknownToolThreshold,
    criticalThreshold: cfg.criticalThreshold || DEFAULT_CONFIG.criticalThreshold,
    globalCircuitBreakerThreshold: cfg.globalCircuitBreakerThreshold || DEFAULT_CONFIG.globalCircuitBreakerThreshold,
    detectors: {
      ...DEFAULT_CONFIG.detectors,
      ...cfg.detectors,
    },
  };
}

/** 记录工具调用（执行前） */
export function recordToolCall(
  history: ToolCallRecord[],
  toolName: string,
  args: any,
  toolCallId?: string,
): ToolCallRecord[] {
  const record: ToolCallRecord = {
    toolName,
    argsHash: hashToolCall(toolName, args),
    toolCallId,
    timestamp: Date.now(),
  };
  history.push(record);
  // 滑动窗口
  if (history.length > DEFAULT_CONFIG.historySize) {
    history.splice(0, history.length - DEFAULT_CONFIG.historySize);
  }
  return history;
}

/** 记录工具调用结果（执行后） */
export function recordToolCallResult(
  history: ToolCallRecord[],
  toolName: string,
  args: any,
  result?: any,
  error?: string,
): ToolCallRecord[] {
  const argsHash = hashToolCall(toolName, args);
  const resultHash = hashToolResult(toolName, result, error);

  // 从后往前找匹配的记录
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].toolName === toolName && history[i].argsHash === argsHash && !history[i].resultHash) {
      history[i].resultHash = resultHash;
      return history;
    }
  }

  // 没找到 → 新建一条
  history.push({
    toolName,
    argsHash,
    resultHash,
    timestamp: Date.now(),
  });

  if (history.length > DEFAULT_CONFIG.historySize) {
    history.splice(0, history.length - DEFAULT_CONFIG.historySize);
  }
  return history;
}

/**
 * 核心检测函数
 * @param history 工具调用历史
 * @param toolName 当前要调用的工具名
 * @param params 当前工具参数
 * @param config 检测配置
 */
export function detectToolCallLoop(
  history: ToolCallRecord[],
  toolName: string,
  params: any,
  config?: Partial<LoopDetectionConfig>,
): LoopDetectionResult {
  const cfg = resolveLoopDetectionConfig(config);
  if (!cfg.enabled) return { stuck: false };

  const currentHash = hashToolCall(toolName, params);

  // ── 检测1: 无进展重复（同一工具+参数+结果）──
  let noProgressStreak = 0;
  let latestResultHash: string | undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    const r = history[i];
    if (r.toolName !== toolName || r.argsHash !== currentHash) continue;
    if (!r.resultHash) continue;
    if (!latestResultHash) {
      latestResultHash = r.resultHash;
      noProgressStreak = 1;
      continue;
    }
    if (r.resultHash !== latestResultHash) break; // 有进展 → 停止计数
    noProgressStreak++;
  }

  // 全局熔断
  if (noProgressStreak >= cfg.globalCircuitBreakerThreshold) {
    return {
      stuck: true,
      level: 'critical',
      detector: 'global_circuit_breaker',
      count: noProgressStreak,
      message: `CRITICAL: ${toolName} 重复无进展执行 ${noProgressStreak} 次，已触发全局熔断。任务已终止以防止死循环。`,
    };
  }

  // 严重循环
  if (noProgressStreak >= cfg.criticalThreshold) {
    return {
      stuck: true,
      level: 'critical',
      detector: 'generic_repeat',
      count: noProgressStreak,
      message: `CRITICAL: ${toolName} 以相同参数和结果重复执行 ${noProgressStreak} 次，疑似死循环。任务已终止。`,
    };
  }

  // ── 检测2: Ping-Pong（两个工具交替调用无进展）──
  const pingPongResult = detectPingPong(history, currentHash, cfg);
  if (pingPongResult.stuck) return pingPongResult;

  // ── 检测3: 警告级别 ──
  const sameCallCount = history.filter(
    (h) => h.toolName === toolName && h.argsHash === currentHash
  ).length;

  if (sameCallCount >= cfg.warningThreshold) {
    return {
      stuck: true,
      level: 'warning',
      detector: 'generic_repeat',
      count: sameCallCount,
      message: `WARNING: ${toolName} 已用相同参数调用 ${sameCallCount} 次。如无进展请停止重试，报告任务失败。`,
    };
  }

  return { stuck: false };
}

/** Ping-Pong 检测：两个工具交替调用且各自无进展 */
function detectPingPong(
  history: ToolCallRecord[],
  currentHash: string,
  cfg: LoopDetectionConfig,
): LoopDetectionResult {
  if (!cfg.detectors.pingPong) return { stuck: false };
  if (history.length < 4) return { stuck: false };

  // 找交替模式：A→B→A→B→...
  const last = history[history.length - 1];
  if (!last || last.argsHash === currentHash) return { stuck: false };

  // 检查最近的历史是否是交替模式
  let alternatingCount = 0;
  let firstHash = currentHash;
  let secondHash = last.argsHash;
  let firstTool = '';
  let secondTool = '';

  for (let i = history.length - 1; i >= 0; i--) {
    const call = history[i];
    if (!call) break;
    const expected = alternatingCount % 2 === 0 ? secondHash : firstHash;
    if (call.argsHash !== expected) break;
    if (alternatingCount === 0) secondTool = call.toolName;
    if (alternatingCount === 1) firstTool = call.toolName;
    alternatingCount++;
  }

  if (alternatingCount < cfg.warningThreshold) return { stuck: false };

  // 检查是否无进展（每个工具各自的结果都相同）
  const firstResults = new Set<string>();
  const secondResults = new Set<string>();
  for (let i = history.length - 1; i >= 0; i--) {
    const call = history[i];
    if (!call.resultHash) continue;
    if (call.argsHash === firstHash) firstResults.add(call.resultHash);
    if (call.argsHash === secondHash) secondResults.add(call.resultHash);
    if (firstResults.size > 1 || secondResults.size > 1) break;
  }

  const noProgress = firstResults.size <= 1 && secondResults.size <= 1;

  if (alternatingCount >= cfg.criticalThreshold && noProgress) {
    return {
      stuck: true,
      level: 'critical',
      detector: 'ping_pong',
      count: alternatingCount,
      pairedToolName: secondTool,
      message: `CRITICAL: ${firstTool} 和 ${secondTool} 交替调用 ${alternatingCount} 次且无进展，疑似死循环。任务已终止。`,
    };
  }

  if (alternatingCount >= cfg.warningThreshold) {
    return {
      stuck: true,
      level: 'warning',
      detector: 'ping_pong',
      count: alternatingCount,
      pairedToolName: secondTool,
      message: `WARNING: ${firstTool} 和 ${secondTool} 交替调用 ${alternatingCount} 次。如无进展请停止重试。`,
    };
  }

  return { stuck: false };
}
