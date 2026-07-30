// ============================================================
// Shell 命令执行工具 — 带安全沙箱
// ============================================================
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ---- 安全配置 ----

// 危险命令关键字 — 包含这些关键字的命令会被拦截
const DANGEROUS_KEYWORDS = [
  'rm -rf /', 'rm -rf \\', 'rm -rf C:', 'rm -rf c:',
  'format C:', 'format c:', 'format /',
  'del /f /q C:', 'del /f /q \\',
  'rd /s /q C:', 'rd /s /q \\',
  'rmdir /s /q C:', 'rmdir /s /q \\',
  'shutdown /r', 'shutdown /s',
  'taskkill /f /im',
  'chkdsk /f', 'chkdsk /r',
  'bcdedit',
  'diskpart',
  'reg delete', 'reg.exe delete',
  'net user ', 'net localgroup administrators',
  'sc create ', 'sc delete ', 'sc config ',
  'powershell -enc', 'powershell -e ',
  'Invoke-Expression', 'IEX(',
  'bitsadmin',
  'certutil -url', 'certutil -verify',
  'mshta',
  'wscript', 'cscript',
  'schtasks /create', 'schtasks /delete',
  'wevtutil cl',
  'vssadmin delete',
  'wbadmin delete',
  'cipher /w',
];

// 受保护的目录 — 不允许写入/删除
const PROTECTED_PATHS = [
  'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
  'C:\\ProgramData', 'C:\\Users\\Default', 'C:\\Users\\Public',
  'C:\\inetpub', 'C:\\boot.ini', 'C:\\autoexec.bat', 'C:\\config.sys',
  'C:\\Windows\\System32', 'C:\\Windows\\SysWOW64',
];

function checkSafety(command: string): { safe: boolean; reason?: string } {
  const trimmed = command.trim();
  const lower = trimmed.toLowerCase();

  // 1. 检查危险关键字
  for (const kw of DANGEROUS_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return { safe: false, reason: `命令包含危险关键字: "${kw}"` };
    }
  }

  // 2. 检查是否包含 ; 或 && 或 || 拼接（可能有隐藏命令）
  if (trimmed.includes(';') || trimmed.includes('&&') || trimmed.includes('||')) {
    return { safe: false, reason: '命令包含分隔符(; && ||)，可能存在命令注入风险' };
  }

  // 3. 检查是否包含反引号或 $()（PowerShell 子表达式）
  if (trimmed.includes('`') || trimmed.includes('$(')) {
    return { safe: false, reason: '命令包含反引号或$()，可能存在命令注入风险' };
  }

  // 4. 检查是否受保护路径操作
  for (const p of PROTECTED_PATHS) {
    if (lower.includes(p.toLowerCase())) {
      return { safe: false, reason: `操作受保护路径: ${p}` };
    }
  }

  return { safe: true };
}

// 重新导出的函数名用于 registers 中调用
export const runExec = async (args: Record<string, unknown>): Promise<string> => {
  const command = args.command as string;
  const workdir = args.workdir as string | undefined;
  const timeout = (args.timeout as number) || 60;
  const background = args.background as boolean;

  if (!command) {
    throw new Error('缺少 command 参数');
  }

  // 安全检查
  const safety = checkSafety(command);
  if (!safety.safe) {
    throw new Error(`🚫 安全拦截: ${safety.reason}\n命令: ${command}`);
  }

  try {
    const options: Record<string, unknown> = {
      timeout: timeout * 1000,
      maxBuffer: 10 * 1024 * 1024,
      shell: 'powershell.exe',
    };
    if (workdir) options.cwd = workdir;

    if (background) {
      exec(`Start-Process powershell -ArgumentList "-NoExit -Command ${command.replace(/"/g, '\\"')}"`, options as any);
      return '后台命令已启动。';
    }

    const { stdout, stderr } = await execAsync(command, options as any);
    let result = String(stdout || '').trim();
    const errText = String(stderr || '').trim();
    if (errText) {
      result += '\n[stderr]\n' + errText;
    }
    return result || '(无输出)';
  } catch (err: any) {
    if (err.killed) {
      throw new Error(`命令执行超时 (${timeout}s)`);
    }
    const outStr = (err.stdout || '').trim();
    const errStr = (err.stderr || '').trim();
    if (outStr) return outStr;
    throw new Error(errStr || err.message);
  }
};
