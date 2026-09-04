'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, ArrowLeft, Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Maximize2, Minimize2, Highlighter, Plus, Trash2, Check, Loader2, ChevronDown } from 'lucide-react';
import { Note } from '@/types/note';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';

// Custom extension for font size
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }: any) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }: any) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// Custom extension to allow inserting tabs/spaces with the Tab key
const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        return this.editor.commands.insertContent('    '); // Insert 4 spaces
      },
    };
  },
});

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (note: Partial<Note>, noteId?: string) => Promise<Note | undefined>;
  initialData?: Note;
}

interface NoteTab {
  id: string;
  name: string;
  content: string;
}

const COLORS = [
  { value: 'paper', label: 'Paper Notebook', hex: '#fcfaf2', accent: '#d97706' },
  { value: 'white', label: 'Pure White', hex: '#ffffff', accent: '#475569' },
  { value: 'dark', label: 'Dark Midnight', hex: '#14141e', accent: '#8b5cf6' },
  { value: 'red', label: 'Red', hex: '#251216', accent: '#ef4444' },
  { value: 'blue', label: 'Blue', hex: '#0f1a2e', accent: '#3b82f6' },
  { value: 'green', label: 'Green', hex: '#0d2218', accent: '#10b981' },
  { value: 'yellow', label: 'Yellow', hex: '#261b0c', accent: '#f59e0b' },
];

const TEXT_COLOR_MAP: Record<string, string> = {
  paper: '#1a1a24',
  white: '#0f172a',
  dark: '#ffffff',
  default: '#1a1a24',
  red: '#ffffff',
  blue: '#ffffff',
  green: '#ffffff',
  yellow: '#ffffff',
};

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Purple', color: '#e9d5ff' },
  { name: 'Orange', color: '#fed7aa' },
];

// Toolbar Component for TipTap
const MenuBar = ({ editor, color }: { editor: any, color: string }) => {
  const [activeHighlightColor, setActiveHighlightColor] = useState('#fef08a');
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowHighlightPicker(false);
      }
    };
    if (showHighlightPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHighlightPicker]);

  const applyHighlight = (hexColor: string) => {
    setActiveHighlightColor(hexColor);
    editor.chain().focus().setHighlight({ color: hexColor }).run();
  };

  const removeHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
  };

  const btnStyle = (isActive: boolean) => ({
    background: isActive ? `${color}20` : 'transparent',
    color: isActive ? color : `${color}99`,
    border: 'none',
    borderRadius: 6,
    padding: '6px 8px',
    minWidth: 32,
    height: 32,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0,
  });

  const handleIncreaseFont = () => {
    const currentSize = editor.getAttributes('textStyle').fontSize;
    const sizeNum = currentSize ? parseInt(currentSize, 10) : 16;
    editor.chain().focus().setFontSize(`${sizeNum + 2}px`).run();
  };

  const handleDecreaseFont = () => {
    const currentSize = editor.getAttributes('textStyle').fontSize;
    const sizeNum = currentSize ? parseInt(currentSize, 10) : 16;
    editor.chain().focus().setFontSize(`${Math.max(10, sizeNum - 2)}px`).run();
  };

  return (
    <div 
      className="note-toolbar"
      style={{ 
        display: 'flex', 
        gap: 6, 
        padding: '6px 16px', 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        overflowX: 'auto', 
        flexShrink: 0,
        WebkitOverflowScrolling: 'touch',
        borderBottom: `1px solid ${color}10`,
        alignItems: 'center'
      }}
    >
      <button type="button" onClick={handleDecreaseFont} style={{...btnStyle(false), fontWeight: 700, fontSize: 13}} title="Decrease font size">A-</button>
      <button type="button" onClick={handleIncreaseFont} style={{...btnStyle(false), fontWeight: 700, fontSize: 15}} title="Increase font size">A+</button>
      <div style={{ width: 1, height: 20, background: `${color}20`, margin: '0 2px', flexShrink: 0 }} />
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))}><Bold size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))}><Italic size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))}><Strikethrough size={16} /></button>
      
      <div style={{ width: 1, height: 20, background: `${color}20`, margin: '0 2px', flexShrink: 0 }} />

      {/* Multi-Color Highlighter Bar with Direct Color Swatches */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '3px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}15` }}>
        <button
          type="button"
          onClick={() => {
            if (editor.isActive('highlight')) {
              editor.chain().focus().unsetHighlight().run();
            } else {
              editor.chain().focus().setHighlight({ color: activeHighlightColor }).run();
            }
          }}
          style={{
            ...btnStyle(editor.isActive('highlight')),
            gap: 5,
            padding: '3px 8px',
            height: 26,
            fontSize: 12,
            fontWeight: 600
          }}
          title="Toggle Active Highlighter"
        >
          <Highlighter size={15} />
        </button>

        <div style={{ width: 1, height: 16, background: `${color}20`, margin: '0 2px' }} />

        {/* 6 Direct Color Swatch Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {HIGHLIGHT_COLORS.map(c => {
            const isCurrentActiveColor = activeHighlightColor === c.color;
            return (
              <button
                key={c.color}
                type="button"
                onClick={() => applyHighlight(c.color)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: c.color,
                  border: isCurrentActiveColor ? '2px solid var(--accent)' : '1px solid rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  transform: isCurrentActiveColor ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: isCurrentActiveColor ? `0 0 8px ${c.color}` : 'none',
                  flexShrink: 0
                }}
                title={`Highlight text in ${c.name}`}
              />
            );
          })}

          <button
            type="button"
            onClick={removeHighlight}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 4,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap'
            }}
            title="Remove Highlight from selected text"
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ width: 1, background: `${color}20`, margin: '0 4px', flexShrink: 0 }} />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={btnStyle(editor.isActive('heading', { level: 1 }))}><Heading1 size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btnStyle(editor.isActive('heading', { level: 2 }))}><Heading2 size={16} /></button>
      <div style={{ width: 1, background: `${color}20`, margin: '0 4px', flexShrink: 0 }} />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))}><List size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))}><ListOrdered size={16} /></button>
    </div>
  );
};

export default function NoteModal({ open, onClose, onSave, initialData }: NoteModalProps) {
  const [color, setColor] = useState('paper');
  const [isMaximized, setIsMaximized] = useState(false);
  const [tabs, setTabs] = useState<NoteTab[]>([{ id: '1', name: 'Main', content: '' }]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);

  const [currentNoteId, setCurrentNoteId] = useState<string | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');

  const tabInputRef = useRef<HTMLInputElement>(null);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(true);

  // Keep a fresh state ref to prevent stale closures during debounced auto-save
  const latestStateRef = useRef({
    color,
    tabs,
    activeTabId,
    currentNoteId,
  });

  useEffect(() => {
    latestStateRef.current = { color, tabs, activeTabId, currentNoteId };
  }, [color, tabs, activeTabId, currentNoteId]);

  const performSave = async (overrides?: { color?: string; tabs?: NoteTab[]; activeTabId?: string; editorHtml?: string }) => {
    if (isInitializingRef.current) return;

    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

    const state = latestStateRef.current;
    const effColor = overrides?.color !== undefined ? overrides.color : state.color;
    const effTabs = overrides?.tabs !== undefined ? overrides.tabs : state.tabs;
    const effActiveTabId = overrides?.activeTabId !== undefined ? overrides.activeTabId : state.activeTabId;
    const effEditorHtml = overrides?.editorHtml !== undefined ? overrides.editorHtml : (editor?.getHTML() || '');

    const updatedTabs = effTabs.map(t => t.id === effActiveTabId ? { ...t, content: effEditorHtml } : t);
    const serializedContent = JSON.stringify(updatedTabs);
    const targetId = state.currentNoteId;

    try {
      const result = await onSave({ title: '', content: serializedContent, color: effColor }, targetId);
      if (result && result.id && !state.currentNoteId) {
        setCurrentNoteId(result.id);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        performSave();
      }
    }
  };

  const triggerAutoSave = (overrides?: { color?: string; tabs?: NoteTab[]; activeTabId?: string; editorHtml?: string }) => {
    if (isInitializingRef.current) return;
    setSaveStatus('unsaved');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      performSave(overrides);
    }, 400);
  };

  const editor = useEditor({
    extensions: [StarterKit, Highlight.configure({ multicolor: true }), TextStyle, FontSize, TabIndent],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate({ editor: ed }) {
      if (!isInitializingRef.current) {
        triggerAutoSave({ editorHtml: ed.getHTML() });
      }
    },
  });

  useEffect(() => {
    if (open) {
      isInitializingRef.current = true;
      setCurrentNoteId(initialData?.id);
      
      if (initialData) {
        setColor(initialData.color && initialData.color !== 'default' ? initialData.color : 'paper');
        
        try {
          const parsed = JSON.parse(initialData.content || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTabs(parsed);
            setActiveTabId(parsed[0].id);
            editor?.commands.setContent(parsed[0].content || '');
          } else {
            throw new Error("Not a tab array");
          }
        } catch (e) {
          const singleTab = { id: '1', name: 'Main', content: initialData.content || '' };
          setTabs([singleTab]);
          setActiveTabId('1');
          editor?.commands.setContent(initialData.content || '');
        }
      } else {
        setColor('paper');
        setTabs([{ id: '1', name: 'Main', content: '' }]);
        setActiveTabId('1');
        editor?.commands.setContent('');
      }
      
      setIsMaximized(false);
      setEditingTabId(null);
      setSaveStatus('saved');

      const initTimer = setTimeout(() => {
        isInitializingRef.current = false;
        editor?.commands.focus('start');
      }, 120);

      return () => clearTimeout(initTimer);
    }
  }, [open, initialData, editor]);

  // Focus the tab input when renaming
  useEffect(() => {
    if (editingTabId) {
      setTimeout(() => {
        tabInputRef.current?.focus();
        tabInputRef.current?.select();
      }, 50);
    }
  }, [editingTabId]);

  if (!open) return null;

  const handleCloseModal = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    // Save any pending changes before closing modal
    const currentContent = editor?.getHTML() || '';
    const currentTabs = tabs.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
    const hasContent = currentTabs.some(t => t.content && t.content !== '<p></p>');

    if (hasContent || currentNoteId) {
      await performSave({ editorHtml: currentContent, tabs: currentTabs });
    }
    
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    await performSave();
    onClose();
  };

  const handleTabChange = (newTabId: string) => {
    if (newTabId === activeTabId) return;
    
    const currentContent = editor?.getHTML() || '';
    const updatedTabs = tabs.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
    setTabs(updatedTabs);
    
    const nextTab = updatedTabs.find(t => t.id === newTabId);
    editor?.commands.setContent(nextTab?.content || '');
    setActiveTabId(newTabId);

    triggerAutoSave({ tabs: updatedTabs, activeTabId: newTabId, editorHtml: nextTab?.content || '' });
  };

  const handleAddTab = () => {
    const currentContent = editor?.getHTML() || '';
    const newId = Date.now().toString();
    const newTab = { id: newId, name: `Section ${tabs.length + 1}`, content: '' };
    
    const updatedTabs = tabs.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
    const newTabsList = [...updatedTabs, newTab];
    
    setTabs(newTabsList);
    setActiveTabId(newId);
    editor?.commands.setContent('');

    triggerAutoSave({ tabs: newTabsList, activeTabId: newId, editorHtml: '' });
  };

  const handleDeleteTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    
    let nextActiveId = activeTabId;
    let nextContent = editor?.getHTML() || '';

    if (activeTabId === id) {
      nextActiveId = newTabs[0].id;
      nextContent = newTabs[0].content;
      setActiveTabId(nextActiveId);
      editor?.commands.setContent(nextContent);
    }

    triggerAutoSave({ tabs: newTabs, activeTabId: nextActiveId, editorHtml: nextContent });
  };

  const handleRenameTab = (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    const newName = tabInputRef.current?.value.trim();
    if (newName) {
      const updated = tabs.map(t => t.id === editingTabId ? { ...t, name: newName } : t);
      setTabs(updated);
      triggerAutoSave({ tabs: updated });
    }
    setEditingTabId(null);
  };

  const handleColorSelect = (newColor: string) => {
    setColor(newColor);
    triggerAutoSave({ color: newColor });
  };

  const bgHex = COLORS.find(c => c.value === color)?.hex || 'var(--bg-card)';
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.default;
  const isDefault = color === 'default';

  return (
    <div 
      className="modal-overlay open note-modal-overlay" 
      onClick={handleCloseModal}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999, 
        padding: isMaximized ? 0 : '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div 
        className="note-modal-container"
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: isMaximized ? '100vw' : '80vw', 
          height: isMaximized ? '100vh' : '80vh',
          minWidth: 500,
          minHeight: 400,
          margin: 0, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: bgHex,
          borderRadius: isMaximized ? 0 : 20, 
          boxShadow: isMaximized ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          transition: 'border-radius 0.3s ease, box-shadow 0.3s ease',
          position: 'relative',
          resize: isMaximized ? 'none' : 'both',
        }}
      >

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
          
          {/* Top Navigation Bar */}
          <div 
            className="note-modal-header"
            style={{ 
              padding: '12px 20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: isDefault ? '1px solid var(--border)' : `1px solid ${textColor}15`,
              backgroundColor: bgHex,
              flexShrink: 0,
              gap: 8,
              flexWrap: 'wrap'
            }}
          >
            {/* Left side: Back / Close button, Auto-save status, & Maximize */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={handleCloseModal} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: textColor, opacity: 0.8, fontSize: 14, fontWeight: 500,
                  transition: 'opacity 0.2s',
                  padding: '4px 0'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
              >
                <ArrowLeft size={18} /> Close
              </button>
              
              <button
                type="button"
                className="hide-on-mobile"
                onClick={() => setIsMaximized(!isMaximized)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: textColor, opacity: 0.8,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                title={isMaximized ? "Restore Size" : "Maximize"}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Auto-Save Status Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 12,
                backgroundColor: `${textColor}0D`,
                fontSize: 12,
                fontWeight: 500,
                color: textColor,
                userSelect: 'none'
              }}>
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 size={13} className="spin" style={{ color: '#3b82f6' }} />
                    <span style={{ color: '#3b82f6' }}>Auto-saving...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check size={13} style={{ color: '#10b981' }} />
                    <span style={{ color: '#10b981' }}>Saved</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ color: '#f59e0b' }}>Unsaved</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <span style={{ color: '#ef4444' }}>Save failed</span>
                )}
              </div>
            </div>

            {/* Right side: Colors & Save */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginLeft: 'auto' }}>
              <div 
                className="note-colors-bar"
                style={{ 
                  display: 'flex', 
                  gap: 6, 
                  alignItems: 'center',
                  overflowX: 'auto',
                  maxHeight: 32,
                  padding: '2px 0',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleColorSelect(c.value)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: c.accent,
                      border: color === c.value ? `2px solid ${textColor}` : '2px solid transparent',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      transform: color === c.value ? 'scale(1.15)' : 'scale(1)',
                      flexShrink: 0
                    }}
                    title={c.label}
                  />
                ))}
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, 
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  flexShrink: 0
                }}
              >
                <Save size={14} /> Done
              </button>
            </div>
          </div>

          <MenuBar editor={editor} color={textColor} />
          
          {/* Tabs Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 8,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            borderBottom: isDefault ? '1px solid var(--border)' : `1px solid ${textColor}15`,
            backgroundColor: 'rgba(255,255,255,0.01)',
          }}>
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                onDoubleClick={() => setEditingTabId(tab.id)}
                style={{
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  borderBottom: activeTabId === tab.id ? `2px solid ${textColor}` : '2px solid transparent',
                  color: activeTabId === tab.id ? textColor : `${textColor}80`,
                  fontWeight: activeTabId === tab.id ? 600 : 500,
                  fontSize: 14,
                  transition: 'all 0.2s',
                  userSelect: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {editingTabId === tab.id ? (
                  <input
                    ref={tabInputRef}
                    defaultValue={tab.name}
                    onBlur={handleRenameTab}
                    onKeyDown={handleRenameTab}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      width: 80,
                      padding: 0
                    }}
                  />
                ) : (
                  <span>{tab.name}</span>
                )}
                {tabs.length > 1 && activeTabId === tab.id && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTab(e, tab.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'inherit', opacity: 0.5, padding: 0, display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddTab}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer',
                color: textColor, opacity: 0.6, padding: '8px',
                borderRadius: '50%', flexShrink: 0
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
              <Plus size={16} />
            </button>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .note-editor-container, .tiptap-editor, .tiptap-editor *, .note-modal-container input, .note-modal-container textarea, .note-modal-container [contenteditable] { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M7 4h10M7 20h10M12 4v16' stroke='%23ffffff' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M7 4h10M7 20h10M12 4v16' stroke='%230f172a' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, text !important; }
            .tiptap-editor { outline: none; min-height: 100%; font-size: 16px; line-height: 32px; color: ${textColor} !important; caret-color: ${textColor} !important; white-space: pre-wrap; }
            .note-modal-container input, .note-modal-container textarea, .note-modal-container [contenteditable] { color: ${textColor}; caret-color: ${textColor} !important; }
            .tiptap-editor p { margin: 0; line-height: 32px; min-height: 32px; color: ${textColor} !important; caret-color: ${textColor} !important; }
            .tiptap-editor h1 { margin: 0; font-size: 22px; line-height: 32px; font-weight: 700; color: ${textColor} !important; caret-color: ${textColor} !important; }
            .tiptap-editor h2 { margin: 0; font-size: 18px; line-height: 32px; font-weight: 700; color: ${textColor} !important; caret-color: ${textColor} !important; }
            .tiptap-editor ul, .tiptap-editor ol { margin: 0; padding-left: 24px; line-height: 32px; color: ${textColor} !important; }
            .tiptap-editor li { margin: 0; line-height: 32px; color: ${textColor} !important; caret-color: ${textColor} !important; }
            .tiptap-editor mark { color: #0f172a !important; padding: 2px 5px; border-radius: 4px; font-weight: 500; }
            .tiptap-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: ${textColor}60; float: left; height: 32px; line-height: 32px; pointer-events: none; }

            @media (max-width: 640px) {
              .note-modal-overlay {
                padding: 0 !important;
              }
              .note-modal-container {
                width: 100vw !important;
                height: 100vh !important;
                min-width: 100% !important;
                min-height: 100% !important;
                border-radius: 0 !important;
                resize: none !important;
              }
              .hide-on-mobile {
                display: none !important;
              }
              .note-modal-header {
                padding: 10px 14px !important;
              }
              .note-colors-bar {
                max-width: 130px;
              }
              .note-editor-container {
                padding: 4px 16px 24px 44px !important;
                background-image: ${color === 'paper' 
                  ? `linear-gradient(to right, transparent 24px, #ef4444cc 24px, #ef4444cc 25.5px, transparent 25.5px),
                     linear-gradient(to right, transparent 28px, #ef4444cc 28px, #ef4444cc 29.5px, transparent 29.5px),
                     repeating-linear-gradient(transparent, transparent 31px, rgba(59, 130, 246, 0.2) 31px, rgba(59, 130, 246, 0.2) 32px)`
                  : 'none'} !important;
              }
            }
          `}} />

          {/* Editor Area */}
          <div 
            className="note-editor-container"
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              position: 'relative',
              padding: color === 'paper' ? '4px 32px 32px 92px' : '24px 32px 32px 32px', 
              overflowY: 'auto',
              backgroundImage: color === 'paper' 
                ? `linear-gradient(to right, transparent 67px, #ef4444cc 67px, #ef4444cc 68.5px, transparent 68.5px),
                   linear-gradient(to right, transparent 72px, #ef4444cc 72px, #ef4444cc 73.5px, transparent 73.5px),
                   repeating-linear-gradient(transparent, transparent 31px, rgba(59, 130, 246, 0.2) 31px, rgba(59, 130, 246, 0.2) 32px)`
                : 'none',
              backgroundPosition: '0 0',
              backgroundAttachment: 'local',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
              <EditorContent editor={editor} style={{ flex: 1, display: 'flex', flexDirection: 'column' }} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
