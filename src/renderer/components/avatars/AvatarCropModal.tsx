import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Slider } from 'antd';

interface Props {
  visible: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

export default function AvatarCropModal({ visible, imageSrc, onClose, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 200 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImgSize({ w: img.width, h: img.height });
      const minSize = Math.min(img.width, img.height);
      setCrop({ x: (img.width - minSize) / 2, y: (img.height - minSize) / 2, size: minSize });
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    const drawSize = crop.size / scale;
    const sx = crop.x + (crop.size - drawSize) / 2;
    const sy = crop.y + (crop.size - drawSize) / 2;

    ctx.drawImage(imageRef.current, sx, sy, drawSize, drawSize, 0, 0, size, size);
    ctx.restore();
  }, [imgLoaded, crop, scale]);

  const handleConfirm = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onConfirm(dataUrl);
  }, [onConfirm]);

  const minCropSize = Math.min(imgSize.w, imgSize.h);

  return (
    <Modal
      title="裁剪头像"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm}>确认</Button>,
      ]}
      width={400}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Preview */}
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          {imageSrc && (
            <>
              <img
                src={imageSrc}
                alt="Preview"
                style={{
                  width: 200, height: 200, objectFit: 'cover', borderRadius: '50%',
                  opacity: 0.5,
                }}
              />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <canvas
                  ref={canvasRef}
                  width={200}
                  height={200}
                  style={{ width: 200, height: 200, borderRadius: '50%' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>缩放</div>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={scale}
            onChange={setScale}
            tooltip={{ formatter: v => `${((v || 1) * 100).toFixed(0)}%` }}
          />
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>
          调整缩放来控制头像显示区域，最终裁剪为圆形
        </div>
      </div>
    </Modal>
  );
}
