/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // QClaw 风格浅色主题
        'qclaw-bg': '#ffffff',
        'qclaw-bg-secondary': '#f7f7f8',
        'qclaw-bg-tertiary': '#edf2f7',
        'qclaw-bg-hover': '#f1f5f9',
        'qclaw-text': '#1a1a2e',
        'qclaw-text-secondary': '#4a5568',
        'qclaw-text-tertiary': '#718096',
        'qclaw-accent': '#10a37f',
        'qclaw-accent-hover': '#0d8a6a',
        'qclaw-accent-light': '#e6f7f1',
        'qclaw-border': '#e2e8f0',
        'qclaw-border-light': '#edf2f7',
        'qclaw-border-strong': '#cbd5e0',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Microsoft YaHei', 'sans-serif'],
        mono: ['Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'qclaw': '0 1px 3px rgba(0,0,0,0.04)',
        'qclaw-md': '0 4px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
