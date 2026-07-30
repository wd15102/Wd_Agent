// ============================================================
// 文件系统工具 — 带安全沙箱
// ============================================================
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { WORKSPACE_DIR, CONFIG_DIR } from '../../shared/constants';

function getWorkspace(): string {
  return path.join(app.getPath('home'), CONFIG_DIR, WORKSPACE_DIR);
}

function resolvePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.join(getWorkspace(), inputPath);
}

function ensureWorkspace(): void {
  const ws = getWorkspace();
  if (!fs.existsSync(ws)) {
    fs.mkdirSync(ws, { recursive: true });
  }
}

// ---- read ----
export async function filesystemRead(args: Record<string, unknown>): Promise<string> {
  const filePath = resolvePath(args.path as string);
  const offset = (args.offset as number) || 1;
  const limit = args.limit as number;

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    throw new Error(`路径是目录: ${filePath}`);
  }

  // 检查是否是图片
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (imageExts.includes(ext)) {
    return `[图片文件: ${path.basename(filePath)} (${(stat.size / 1024).toFixed(1)} KB)]`;
  }

  // 读取文本
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const start = Math.max(0, offset - 1);
  const end = limit ? start + limit : lines.length;
  const selected = lines.slice(start, end);

  let result = selected.join('\n');
  if (end < lines.length) {
    result += `\n\n... (第 ${offset}-${end} 行，共 ${lines.length} 行)`;
  }
  return result || '(空文件)';
}

// ---- write ----
export async function filesystemWrite(args: Record<string, unknown>): Promise<string> {
  const filePath = resolvePath(args.path as string);
  const content = args.content as string;

  // 安全检查：不可写入受保护路径
  const PROTECTED = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\ProgramData', 'C:\\Users\\Default'];
  for (const p of PROTECTED) {
    if (filePath.match(new RegExp(p, 'i'))) {
      throw new Error(`🚫 安全拦截: 不可写入系统目录 ${p}`);
    }
  }

  // 检查文件大小限制（10MB）
  if (content.length > 10 * 1024 * 1024) {
    throw new Error('🚫 安全拦截: 单次写入超过 10MB 限制');
  }

  // 创建父目录
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  const stat = fs.statSync(filePath);
  return `✅ 已写入: ${filePath} (${(stat.size / 1024).toFixed(1)} KB)`;
}

// ---- list_dir ----
export async function filesystemDir(args: Record<string, unknown>): Promise<string> {
  const dirPath = resolvePath(args.path as string);

  if (!fs.existsSync(dirPath)) {
    throw new Error(`目录不存在: ${dirPath}`);
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const items = entries
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((e) => {
      const prefix = e.isDirectory() ? '📁' : '📄';
      const fullPath = path.join(dirPath, e.name);
      try {
        const stat = fs.statSync(fullPath);
        const size = e.isDirectory() ? '' : ` (${(stat.size / 1024).toFixed(1)} KB)`;
        return `${prefix} ${e.name}${size}`;
      } catch {
        return `${prefix} ${e.name}`;
      }
    });

  if (items.length === 0) {
    return '(空目录)';
  }
  return items.join('\n');
}
