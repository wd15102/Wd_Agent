// ============================================================
// 代码块组�?�?QClaw 0.2.33 风格
// ============================================================
import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface Props {
  language: string;
  code: string;
}

export default function CodeBlock({ language, code }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', margin: '8px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-placeholder)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {language || 'text'}
        </span>
        <Tooltip title={copied ? '已复制' : '复制'}>
          <Button type="text" size="small" icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />} onClick={handleCopy} style={{ fontSize: 11 }} />
        </Tooltip>
      </div>
      <pre style={{ margin: 0, background: '#f6f8fa', padding: 12, overflowX: 'auto', fontSize: 13, fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
        <code style={{ background: 'transparent' }}>{code}</code>
      </pre>
    </div>
  );
}
