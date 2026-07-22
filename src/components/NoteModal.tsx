'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, ArrowLeft } from 'lucide-react';
import { Note } from '@/types/note';

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>) => void;
  initialData?: Note;
}

const COLORS = [
  { value: 'default', label: 'Default', hex: 'var(--bg-card)' },
  { value: 'red', label: 'Red', hex: '#fff5f5' },
  { value: 'blue', label: 'Blue', hex: '#f0f9ff' },
  { value: 'green', label: 'Green', hex: '#f0fdf4' },
  { value: 'yellow', label: 'Yellow', hex: '#fffbeb' },
];

const TEXT_COLOR_MAP: Record<string, string> = {
  default: 'var(--text-primary)',
  red: '#7f1d1d',
  blue: '#1e3a8a',
  green: '#14532d',
  yellow: '#713f12',
};

export default function NoteModal({ open, onClose, onSave, initialData }: NoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('default');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || '');
        setContent(initialData.content || '');
        setColor(initialData.color || 'default');
      } else {
        setTitle('');
        setContent('');
        setColor('default');
      }
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave({ title, content, color });
    onClose();
  };

  const bgHex = COLORS.find(c => c.value === color)?.hex || 'var(--bg-card)';
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.default;
  const isDefault = color === 'default';

  return (
    <div 
      className="modal-overlay open" 
      onClick={onClose}
      style={{ 
        zIndex: 9999, 
        padding: 0,
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          margin: 0, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: bgHex,
          borderRadius: 0, 
          overflow: 'hidden',
          transition: 'background-color 0.3s ease',
          position: 'relative'
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Top Navigation Bar */}
          <div style={{ 
            padding: '16px 24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderBottom: isDefault ? '1px solid var(--border)' : `1px solid ${textColor}15`,
          }}>
            {/* Left side: Back / Close button */}
            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', 
                color: textColor, opacity: 0.6, fontSize: 15, fontWeight: 500,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
              <ArrowLeft size={20} /> Back to notes
            </button>

            {/* Right side: Colors & Save */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: c.value === 'default' ? 'var(--bg-card-hover)' : c.hex,
                      border: color === c.value ? `2px solid ${textColor}` : '2px solid transparent',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      transform: color === c.value ? 'scale(1.1)' : 'scale(1)'
                    }}
                    title={c.label}
                  />
                ))}
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!content.trim()}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, 
                  padding: '8px 20px', borderRadius: 20, fontSize: 14, fontWeight: 600
                }}
              >
                <Save size={16} /> Save Note
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div style={{ 
            flex: 1, display: 'flex', flexDirection: 'column', 
            padding: '40px 60px', gap: 16, overflowY: 'auto' 
          }}>
            <input 
              ref={titleRef}
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Untitled" 
              style={{
                fontSize: 48, 
                fontWeight: 800, 
                border: 'none', 
                background: 'transparent',
                outline: 'none', 
                color: textColor, 
                width: '100%',
                padding: 0,
                letterSpacing: '-1px'
              }}
            />
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Start writing..."
              style={{
                flex: 1, 
                fontSize: 18, 
                lineHeight: 1.8, 
                border: 'none', 
                background: 'transparent',
                outline: 'none', 
                color: textColor, 
                resize: 'none', 
                width: '100%',
                fontFamily: 'inherit',
                padding: 0,
                opacity: 0.85
              }}
              required
            />
          </div>
        </form>
      </div>
    </div>
  );
}
