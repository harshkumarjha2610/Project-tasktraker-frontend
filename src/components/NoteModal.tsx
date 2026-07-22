'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, ArrowLeft, Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Maximize2, Minimize2, Highlighter, Plus, Trash2 } from 'lucide-react';
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
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
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
  onSave: (note: Partial<Note>) => void;
  initialData?: Note;
}

interface NoteTab {
  id: string;
  name: string;
  content: string;
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

// Toolbar Component for TipTap
const MenuBar = ({ editor, color }: { editor: any, color: string }) => {
  if (!editor) return null;

  const btnStyle = (isActive: boolean) => ({
    background: isActive ? `${color}20` : 'transparent',
    color: isActive ? color : `${color}99`,
    border: 'none',
    borderRadius: 4,
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  });

  const handleIncreaseFont = () => {
    const currentSize = editor.getAttributes('textStyle').fontSize;
    const sizeNum = currentSize ? parseInt(currentSize, 10) : 18;
    editor.chain().focus().setFontSize(`${sizeNum + 2}px`).run();
  };

  const handleDecreaseFont = () => {
    const currentSize = editor.getAttributes('textStyle').fontSize;
    const sizeNum = currentSize ? parseInt(currentSize, 10) : 18;
    editor.chain().focus().setFontSize(`${Math.max(10, sizeNum - 2)}px`).run();
  };

  return (
    <div style={{ display: 'flex', gap: 2, padding: '4px 60px', backgroundColor: 'rgba(255,255,255,0.02)', overflowX: 'auto', flexShrink: 0 }}>
      <button type="button" onClick={handleDecreaseFont} style={{...btnStyle(false), fontWeight: 700, fontSize: 13, width: 24}} title="Decrease font size">A-</button>
      <button type="button" onClick={handleIncreaseFont} style={{...btnStyle(false), fontWeight: 700, fontSize: 15, width: 24}} title="Increase font size">A+</button>
      <div style={{ width: 1, background: `${color}20`, margin: '0 6px' }} />
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} style={btnStyle(editor.isActive('bold'))}><Bold size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} style={btnStyle(editor.isActive('italic'))}><Italic size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} style={btnStyle(editor.isActive('strike'))}><Strikethrough size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} style={btnStyle(editor.isActive('highlight'))}><Highlighter size={16} /></button>
      <div style={{ width: 1, background: `${color}20`, margin: '0 6px' }} />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} style={btnStyle(editor.isActive('heading', { level: 1 }))}><Heading1 size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} style={btnStyle(editor.isActive('heading', { level: 2 }))}><Heading2 size={16} /></button>
      <div style={{ width: 1, background: `${color}20`, margin: '0 6px' }} />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} style={btnStyle(editor.isActive('bulletList'))}><List size={16} /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={btnStyle(editor.isActive('orderedList'))}><ListOrdered size={16} /></button>
    </div>
  );
};

export default function NoteModal({ open, onClose, onSave, initialData }: NoteModalProps) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('default');
  const [isMaximized, setIsMaximized] = useState(false);
  const [tabs, setTabs] = useState<NoteTab[]>([{ id: '1', name: 'Main', content: '' }]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  
  const titleRef = useRef<HTMLInputElement>(null);
  const tabInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Highlight, TextStyle, FontSize, TabIndent],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || '');
        setColor(initialData.color || 'default');
        
        // Parse tabs from content if it's JSON, else treat as a single tab
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
        setTitle('');
        setColor('default');
        setTabs([{ id: '1', name: 'Main', content: '' }]);
        setActiveTabId('1');
        editor?.commands.setContent('');
      }
      setIsMaximized(false);
      setEditingTabId(null);
      setTimeout(() => titleRef.current?.focus(), 100);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save current editor content to active tab
    const currentContent = editor?.getHTML() || '';
    const updatedTabs = tabs.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
    
    // Serialize tabs
    const serializedContent = JSON.stringify(updatedTabs);
    onSave({ title, content: serializedContent, color });
    onClose();
  };

  const handleTabChange = (newTabId: string) => {
    if (newTabId === activeTabId) return;
    
    const currentContent = editor?.getHTML() || '';
    
    setTabs(prev => {
      const updated = prev.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
      const nextTab = updated.find(t => t.id === newTabId);
      editor?.commands.setContent(nextTab?.content || '');
      return updated;
    });
    
    setActiveTabId(newTabId);
  };

  const handleAddTab = () => {
    const currentContent = editor?.getHTML() || '';
    const newId = Date.now().toString();
    const newTab = { id: newId, name: `Section ${tabs.length + 1}`, content: '' };
    
    setTabs(prev => {
      const updated = prev.map(t => t.id === activeTabId ? { ...t, content: currentContent } : t);
      return [...updated, newTab];
    });
    
    setActiveTabId(newId);
    editor?.commands.setContent('');
  };

  const handleDeleteTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
      editor?.commands.setContent(newTabs[0].content);
    }
  };

  const handleRenameTab = (e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    
    const newName = tabInputRef.current?.value.trim();
    if (newName) {
      setTabs(prev => prev.map(t => t.id === editingTabId ? { ...t, name: newName } : t));
    }
    setEditingTabId(null);
  };

  const bgHex = COLORS.find(c => c.value === color)?.hex || 'var(--bg-card)';
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.default;
  const isDefault = color === 'default';
  const lineSpacing = 32;

  return (
    <div 
      className="modal-overlay open" 
      onClick={onClose}
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
          backgroundImage: color !== 'default' 
            ? `repeating-linear-gradient(transparent, transparent ${lineSpacing - 1}px, ${textColor}15 ${lineSpacing - 1}px, ${textColor}15 ${lineSpacing}px)`
            : 'none',
          backgroundPosition: `0 92px`, // Align notebook lines
          borderRadius: isMaximized ? 0 : 20, 
          boxShadow: isMaximized ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          transition: 'border-radius 0.3s ease, box-shadow 0.3s ease',
          position: 'relative',
          resize: isMaximized ? 'none' : 'both',
        }}
      >
        {/* Red Notebook Margin Line */}
        {color !== 'default' && (
          <div style={{
            position: 'absolute',
            left: '80px',
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: '#ef444430',
            zIndex: 0,
            pointerEvents: 'none'
          }} />
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
          
          {/* Top Navigation Bar */}
          <div style={{ 
            padding: '12px 24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderBottom: isDefault ? '1px solid var(--border)' : `1px solid ${textColor}15`,
            backgroundColor: bgHex,
            flexShrink: 0
          }}>
            {/* Left side: Back / Close button & Maximize */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                type="button" 
                onClick={onClose} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: textColor, opacity: 0.6, fontSize: 14, fontWeight: 500,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
              >
                <ArrowLeft size={18} /> Close
              </button>
              
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: textColor, opacity: 0.6,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                title={isMaximized ? "Restore Size" : "Maximize"}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>

            {/* Right side: Colors & Save */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, 
                  padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600
                }}
              >
                <Save size={14} /> Save Note
              </button>
            </div>
          </div>

          <MenuBar editor={editor} color={textColor} />
          
          {/* Tabs Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 60px',
            gap: 8,
            overflowX: 'auto',
            borderBottom: isDefault ? '1px solid var(--border)' : `1px solid ${textColor}15`,
            backgroundColor: 'rgba(255,255,255,0.01)',
          }}>
            {tabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                onDoubleClick={() => setEditingTabId(tab.id)}
                style={{
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  borderBottom: activeTabId === tab.id ? `2px solid ${textColor}` : '2px solid transparent',
                  color: activeTabId === tab.id ? textColor : `${textColor}80`,
                  fontWeight: activeTabId === tab.id ? 600 : 500,
                  fontSize: 14,
                  transition: 'all 0.2s',
                  userSelect: 'none'
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
                borderRadius: '50%'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
              <Plus size={16} />
            </button>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .tiptap-editor { outline: none; min-height: 100%; font-size: 18px; line-height: ${lineSpacing}px; color: ${textColor}; padding-top: 5px; cursor: text; white-space: pre-wrap; }
            .tiptap-editor p { margin: 0; }
            .tiptap-editor h1, .tiptap-editor h2 { line-height: ${lineSpacing * 2}px; margin: 0; }
            .tiptap-editor ul, .tiptap-editor ol { margin: 0; padding-left: 24px; }
            .tiptap-editor li { margin: 0; }
            .tiptap-editor mark { background-color: rgba(250, 204, 21, 0.4); color: inherit; padding: 2px 4px; border-radius: 4px; }
            .tiptap-editor p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: ${textColor}80; float: left; height: 0; pointer-events: none; }
          `}} />

          {/* Editor Area */}
          <div style={{ 
            flex: 1, display: 'flex', flexDirection: 'column', 
            padding: '20px 60px 40px 100px', gap: 16, overflowY: 'auto' 
          }}>
            <input 
              ref={titleRef}
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Note Title..." 
              style={{
                fontSize: 42, 
                fontWeight: 800, 
                border: 'none', 
                background: 'transparent',
                outline: 'none', 
                color: textColor, 
                width: '100%',
                padding: 0,
                letterSpacing: '-1px',
                flexShrink: 0
              }}
            />
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <EditorContent editor={editor} style={{ flex: 1, display: 'flex', flexDirection: 'column' }} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
