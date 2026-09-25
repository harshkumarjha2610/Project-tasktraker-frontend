'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Paintbrush, Eraser, Undo, Trash2, Check, X, RotateCcw } from 'lucide-react';

interface InNotePencilCanvasProps {
  isPencilMode: boolean;
  onTogglePencilMode: (active: boolean) => void;
  initialDataUrl?: string;
  onChangeDataUrl: (dataUrl: string) => void;
  textColor?: string;
}

const BRUSH_SIZES = [
  { label: 'Fine', size: 2 },
  { label: 'Medium', size: 4 },
  { label: 'Thick', size: 8 },
  { label: 'Bold', size: 16 },
];

const PRESET_COLORS = [
  '#38bdf8', // Electric Blue
  '#ffffff', // Pure White
  '#10b981', // Emerald Green
  '#f59e0b', // Amber / Yellow
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#0f172a', // Dark Slate
];

export default function InNotePencilCanvas({
  isPencilMode,
  onTogglePencilMode,
  initialDataUrl,
  onChangeDataUrl,
  textColor = '#ffffff',
}: InNotePencilCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<'pencil' | 'marker' | 'eraser'>('pencil');
  const [strokeColor, setStrokeColor] = useState('#38bdf8');
  const [brushSize, setBrushSize] = useState(3);

  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Resize and load canvas content
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateCanvasDimensions = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width || 800;
      const height = Math.max(rect.height, 1200);

      const dpr = window.devicePixelRatio || 1;
      
      // Preserve existing drawings if canvas already has content
      const ctx = canvas.getContext('2d');
      let tempImage: ImageData | null = null;
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        try {
          tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch {
          // ignore
        }
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      if (ctx) {
        if (tempImage) {
          ctx.putImageData(tempImage, 0, 0);
        } else if (initialDataUrl) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const initialImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setHistory([initialImgData]);
            setHistoryStep(0);
          };
          img.src = initialDataUrl;
        } else {
          const initialImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([initialImgData]);
          setHistoryStep(0);
        }
      }
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [initialDataUrl]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHist = history.slice(0, historyStep + 1);
    newHist.push(imageData);

    if (newHist.length > 25) newHist.shift();

    setHistory(newHist);
    setHistoryStep(newHist.length - 1);

    // Export transparent PNG overlay for auto-save
    const dataUrl = canvas.toDataURL('image/png');
    onChangeDataUrl(dataUrl);
  };

  const handleUndo = () => {
    if (historyStep <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prevStep = historyStep - 1;
    ctx.putImageData(history[prevStep], 0, 0);
    setHistoryStep(prevStep);

    const dataUrl = canvas.toDataURL('image/png');
    onChangeDataUrl(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPencilMode) return;
    setIsDrawing(true);
    const coords = getCoords(e);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x, coords.y);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 3 * dpr;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize * 2.5 * dpr;
      ctx.globalAlpha = 0.45;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize * dpr;
      ctx.globalAlpha = 1.0;
    }

    ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPencilMode || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const coords = getCoords(e);
    const dpr = window.devicePixelRatio || 1;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 3 * dpr;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize * 2.5 * dpr;
      ctx.globalAlpha = 0.45;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = brushSize * dpr;
      ctx.globalAlpha = 1.0;
    }

    ctx.stroke();
    lastPointRef.current = coords;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    saveCanvasState();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        pointerEvents: isPencilMode ? 'auto' : 'none',
        zIndex: isPencilMode ? 50 : 5,
      }}
    >
      {/* Floating In-Note Pencil Toolbar */}
      {isPencilMode && (
        <div
          style={{
            position: 'sticky',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 16,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5), 0 0 15px rgba(56, 189, 248, 0.25)',
            width: 'fit-content',
            maxWidth: '92%',
            margin: '0 auto 12px auto',
            pointerEvents: 'auto',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setTool('pencil')}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: tool === 'pencil' ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                color: tool === 'pencil' ? '#0f172a' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Pencil size={14} /> Pencil
            </button>

            <button
              type="button"
              onClick={() => setTool('marker')}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: tool === 'marker' ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                color: tool === 'marker' ? '#0f172a' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Paintbrush size={14} /> Marker
            </button>

            <button
              type="button"
              onClick={() => setTool('eraser')}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: tool === 'eraser' ? '#ef4444' : 'rgba(255,255,255,0.08)',
                color: tool === 'eraser' ? '#fff' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Eraser size={14} /> Eraser
            </button>
          </div>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />

          {/* Preset Colors */}
          {tool !== 'eraser' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStrokeColor(c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    border: strokeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transform: strokeColor === c ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: strokeColor === c ? `0 0 6px ${c}` : 'none',
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
              <input
                type="color"
                value={strokeColor}
                onChange={e => setStrokeColor(e.target.value)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  background: 'transparent',
                  overflow: 'hidden',
                }}
              />
            </div>
          )}

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />

          {/* Stroke Sizes */}
          <div style={{ display: 'flex', gap: 3 }}>
            {BRUSH_SIZES.map(b => (
              <button
                key={b.size}
                type="button"
                onClick={() => setBrushSize(b.size)}
                style={{
                  padding: '3px 7px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: brushSize === b.size ? 'rgba(56,189,248,0.25)' : 'transparent',
                  color: brushSize === b.size ? '#38bdf8' : '#cbd5e1',
                  cursor: 'pointer',
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)' }} />

          {/* Undo & Clear */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyStep <= 0}
            style={{
              background: 'none',
              border: 'none',
              color: historyStep <= 0 ? 'rgba(255,255,255,0.2)' : '#cbd5e1',
              cursor: historyStep <= 0 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Undo pencil stroke"
          >
            <Undo size={14} />
          </button>

          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Clear all handwriting"
          >
            <Trash2 size={14} />
          </button>

          {/* Done / Switch to Typing Mode */}
          <button
            type="button"
            onClick={() => onTogglePencilMode(false)}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginLeft: 4,
            }}
          >
            <Check size={14} /> Done Writing
          </button>
        </div>
      )}

      {/* Canvas Element Overlay */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor: isPencilMode ? (tool === 'eraser' ? 'crosshair' : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2338bdf8\' stroke-width=\'2\'%3E%3Cpath d=\'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z\'/%3E%3C/svg%3E") 0 24, crosshair') : 'default',
        }}
      />
    </div>
  );
}
