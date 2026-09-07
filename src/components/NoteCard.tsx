'use client';

import { useState } from 'react';
import { Note } from '@/types/note';
import { Trash2, Layers, Calendar, FileText, Check, Copy, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { parseNoteContent, stripHtml, extractImagesFromContent } from '@/lib/noteUtils';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

// Themes mapping including Paper (Default) & Pure White with Notebook line rules
const COLOR_THEMES: Record<string, { accent: string; bg: string; border: string; text: string; subtext: string; badgeBg: string; lineRule: string }> = {
  default: {
    accent: '#d97706',
    bg: '#fcfaf2',
    border: '#e6ded0',
    text: '#1a1a24',
    subtext: '#4a4a5a',
    badgeBg: '#f3ebd4',
    lineRule: 'rgba(59, 130, 246, 0.14)',
  },
  paper: {
    accent: '#d97706',
    bg: '#fcfaf2',
    border: '#e6ded0',
    text: '#1a1a24',
    subtext: '#4a4a5a',
    badgeBg: '#f3ebd4',
    lineRule: 'rgba(59, 130, 246, 0.14)',
  },
  white: {
    accent: '#475569',
    bg: '#ffffff',
    border: '#cbd5e1',
    text: '#0f172a',
    subtext: '#475569',
    badgeBg: '#f1f5f9',
    lineRule: 'rgba(148, 163, 184, 0.16)',
  },
  dark: {
    accent: '#8b5cf6',
    bg: '#14141e',
    border: '#252536',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#231f3d',
    lineRule: 'rgba(255, 255, 255, 0.05)',
  },
  red: {
    accent: '#ef4444',
    bg: '#251216',
    border: '#4a1b24',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#3d171f',
    lineRule: 'rgba(239, 68, 68, 0.14)',
  },
  blue: {
    accent: '#3b82f6',
    bg: '#0f1a2e',
    border: '#1a2d4f',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#152442',
    lineRule: 'rgba(59, 130, 246, 0.14)',
  },
  green: {
    accent: '#10b981',
    bg: '#0d2218',
    border: '#16422f',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#123626',
    lineRule: 'rgba(16, 185, 129, 0.14)',
  },
  yellow: {
    accent: '#f59e0b',
    bg: '#261b0c',
    border: '#4a3314',
    text: '#ffffff',
    subtext: '#cccccc',
    badgeBg: '#3c290f',
    lineRule: 'rgba(245, 158, 11, 0.14)',
  },
};

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const { tabs, images } = parseNoteContent(note.content);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const cardColor = note.color || 'paper';
  const theme = COLOR_THEMES[cardColor] || COLOR_THEMES.paper;
  const isPaper = cardColor === 'paper' || cardColor === 'default';
  const isLight = isPaper || cardColor === 'white';
  const activeTab = tabs[activeTabIdx] || tabs[0];
  const activeText = activeTab ? stripHtml(activeTab.content) : '';
  const activeTabImages = activeTab ? extractImagesFromContent(activeTab.content) : [];
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
        justifyContent: 'space-between',
        padding: '16px 16px 14px 44px',
        height: '275px', // Fixed uniform card height across all notes
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: isLight
          ? '0 6px 18px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)'
          : '0 8px 24px rgba(0, 0, 0, 0.4)',
        transition: 'all 0.22s ease-in-out',
        backgroundImage: `repeating-linear-gradient(transparent, transparent 27px, ${theme.lineRule} 27px, ${theme.lineRule} 28px)`,
        backgroundPosition: '0 44px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = isLight
          ? '0 12px 28px rgba(0, 0, 0, 0.14)'
          : `0 14px 32px rgba(0, 0, 0, 0.55), 0 0 14px ${theme.accent}40`;
        e.currentTarget.style.borderColor = `${theme.accent}90`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isLight
          ? '0 6px 18px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)'
          : '0 8px 24px rgba(0, 0, 0, 0.4)';
        e.currentTarget.style.borderColor = theme.border;
      }}
    >
      {/* Notebook Top Binding Accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5px',
          background: theme.accent,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}
      />

      {/* Washi Tape / Decorative Paper Accent */}
      <div
        style={{
          position: 'absolute',
          top: -4,
          right: 28,
          width: 44,
          height: 16,
          background: `${theme.accent}35`,
          backdropFilter: 'blur(2px)',
          borderLeft: `1px dashed ${theme.accent}60`,
          borderRight: `1px dashed ${theme.accent}60`,
          transform: 'rotate(-2deg)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Spiral Binder Loops along Left Edge */}
      <div
        style={{
          position: 'absolute',
          left: '8px',
          top: '16px',
          bottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: isLight ? '#d2cbbd' : '#09090e',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
              }}
            />
            <div
              style={{
                width: 14,
                height: 5,
                borderRadius: 3,
                background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 40%, #64748b 100%)',
                boxShadow: '0 2px 3px rgba(0,0,0,0.3)',
                marginLeft: -4,
              }}
            />
          </div>
        ))}
      </div>

      {/* Double Vertical Red Margin Lines */}
      <div
        style={{
          position: 'absolute',
          left: '32px',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: '#ef444499',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '35px',
          top: 0,
          bottom: 0,
          width: '1px',
          backgroundColor: '#ef444499',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Header bar with tabs & actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, zIndex: 3 }}>
        {/* Multi-Tab Pills */}
        {tabs.length > 1 ? (
          <div
            style={{
              display: 'flex',
              gap: 4,
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
                  padding: '2px 8px',
                  borderRadius: '10px',
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
              padding: '4px',
              borderRadius: '6px',
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
            {copied ? <Check size={15} /> : <Copy size={15} />}
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
              padding: '4px',
              borderRadius: '6px',
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
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 2 }}>
        {legacyTitle ? (
          <h3
            style={{
              fontSize: '15px',
              fontWeight: 700,
              margin: '0 0 4px 0',
              color: theme.text,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {legacyTitle}
          </h3>
        ) : null}

        {/* Thumbnail Preview for Images */}
        {activeTabImages.length > 0 && (
          <div
            style={{
              marginBottom: 6,
              borderRadius: 8,
              overflow: 'hidden',
              height: 90,
              width: '100%',
              position: 'relative',
              background: 'rgba(0, 0, 0, 0.15)',
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
              flexShrink: 0,
            }}
          >
            <img
              src={activeTabImages[0]}
              alt="Pasted Note Image"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {activeTabImages.length > 1 && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 8,
                  backdropFilter: 'blur(4px)',
                }}
              >
                +{activeTabImages.length - 1} more
              </span>
            )}
          </div>
        )}

        {activeText ? (
          <p
            style={{
              margin: 0,
              fontSize: '13.5px',
              lineHeight: 1.55,
              color: theme.subtext,
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: activeTabImages.length > 0 ? 2 : legacyTitle ? 3 : 5,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {activeText}
          </p>
        ) : activeTabImages.length > 0 ? null : (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontStyle: 'italic',
              color: isLight ? '#888899' : '#777799',
            }}
          >
            Empty notebook page...
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11.5px',
          color: isLight ? '#666677' : '#8888aa',
          fontWeight: 500,
          zIndex: 3,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Calendar size={12} style={{ color: theme.accent }} />
          {format(new Date(note.updatedAt || note.createdAt), 'MMM d, yyyy')}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {images.length > 0 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: theme.badgeBg,
                color: theme.accent,
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: 600,
              }}
              title={`${images.length} pasted images in note`}
            >
              <ImageIcon size={10} /> {images.length} {images.length === 1 ? 'img' : 'imgs'}
            </span>
          )}

          {tabs.length > 1 && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: theme.badgeBg,
                color: theme.accent,
                padding: '2px 6px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: 600,
              }}
            >
              <Layers size={10} /> {tabs.length} tabs
            </span>
          )}

          {totalWords > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <FileText size={11} /> {totalWords} w
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
