'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Note } from '@/types/note';
import { getNotes, createNote, updateNote, deleteNote } from '@/lib/api';
import NoteCard from '@/components/NoteCard';
import NoteModal from '@/components/NoteModal';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filteredNotes = notes.filter(n =>
    (n.title && n.title.toLowerCase().includes(search.toLowerCase())) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>Notes</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Jot down your thoughts, ideas, and reminders.</p>
        </div>

        <button className="btn btn-primary" onClick={openNewNote}>
          <Plus size={18} /> New Note
        </button>
      </header>

      {/* Search */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={32} className="spin" color="var(--accent)" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            {search ? 'No notes found matching your search.' : 'You have no notes yet.'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={openNewNote}>
              Create your first note
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          alignItems: 'start' // enables masonry-like staggered heights in grid
        }}>
          {filteredNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={openEditNote}
              onDelete={handleDeleteNote}
            />
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
