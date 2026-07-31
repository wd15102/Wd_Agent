// ============================================================
// 网页搜索工具 (DuckDuckGo)
// ============================================================
import * as https from 'https';

export async function webSearch(args: Record<string, unknown>): Promise<string> {
  const query = args.query as string;
  const count = (args.count as number) || 5;

  if (!query) {
    throw new Error('缺少 query 参数');
  }

  try {
    const results = await searchDuckDuckGo(query);
    if (results.length === 0) {
      return '未找到相关结果。';
    }
    return results
      .slice(0, count)
      .map((r, i) => `${i + 1}. **${r.title}**\n   🔗 ${r.url}\n   📝 ${r.snippet}`)
      .join('\n\n');
  } catch (err: any) {
    throw new Error(`搜索失败: ${err.message}`);
  }
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    https
      .get(url, { headers: { 'User-Agent': 'WdClaw/1.0 (Windows; x64)' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const results: SearchResult[] = [];
          const regex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<span[^>]*>([^<]*)<\/span>/gi;
          let match;
          while ((match = regex.exec(data)) !== null) {
            const urlRaw = match[1];
            const title = match[2].replace(/<[^>]*>/g, '').trim();
            const snippet = match[3]?.replace(/<[^>]*>/g, '').trim() || '';
            if (title && urlRaw && !urlRaw.startsWith('//')) {
              results.push({ title, url: urlRaw, snippet });
            }
          }
          resolve(results);
        });
      })
      .on('error', reject);
  });
}
