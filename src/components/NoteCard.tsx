'use client';

import { Note } from '@/types/note';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  default: 'var(--bg-card)',
  red: '#fef2f2',
  blue: '#eff6ff',
  green: '#f0fdf4',
  yellow: '#fefce8',
};

const BORDER_MAP: Record<string, string> = {
  default: 'var(--border)',
  red: '#fecaca',
  blue: '#bfdbfe',
  green: '#bbf7d0',
  yellow: '#fef08a',
};

const TEXT_COLOR_MAP: Record<string, string> = {
  default: 'var(--text-primary)',
  red: '#7f1d1d',
  blue: '#1e3a8a',
  green: '#14532d',
  yellow: '#713f12',
};

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const bg = COLOR_MAP[note.color] || COLOR_MAP.default;
  const border = BORDER_MAP[note.color] || BORDER_MAP.default;
  const color = TEXT_COLOR_MAP[note.color] || TEXT_COLOR_MAP.default;
  
  return (
    <div 
      className="card" 
      onClick={() => onEdit(note)}
      style={{ 
        background: bg, 
        color: color, 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid ${border}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        cursor: 'pointer',
        padding: '20px',
        minHeight: '200px',
        borderRadius: '12px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, wordBreak: 'break-word', color: color, lineHeight: 1.3 }}>
          {note.title || 'Untitled Note'}
        </h3>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: '#ef4444', 
            opacity: 0.6,
            padding: '4px',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          title="Delete Note"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      <p style={{ 
        margin: 0, 
        fontSize: 15, 
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap', 
        wordBreak: 'break-word', 
        flex: 1,
        color: color,
        opacity: 0.85,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 6,
        WebkitBoxOrient: 'vertical',
      }}>
        {note.content}
      </p>
      
      <div style={{ marginTop: 20, fontSize: 12, fontWeight: 500, color: color, opacity: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{format(new Date(note.updatedAt || note.createdAt), 'MMM d, yyyy')}</span>
      </div>
    </div>
  );
}
