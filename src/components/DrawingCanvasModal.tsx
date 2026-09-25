'use client';

import { useState, useEffect, useRef } from 'react';
import { Pencil, Eraser, Undo, Redo, Trash2, Check, X, Sparkles, Paintbrush } from 'lucide-react';

interface DrawingCanvasModalProps {
  open: boolean;
  onClose: () => void;
  onSaveDrawing: (dataUrl: string) => void;
  colorTheme?: string;
}

const BRUSH_SIZES = [
  { label: 'Thin', size: 2 },
  { label: 'Medium', size: 5 },
  { label: 'Thick', size: 10 },
  { label: 'Marker', size: 20 },
];

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#38bdf8', // Electric Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber / Yellow
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
];

const BACKGROUND_THEMES = [
  { value: '#09090b', label: 'Dark Midnight' },
  { value: '#fcfaf2', label: 'Paper Cream' },
  { value: '#ffffff', label: 'Pure White' },
  { value: 'transparent', label: 'Transparent' },
];

export default function DrawingCanvasModal({
  open,
  onClose,
  onSaveDrawing,
  colorTheme = '#38bdf8',
}: DrawingCanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'pencil' | 'marker' | 'eraser'>('pencil');
  const [strokeColor, setStrokeColor] = useState('#38bdf8');
  const [brushSize, setBrushSize] = useState(5);
  const [bgTheme, setBgTheme] = useState('#09090b');

  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize Canvas dimensions and background
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fit container dimensions
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 500;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Draw background
      if (bgTheme !== 'transparent') {
        ctx.fillStyle = bgTheme;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Save initial history step
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
      setHistoryStep(0);
    }, 50);

    return () => clearTimeout(timer);
  }, [open, bgTheme]);

  if (!open) return null;

  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);

    // Keep max 20 history states
    if (newHistory.length > 20) newHistory.shift();

    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
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
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextStep = historyStep + 1;
    ctx.putImageData(history[nextStep], 0, 0);
    setHistoryStep(nextStep);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    if (bgTheme !== 'transparent') {
      ctx.fillStyle = bgTheme;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    saveStateToHistory();
  };

  // Drawing event helpers
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
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
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x, coords.y);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = bgTheme === 'transparent' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = bgTheme === 'transparent' ? 'rgba(0,0,0,1)' : bgTheme;
      ctx.lineWidth = brushSize * 2;
    } else if (tool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = brushSize * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brushSize;
    }

    ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const currentCoords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentCoords.x, currentCoords.y);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = bgTheme === 'transparent' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = bgTheme === 'transparent' ? 'rgba(0,0,0,1)' : bgTheme;
      ctx.lineWidth = brushSize * 2;
      ctx.globalAlpha = 1.0;
    } else if (tool === 'marker') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = brushSize * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brushSize;
    }

    ctx.stroke();
    lastPointRef.current = currentCoords;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointRef.current = null;
    saveStateToHistory();
  };

  const handleSaveAndInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveDrawing(dataUrl);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="modal-box"
        style={{
          width: '100%',
          maxWidth: 920,
          background: 'var(--bg-card, #0f0f18)',
          border: '1px solid var(--border, rgba(255,255,255,0.12))',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          maxHeight: '94vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Pencil size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary, #fff)', margin: 0 }}>
                Pencil & Freehand Drawing Studio
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
                Draw diagrams, handwritten notes, or sketches to insert into your note
              </span>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: 6, borderRadius: 8 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0,0,0,0.25)',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Tool Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 3,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setTool('pencil')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: tool === 'pencil' ? 'var(--accent, #38bdf8)' : 'transparent',
                color: tool === 'pencil' ? '#000' : 'var(--text-secondary, #cbd5e1)',
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
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: tool === 'marker' ? '#f59e0b' : 'transparent',
                color: tool === 'marker' ? '#000' : 'var(--text-secondary, #cbd5e1)',
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
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: tool === 'eraser' ? '#ef4444' : 'transparent',
                color: tool === 'eraser' ? '#fff' : 'var(--text-secondary, #cbd5e1)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Eraser size={14} /> Eraser
            </button>
          </div>

          {/* Color Palette */}
          {tool !== 'eraser' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Color:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setStrokeColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: c,
                      border: strokeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      transform: strokeColor === c ? 'scale(1.18)' : 'scale(1)',
                      boxShadow: strokeColor === c ? `0 0 8px ${c}` : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={strokeColor}
                  onChange={e => setStrokeColor(e.target.value)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: '2px solid var(--border, rgba(255,255,255,0.2))',
                    cursor: 'pointer',
                    background: 'transparent',
                    overflow: 'hidden',
                  }}
                  title="Choose custom color"
                />
              </div>
            </div>
          )}

          {/* Brush Sizes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Size:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {BRUSH_SIZES.map(b => (
                <button
                  key={b.size}
                  type="button"
                  onClick={() => setBrushSize(b.size)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    background: brushSize === b.size ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: brushSize === b.size ? 'var(--text-primary, #fff)' : 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Theme */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>Canvas BG:</span>
            <select
              value={bgTheme}
              onChange={e => setBgTheme(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-primary, #fff)',
                border: '1px solid rgba(255,255,255,0.12)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {BACKGROUND_THEMES.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#0f0f18', color: '#fff' }}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Interactive Drawing Canvas Area */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 440,
            background: bgTheme === 'transparent' ? 'repeating-conic-gradient(#1e1e2d 0% 25%, #12121a 0% 50%) 50% / 20px 20px' : bgTheme,
            overflow: 'hidden',
            cursor: tool === 'eraser' ? 'crosshair' : 'cell',
          }}
        >
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
            }}
          />
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleUndo}
              disabled={historyStep <= 0}
              style={{ gap: 5, opacity: historyStep <= 0 ? 0.4 : 1 }}
              title="Undo last stroke"
            >
              <Undo size={14} /> Undo
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRedo}
              disabled={historyStep >= history.length - 1}
              style={{ gap: 5, opacity: historyStep >= history.length - 1 ? 0.4 : 1 }}
              title="Redo stroke"
            >
              <Redo size={14} /> Redo
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClear}
              style={{ gap: 5, color: '#ef4444' }}
              title="Clear entire canvas"
            >
              <Trash2 size={14} /> Clear All
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSaveAndInsert}
              style={{
                gap: 6,
                padding: '8px 18px',
                background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
                fontWeight: 700,
                borderRadius: 10,
              }}
            >
              <Check size={16} /> Insert Drawing into Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
