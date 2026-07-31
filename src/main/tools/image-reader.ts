// ============================================================
// 图片读取工具 — 用视觉模型描述图片内容
// 从配置文件中读取 glm-4v-flash 模型进行图片识别
// ============================================================
import * as fs from 'fs';
import * as path from 'path';

// 视觉模型 ID（在模型配置中查找此 ID）
const VISION_MODEL_ID = 'glm-4v-flash';

/**
 * 读取图片文件并调用视觉模型获取描述
 */
export async function imageReader(args: Record<string, unknown>): Promise<string> {
  const filePath = args.path as string;
  const base64Input = args.base64 as string;
  const mimeTypeInput = args.mimeType as string;
  const question = (args.question as string) || '请详细描述这张图片的内容，包括可见的文字、数据、布局等所有细节。';

  if (!filePath && !base64Input) {
    throw new Error('缺少参数: path 或 base64');
  }

  let base64: string;
  let mimeType: string;

  if (filePath) {
    // 从文件路径读取
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(
      process.env.USERPROFILE || '',
      '.wdclaw',
      'workspace',
      filePath
    );

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const supportedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    if (!supportedExts.includes(ext)) {
      throw new Error(`不支持的图片格式: ${ext}，支持: ${supportedExts.join(', ')}`);
    }

    const fileData = fs.readFileSync(resolvedPath);
    base64 = fileData.toString('base64');
    mimeType = ext === '.png' ? 'image/png' :
      ext === '.gif' ? 'image/gif' :
      ext === '.webp' ? 'image/webp' :
      ext === '.bmp' ? 'image/bmp' : 'image/jpeg';
  } else {
    // 直接使用传入的 base64 数据
    base64 = base64Input;
    mimeType = mimeTypeInput || 'image/jpeg';
  }

  // 从配置中获取 glm-4v-flash 模型的 baseUrl 和 apiKey
  const visionConfig = getVisionModelConfig();
  if (!visionConfig) {
    throw new Error('未找到可用的视觉模型配置。请在设置中添加 glm-4v-flash 模型或任意 GLM 模型。');
  }
  if (!visionConfig.apiKey) {
    throw new Error('视觉模型未配置 API Key，请在设置中填写。');
  }

  // 拼接完整 API URL（与 agent/index.ts 保持一致）
  let apiUrl = visionConfig.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
  if (!apiUrl.endsWith('/chat/completions')) {
    apiUrl = `${apiUrl}/chat/completions`;
  }
  const modelId = visionConfig.model || VISION_MODEL_ID;

  // 调用视觉模型
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${visionConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: question },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: visionConfig.maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`视觉模型 API 错误 (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('视觉模型返回空内容');
  }

  return content;
}

/**
 * 安全移除 JSON5 注释（不破坏 URL 中的 //）
 */
function stripJson5(src: string): string {
  // 1. 移除多行注释 /* ... */
  let result = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // 2. 移除单行注释 // ...（不在字符串内）
  const lines = result.split('\n');
  const processed = lines.map(line => {
    let inString = false;
    let escaped = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (!inString && ch === '/' && line[i + 1] === '/') {
        return line.substring(0, i);
      }
    }
    return line;
  });
  return processed.join('\n');
}

/**
 * 从配置文件中获取视觉模型配置
 * 直接读取 ~/.wdclaw/config.json5
 * 优先级：
 * 1. 精确匹配 glm-4v-flash 模型
 * 2. 任意 glm 开头的模型（用它的凭证调 glm-4v-flash）
 * 3. 默认模型（用它的凭证调 glm-4v-flash）
 * 4. 任意有 apiKey 的模型
 */
function getVisionModelConfig(): { baseUrl: string; apiKey: string; model: string; maxTokens: number } | null {
  try {
    const os = require('os');
    const configPath = path.join(os.homedir(), '.wdclaw', 'config.json5');
    if (!fs.existsSync(configPath)) {
      console.error('[imageReader] 配置文件不存在:', configPath);
      return null;
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    const json = stripJson5(raw);
    const config = JSON.parse(json);
    const models = config.models?.models || [];
    const defaultModelId = config.models?.defaultModel;

    console.log(`[imageReader] 已加载 ${models.length} 个模型，默认: ${defaultModelId}`);

    // 读取配置中的 maxTokens，但 GLM-4V-Flash 限制最大 1024
    const configuredMaxTokens = config.models?.maxTokens || 4096;
    const maxTokens = Math.min(configuredMaxTokens, 1024);

    // 1. 精确匹配 glm-4v-flash
    const visionModel = models.find((m: any) => m.id === VISION_MODEL_ID);
    if (visionModel && visionModel.apiKey) {
      console.log('[imageReader] 使用 glm-4v-flash 专用配置');
      return {
        baseUrl: visionModel.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiKey: visionModel.apiKey,
        model: visionModel.model || VISION_MODEL_ID,
        maxTokens: Math.min(visionModel.maxTokens || configuredMaxTokens, 1024),
      };
    }

    // 2. 任意 glm 开头的模型（借用凭证）
    const glmModel = models.find((m: any) =>
      m.id?.startsWith('glm') && m.baseUrl && m.apiKey
    );
    if (glmModel) {
      console.log(`[imageReader] 借用 ${glmModel.id} 的凭证调用 ${VISION_MODEL_ID}`);
      return {
        baseUrl: glmModel.baseUrl,
        apiKey: glmModel.apiKey,
        model: VISION_MODEL_ID,
        maxTokens,
      };
    }

    // 3. 默认模型的凭证
    const defaultModel = models.find((m: any) => m.id === defaultModelId && m.apiKey);
    if (defaultModel) {
      console.log(`[imageReader] 借用默认模型 ${defaultModel.id} 的凭证调用 ${VISION_MODEL_ID}`);
      return {
        baseUrl: defaultModel.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiKey: defaultModel.apiKey,
        model: VISION_MODEL_ID,
        maxTokens,
      };
    }

    // 4. 任意有 apiKey 的模型
    const anyModel = models.find((m: any) => m.apiKey);
    if (anyModel) {
      console.log(`[imageReader] 借用 ${anyModel.id} 的凭证调用 ${VISION_MODEL_ID}`);
      return {
        baseUrl: anyModel.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiKey: anyModel.apiKey,
        model: VISION_MODEL_ID,
        maxTokens,
      };
    }

    return null;
  } catch (err) {
    console.error('[imageReader] 读取配置失败:', err);
    return null;
  }
}
