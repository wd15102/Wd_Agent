// ============================================================
// 图片读取工具 — 用视觉模型描述图片内容
// 从配置中读取 glm-4v-flash 模型进行图片识别
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
      '.qclaw',
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
    throw new Error('未找到 glm-4v-flash 模型配置，请在设置中添加 GLM 视觉模型。');
  }
  if (!visionConfig.apiKey) {
    throw new Error('glm-4v-flash 未配置 API Key，请在设置中填写。');
  }

  const apiUrl = visionConfig.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
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
      max_tokens: 2000,
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
 * 从配置中获取视觉模型完整配置
 * 查找 models 数组中 id 为 glm-4v-flash 的模型，返回其 baseUrl/apiKey/model
 */
function getVisionModelConfig(): { baseUrl: string; apiKey: string; model: string } | null {
  try {
    const { getConfig } = require('../gateway/config');
    const config = getConfig();
    // 精确匹配 glm-4v-flash 模型
    const visionModel = config.models?.models?.find((m: any) => m.id === VISION_MODEL_ID);
    if (visionModel) {
      return {
        baseUrl: visionModel.baseUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiKey: visionModel.apiKey || '',
        model: visionModel.model || VISION_MODEL_ID,
      };
    }
    // fallback: 查找任意 glm 开头的模型
    const glmModel = config.models?.models?.find((m: any) =>
      m.id?.startsWith('glm') && m.baseUrl && m.apiKey
    );
    if (glmModel) {
      return {
        baseUrl: glmModel.baseUrl,
        apiKey: glmModel.apiKey,
        model: VISION_MODEL_ID,
      };
    }
    return null;
  } catch {
    return null;
  }
}
