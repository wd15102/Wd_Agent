// ============================================================
// 网页抓取工具
// ============================================================
import * as https from 'https';
import * as http from 'http';

export async function webFetch(args: Record<string, unknown>): Promise<string> {
  const url = args.url as string;
  const maxChars = (args.maxChars as number) || 10000;

  if (!url) {
    throw new Error('缺少 url 参数');
  }

  try {
    const html = await fetchUrl(url);
    const text = extractText(html);
    if (text.length > maxChars) {
      return text.slice(0, maxChars) + `\n\n... (已截断，原文 ${text.length} 字符)`;
    }
    return text;
  } catch (err: any) {
    throw new Error(`抓取失败: ${err.message}`);
  }
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { headers: { 'User-Agent': 'WdClaw/1.0' } }, (res) => {
        // 处理重定向
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location).then(resolve).catch(reject);
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function extractText(html: string): string {
  // 简单 HTML 文本提取
  let text = html;

  // 移除 script 和 style
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 移除 HTML 标签
  text = text.replace(/<[^>]*>/g, '\n');

  // 解码 HTML 实体
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

  // 压缩空白
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.trim();

  return text;
}
