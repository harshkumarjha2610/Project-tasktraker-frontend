'use client';

import { useState } from 'react';
import { Note } from '@/types/note';
import { Trash2, Layers, Calendar, FileText, Check, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { parseNoteContent, stripHtml } from '@/lib/noteUtils';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

// Themes mapping including Paper (Default) & Pure White
const COLOR_THEMES: Record<string, { accent: string; bg: string; border: string; text: string; subtext: string; badgeBg: string }> = {
  default: {
    accent: '#d97706',
    bg: '#fcfaf2',
    border: '#e6ded0',
    text: '#1a1a24',
    subtext: '#4a4a5a',
    badgeBg: '#f3ebd4',
  },
  paper: {
    accent: '#d97706',
    bg: '#fcfaf2',
    border: '#e6ded0',
    text: '#1a1a24',
    subtext: '#4a4a5a',
    badgeBg: '#f3ebd4',
  },
  white: {
    accent: '#475569',
    bg: '#ffffff',
    border: '#cbd5e1',
    text: '#0f172a',
    subtext: '#475569',
    badgeBg: '#f1f5f9',
  },
  dark: {
    accent: '#8b5cf6',
    bg: '#14141e',
    border: '#252536',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#231f3d',
  },
  red: {
    accent: '#ef4444',
    bg: '#251216',
    border: '#4a1b24',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#3d171f',
  },
  blue: {
    accent: '#3b82f6',
    bg: '#0f1a2e',
    border: '#1a2d4f',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#152442',
  },
  green: {
    accent: '#10b981',
    bg: '#0d2218',
    border: '#16422f',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#123626',
  },
  yellow: {
    accent: '#f59e0b',
    bg: '#261b0c',
    border: '#4a3314',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#3c290f',
  },
};

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const { tabs } = parseNoteContent(note.content);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const cardColor = note.color || 'paper';
  const theme = COLOR_THEMES[cardColor] || COLOR_THEMES.paper;
  const isPaper = cardColor === 'paper' || cardColor === 'default';
  const isLight = isPaper || cardColor === 'white';
  const activeTab = tabs[activeTabIdx] || tabs[0];
  const activeText = activeTab ? stripHtml(activeTab.content) : '';
  const legacyTitle = note.title && note.title.trim();

  // Calculate word count for active tab or total note
  const totalWords = tabs.reduce((acc, tab) => {
    const txt = stripHtml(tab.content);
    return acc + (txt ? txt.trim().split(/\s+/).length : 0);
  }, 0);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeText) return;
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={() => onEdit(note)}
      style={{
        background: theme.bg,
        color: theme.text,
        borderRadius: '16px',
        border: `1px solid ${theme.border}`,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: isPaper ? '18px 18px 18px 34px' : '18px',
        minHeight: '190px',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: isLight ? '0 4px 14px rgba(0, 0, 0, 0.08)' : '0 6px 16px rgba(0, 0, 0, 0.35)',
        transition: 'all 0.22s ease-in-out',
        backgroundImage: isPaper
          ? 'repeating-linear-gradient(transparent, transparent 31px, rgba(59, 130, 246, 0.12) 31px, rgba(59, 130, 246, 0.12) 32px)'
          : 'none',
        backgroundPosition: '0 48px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = isLight
          ? '0 8px 24px rgba(0, 0, 0, 0.12)'
          : `0 12px 24px rgba(0, 0, 0, 0.5), 0 0 12px ${theme.accent}30`;
        e.currentTarget.style.borderColor = `${theme.accent}80`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isLight ? '0 4px 14px rgba(0, 0, 0, 0.08)' : '0 6px 16px rgba(0, 0, 0, 0.35)';
        e.currentTarget.style.borderColor = theme.border;
      }}
    >
      {/* Top Accent Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: theme.accent,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}
      />

      {/* Double Notebook Paper Left Margin Lines */}
      {isPaper && (
        <>
          <div
            style={{
              position: 'absolute',
              left: '24px',
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: '#ef4444aa',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '28px',
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: '#ef4444aa',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* Header bar with tabs & actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {/* Multi-Tab Pills */}
        {tabs.length > 1 ? (
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabIdx(idx)}
                style={{
                  fontSize: '11px',
                  fontWeight: activeTabIdx === idx ? 600 : 500,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: activeTabIdx === idx ? theme.accent : isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                  color: activeTabIdx === idx ? '#ffffff' : isLight ? '#444455' : '#aaaaaa',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={handleCopy}
            title="Copy Note Text"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: copied ? 'var(--accent-4)' : isLight ? '#888899' : '#8888aa',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = copied ? 'var(--accent-4)' : isLight ? '#888899' : '#8888aa';
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            title="Delete Note"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isLight ? '#888899' : '#8888aa',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = isLight ? '#888899' : '#8888aa';
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div style={{ flex: 1, position: 'relative', marginBottom: 14 }}>
        {legacyTitle ? (
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              margin: '0 0 6px 0',
              color: theme.text,
              lineHeight: 1.3,
            }}
          >
            {legacyTitle}
          </h3>
        ) : null}

        {activeText ? (
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: 1.6,
              color: theme.subtext,
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: legacyTitle ? 4 : 6,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {activeText}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontStyle: 'italic',
              color: isLight ? '#888899' : '#777799',
            }}
          >
            Empty note content...
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '10px',
          borderTop: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: isLight ? '#666677' : '#8888aa',
          fontWeight: 500,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={13} style={{ color: theme.accent }} />
          {format(new Date(note.updatedAt || note.createdAt), 'MMM d, yyyy')}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tabs.length > 1 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: theme.badgeBg,
                color: theme.accent,
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <Layers size={11} /> {tabs.length} tabs
            </span>
          )}

          {totalWords > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={12} /> {totalWords} words
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
