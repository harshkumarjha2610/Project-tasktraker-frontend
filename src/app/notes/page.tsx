'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, FileText, X } from 'lucide-react';
import { Note } from '@/types/note';
import { getNotes, createNote, updateNote, deleteNote } from '@/lib/api';
import NoteCard from '@/components/NoteCard';
import NoteModal from '@/components/NoteModal';
import { parseNoteContent } from '@/lib/noteUtils';

const COLOR_FILTERS = [
  { id: 'all', label: 'All Notes', color: 'var(--accent)' },
  { id: 'paper', label: 'Paper', color: '#d97706' },
  { id: 'white', label: 'Pure White', color: '#64748b' },
  { id: 'dark', label: 'Dark', color: '#8b5cf6' },
  { id: 'red', label: 'Red', color: '#ef4444' },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'green', label: 'Green', color: '#10b981' },
  { id: 'yellow', label: 'Yellow', color: '#f59e0b' },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedColor, setSelectedColor] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSaveNote = async (noteData: Partial<Note>) => {
    try {
      if (editingNote) {
        await updateNote(editingNote.id, noteData);
      } else {
        await createNote(noteData as Omit<Note, 'id' | 'createdAt' | 'updatedAt'>);
      }
      fetchNotes();
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteNote(id);
      fetchNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const openNewNote = () => {
    setEditingNote(undefined);
    setIsModalOpen(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const filteredNotes = notes.filter((n) => {
    const noteColor = n.color && n.color !== 'default' ? n.color : 'paper';
    const matchesColor = selectedColor === 'all' || noteColor === selectedColor;
    if (!matchesColor) return false;

    if (!search.trim()) return true;

    const query = search.toLowerCase();
    const titleMatch = (n.title || '').toLowerCase().includes(query);
    const { plainText, tabs } = parseNoteContent(n.content);
    const textMatch = plainText.toLowerCase().includes(query);
    const tabMatch = tabs.some((t) => t.name.toLowerCase().includes(query));

    return titleMatch || textMatch || tabMatch;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Notes
            </h1>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                background: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--accent)',
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Organize your thoughts, code snippets, and multi-tab ideas seamlessly.
          </p>
        </div>

        <button className="btn btn-primary" onClick={openNewNote} style={{ padding: '10px 20px', borderRadius: 12 }}>
          <Plus size={18} /> New Note
        </button>
      </header>

      {/* Controls Bar: Search & Color Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 440 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-muted)' }} />
            <input
              className="input"
              placeholder="Search by title, section, or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 42, paddingRight: search ? 36 : 14, borderRadius: 12, height: 42 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 2,
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
            {COLOR_FILTERS.map((f) => {
              const isActive = selectedColor === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedColor(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: isActive ? `1.5px solid ${f.color}` : '1.5px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: f.color,
                    }}
                  />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <Loader2 size={36} className="spin" color="var(--accent)" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg-card)',
            borderRadius: 16,
            border: '1px dashed var(--border)',
          }}
        >
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            {search || selectedColor !== 'all' ? 'No matching notes found' : 'No notes created yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px', fontSize: 14 }}>
            {search || selectedColor !== 'all'
              ? 'Try adjusting your search query or color filters to find what you are looking for.'
              : 'Click below to create your first note with rich text and multi-section tabs.'}
          </p>
          {!search && selectedColor === 'all' && (
            <button className="btn btn-primary" onClick={openNewNote} style={{ borderRadius: 12 }}>
              <Plus size={18} /> Create Your First Note
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={openEditNote} onDelete={handleDeleteNote} />
          ))}
        </div>
      )}

      <NoteModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
        initialData={editingNote}
      />
    </div>
  );
}
