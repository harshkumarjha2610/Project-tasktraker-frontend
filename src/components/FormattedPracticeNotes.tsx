'use client';

import React, { useState } from 'react';
import { BookOpen, Quote, ChevronDown, ChevronUp } from 'lucide-react';

interface FormattedPracticeNotesProps {
  notes?: string;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * FormattedPracticeNotes - Renders practice notes with markdown-like rich formatting,
 * custom bullet lists, headings, tag callouts, and bold text highlighting.
 * Defaults to a short 3-4 line preview with a "Read more" / "Show less" expand toggle.
 */
export default function FormattedPracticeNotes({ notes, className, defaultExpanded = false }: FormattedPracticeNotesProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!notes || !notes.trim()) return null;

  const lines = notes.split('\n');
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  // Check if content exceeds 3-4 lines or ~180 chars
  const isLongContent = nonEmptyLines.length > 3 || notes.length > 180;

  // Helper to parse bold text **bold** and tags [Tag]
  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={index} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('[') && part.endsWith(']') && part.length > 2) {
        const tagText = part.slice(1, -1);
        const isGrammar = /grammar/i.test(tagText);
        const isPronun = /pronun/i.test(tagText);
        const isVocab = /vocab/i.test(tagText);
        const isTakeaway = /takeaway|key|important/i.test(tagText);

        let bg = 'rgba(139,92,246,0.15)';
        let color = '#8b5cf6';
        let border = 'rgba(139,92,246,0.3)';

        if (isGrammar) {
          bg = 'rgba(16,185,129,0.15)';
          color = '#10b981';
          border = 'rgba(16,185,129,0.3)';
        } else if (isPronun) {
          bg = 'rgba(6,186,212,0.15)';
          color = '#06b6d4';
          border = 'rgba(6,186,212,0.3)';
        } else if (isVocab) {
          bg = 'rgba(236,72,153,0.15)';
          color = '#ec4899';
          border = 'rgba(236,72,153,0.3)';
        } else if (isTakeaway) {
          bg = 'rgba(245,158,11,0.15)';
          color = '#f59e0b';
          border = 'rgba(245,158,11,0.3)';
        }

        return (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: bg,
              color: color,
              border: `1px solid ${border}`,
              marginRight: 6,
              marginLeft: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {tagText}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={className}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 16px',
        marginTop: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
          fontWeight: 700,
          color: '#8b5cf6',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          paddingBottom: 6,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={13} color="#8b5cf6" />
          Practice Notes
        </span>
        {isLongContent && (
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b5cf6',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            {isExpanded ? 'Show less' : 'Read more'}
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: isLongContent && !isExpanded ? '6.2em' : 'none',
          overflow: 'hidden',
          position: 'relative',
          transition: 'max-height 0.3s ease-in-out',
        }}
      >
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} style={{ height: 4 }} />;

          // Heading (# or ##)
          if (trimmed.startsWith('#')) {
            const level = trimmed.startsWith('##') ? 2 : 1;
            const content = trimmed.replace(/^#+\s*/, '');
            return (
              <div
                key={idx}
                style={{
                  fontSize: level === 1 ? 14 : 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginTop: idx > 0 ? 4 : 0,
                  marginBottom: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ color: '#8b5cf6' }}>#</span>
                {renderInlineFormatting(content)}
              </div>
            );
          }

          // Bullet List (- or * or •)
          if (/^[-*•]\s+/.test(trimmed)) {
            const content = trimmed.replace(/^[-*•]\s+/, '');
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  paddingLeft: 4,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#8b5cf6',
                    marginTop: 7,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>{renderInlineFormatting(content)}</div>
              </div>
            );
          }

          // Numbered List (1. 2.)
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            const num = numMatch[1];
            const content = numMatch[2];
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  paddingLeft: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#8b5cf6',
                    background: 'rgba(139,92,246,0.15)',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {num}
                </span>
                <div style={{ flex: 1 }}>{renderInlineFormatting(content)}</div>
              </div>
            );
          }

          // Blockquote (>)
          if (trimmed.startsWith('>')) {
            const content = trimmed.replace(/^>\s*/, '');
            return (
              <div
                key={idx}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(139,92,246,0.08)',
                  borderLeft: '3px solid #8b5cf6',
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Quote size={13} color="#8b5cf6" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>{renderInlineFormatting(content)}</div>
              </div>
            );
          }

          // Regular paragraph line
          return (
            <p
              key={idx}
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {renderInlineFormatting(trimmed)}
            </p>
          );
        })}

        {/* Gradient fade overlay when collapsed */}
        {isLongContent && !isExpanded && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 28,
              background: 'linear-gradient(to bottom, transparent, rgba(20, 20, 30, 0.95))',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Bottom Read More button bar */}
      {isLongContent && (
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          style={{
            marginTop: 4,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#8b5cf6',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: 'fit-content',
            transition: 'all 0.2s ease',
          }}
        >
          {isExpanded ? (
            <>Show less <ChevronUp size={14} /></>
          ) : (
            <>Read more <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}
