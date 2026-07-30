import React, { useState } from 'react';
import { Modal, Tooltip, Button, message, Tabs } from 'antd';
import { CheckOutlined, UploadOutlined } from '@ant-design/icons';
import AvatarCropModal from './AvatarCropModal';

// 20 个内置卡通头像（Emoji + 纯色/渐变背景）
const BUILTIN_AVATARS = [
  { id: 'ava-robot',   emoji: '🤖', name: '机器人',   bg: ['#e8eaf6', '#c5cae9'], border: '#7986cb' },
  { id: 'ava-cat',     emoji: '🐱', name: '猫咪',     bg: ['#fff3e0', '#ffe0b2'], border: '#ff9800' },
  { id: 'ava-dog',     emoji: '🐶', name: '小狗',     bg: ['#fff8e1', '#ffecb3'], border: '#ffc107' },
  { id: 'ava-panda',   emoji: '🐼', name: '熊猫',     bg: ['#f5f5f5', '#e0e0e0'], border: '#9e9e9e' },
  { id: 'ava-fox',     emoji: '🦊', name: '狐狸',     bg: ['#fbe9e7', '#ffccbc'], border: '#ff7043' },
  { id: 'ava-unicorn', emoji: '🦄', name: '独角兽',   bg: ['#f3e5f5', '#e1bee7'], border: '#ab47bc' },
  { id: 'ava-lion',    emoji: '🦁', name: '狮子',     bg: ['#fff9c4', '#fff176'], border: '#f9a825' },
  { id: 'ava-penguin', emoji: '🐧', name: '企鹅',     bg: ['#e1f5fe', '#b3e5fc'], border: '#039be5' },
  { id: 'ava-owl',     emoji: '🦉', name: '猫头鹰',   bg: ['#efebe9', '#d7ccc8'], border: '#8d6e63' },
  { id: 'ava-frog',    emoji: '🐸', name: '青蛙',     bg: ['#c8e6c9', '#a5d6a7'], border: '#4caf50' },
  { id: 'ava-bee',     emoji: '🐝', name: '蜜蜂',     bg: ['#fffde7', '#fff59d'], border: '#fbc02d' },
  { id: 'ava-pig',     emoji: '🐷', name: '小猪',     bg: ['#fce4ec', '#f8bbd0'], border: '#ec407a' },
  { id: 'ava-monkey',  emoji: '🐵', name: '猴子',     bg: ['#d7ccc8', '#bcaaa4'], border: '#6d4c41' },
  { id: 'ava-dolphin', emoji: '🐬', name: '海豚',     bg: ['#e0f7fa', '#b2ebf2'], border: '#00bcd4' },
  { id: 'ava-dragon',  emoji: '🐉', name: '龙',       bg: ['#e8f5e9', '#c8e6c9'], border: '#558b2f' },
  { id: 'ava-alien',   emoji: '👾', name: '外星人',   bg: ['#1a1a2e', '#16213e'], border: '#7c4dff' },
  { id: 'ava-ghost',   emoji: '👻', name: '幽灵',     bg: ['#ede7f6', '#d1c4e9'], border: '#673ab7' },
  { id: 'ava-octopus', emoji: '🐙', name: '章鱼',     bg: ['#f3e5f5', '#ce93d8'], border: '#9c27b0' },
  { id: 'ava-whale',   emoji: '🐋', name: '鲸鱼',     bg: ['#e3f2fd', '#90caf9'], border: '#1976d2' },
  { id: 'ava-koala',   emoji: '🐨', name: '考拉',     bg: ['#d7ccc8', '#a1887f'], border: '#5d4037' },
];

// 将 SVG data URL 转成 PNG data URL
async function svgToPng(svgDataUrl: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('SVG load failed'));
    img.src = svgDataUrl;
  });
}

// 渲染 emoji 为 SVG data URL
function avatarToDataUrl(avatar: typeof BUILTIN_AVATARS[0]): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${avatar.bg[0]}"/>
          <stop offset="100%" style="stop-color:${avatar.bg[1]}"/>
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#bg)" stroke="${avatar.border}" stroke-width="2"/>
      <text x="60" y="55" font-size="52" text-anchor="middle" dominant-baseline="central">${avatar.emoji}</text>
    </svg>`.trim();
  const utf8Bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (dataUrl: string) => void;
  currentAvatar?: string;
}

export default function AvatarPicker({ visible, onClose, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);

  const handleConfirmBuiltin = async () => {
    if (!selected) return;
    const avatar = BUILTIN_AVATARS.find(a => a.id === selected);
    if (!avatar) return;
    // 关键修复：转 SVG 为 PNG 后再上传，避免 file:// 加载 SVG 失败
    const svgDataUrl = avatarToDataUrl(avatar);
    const pngDataUrl = await svgToPng(svgDataUrl, 120);
    onSelect(pngDataUrl);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = (croppedDataUrl: string) => {
    onSelect(croppedDataUrl);
    setShowCrop(false);
    onClose();
  };

  return (
    <>
      <Modal
        title="选择头像"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={520}
      >
        <Tabs
          items={[
            {
              key: 'builtin',
              label: '🎨 内置头像',
              children: (
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 12,
                    padding: '16px 0',
                  }}>
                    {BUILTIN_AVATARS.map(avatar => {
                      const dataUrl = avatarToDataUrl(avatar);
                      const isSelected = selected === avatar.id;
                      return (
                        <Tooltip key={avatar.id} title={avatar.name}>
                          <div
                            onClick={() => setSelected(avatar.id)}
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: '50%',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                              transition: 'transform 0.15s, border-color 0.15s',
                              position: 'relative',
                              boxShadow: isSelected ? '0 0 0 2px #e6f0ff' : 'none',
                            }}
                          >
                            <img
                              src={dataUrl}
                              alt={avatar.name}
                              style={{ width: '100%', height: '100%', display: 'block' }}
                            />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                bottom: -1,
                                right: -1,
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid var(--bg-primary)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                              }}>
                                <CheckOutlined style={{ fontSize: 11, color: 'var(--bg-primary)' }} />
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 4px' }}>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" disabled={!selected} onClick={handleConfirmBuiltin}>
                      确认选择
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'upload',
              label: '📤 上传图片',
              children: (
                <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px dashed #c5cae9',
                  }}>
                    <span style={{ fontSize: 40 }}>🖼️</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    上传一张图片，自动裁剪为圆形
                  </div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', background: 'var(--accent)', color: 'var(--bg-primary)',
                    borderRadius: 8, cursor: 'pointer', fontSize: 14,
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#096dd9')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                  >
                    <UploadOutlined /> 选择图片
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>
                  <div style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>支持 JPG / PNG / WebP</div>
                </div>
              ),
            },
          ]}
        />
      </Modal>

      <AvatarCropModal
        visible={showCrop}
        imageSrc={uploadedImage || ''}
        onClose={() => setShowCrop(false)}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}

export { BUILTIN_AVATARS, avatarToDataUrl };
