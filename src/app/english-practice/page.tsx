'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Languages, Plus, Flame, Clock, BookOpen, Star, Trash2, Pencil,
  Search, X, CheckCircle2, Mic, Headphones, Book, FileText, Sparkles, Trophy
} from 'lucide-react';
import { EnglishPracticeLog, PracticeType, VocabularyWord } from '@/types/englishPractice';
import {
  getEnglishPracticeLogs, createEnglishPracticeLog,
  updateEnglishPracticeLog, deleteEnglishPracticeLog
} from '@/lib/api';
import { format, isSameDay, subDays } from 'date-fns';

const PRACTICE_TYPES: { type: PracticeType; label: string; icon: any; color: string }[] = [
  { type: 'speaking',   label: 'Speaking',   icon: Mic,        color: '#8b5cf6' },
  { type: 'listening',  label: 'Listening',  icon: Headphones, color: '#06b6d4' },
  { type: 'reading',    label: 'Reading',    icon: Book,       color: '#10b981' },
  { type: 'writing',    label: 'Writing',    icon: FileText,   color: '#f59e0b' },
  { type: 'vocabulary', label: 'Vocabulary', icon: BookOpen,   color: '#ec4899' },
];

export default function EnglishPracticePage() {
  const [logs, setLogs] = useState<EnglishPracticeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PracticeType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyGoalMins, setDailyGoalMins] = useState(30);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<EnglishPracticeLog | null>(null);

  // Form Fields
  const [practiceType, setPracticeType] = useState<PracticeType>('speaking');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(5);
  const [vocabList, setVocabList] = useState<VocabularyWord[]>([]);
  
  // Temp Vocab input
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [vocabExample, setVocabExample] = useState('');

  useEffect(() => {
    getEnglishPracticeLogs()
      .then(data => setLogs(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute Streak (consecutive days logged)
  const streak = useMemo(() => {
    if (logs.length === 0) return 0;
    const sortedDates = [...new Set(logs.map(l => new Date(l.date).toDateString()))]
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    const today = new Date();
    let currentStreak = 0;
    let checkDate = sortedDates[0];

    // If latest log isn't today or yesterday, streak broken
    const diffDays = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 1) return 0;

    currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      const diff = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 3600 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
    return currentStreak;
  }, [logs]);

  // Statistics
  const totalMinutes = useMemo(() => logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0), [logs]);
  const totalVocabCount = useMemo(() => logs.reduce((acc, l) => acc + (l.vocabulary?.length || 0), 0), [logs]);
  
  const todayMinutes = useMemo(() => {
    const todayStr = new Date().toDateString();
    return logs
      .filter(l => new Date(l.date).toDateString() === todayStr)
      .reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (activeTab !== 'all' && l.practiceType !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTopic = l.topic.toLowerCase().includes(q);
        const matchNotes = l.notes?.toLowerCase().includes(q);
        const matchVocab = l.vocabulary?.some(v => v.word.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q));
        return matchTopic || matchNotes || matchVocab;
      }
      return true;
    });
  }, [logs, activeTab, searchQuery]);

  const openCreateModal = () => {
    setEditingLog(null);
    setPracticeType('speaking');
    setDurationMinutes('30');
    setTopic('');
    setNotes('');
    setRating(5);
    setVocabList([]);
    setShowModal(true);
  };

  const openEditModal = (log: EnglishPracticeLog) => {
    setEditingLog(log);
    setPracticeType(log.practiceType);
    setDurationMinutes(String(log.durationMinutes));
    setTopic(log.topic);
    setNotes(log.notes || '');
    setRating(log.rating || 5);
    setVocabList(log.vocabulary || []);
    setShowModal(true);
  };

  const handleAddVocab = () => {
    if (!vocabWord.trim() || !vocabMeaning.trim()) return;
    setVocabList(prev => [...prev, { id: String(Date.now()), word: vocabWord.trim(), meaning: vocabMeaning.trim(), example: vocabExample.trim() }]);
    setVocabWord('');
    setVocabMeaning('');
    setVocabExample('');
  };

  const handleRemoveVocab = (idx: number) => {
    setVocabList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const mins = parseInt(durationMinutes, 10) || 15;

    if (editingLog) {
      const updated = await updateEnglishPracticeLog(editingLog.id, {
        practiceType,
        durationMinutes: mins,
        topic: topic.trim(),
        notes: notes.trim() || undefined,
        rating,
        vocabulary: vocabList,
      });
      setLogs(prev => prev.map(l => l.id === editingLog.id ? updated : l));
    } else {
      const newLog = await createEnglishPracticeLog({
        date: new Date().toISOString(),
        practiceType,
        durationMinutes: mins,
        topic: topic.trim(),
        notes: notes.trim() || undefined,
        rating,
        vocabulary: vocabList,
      });
      setLogs(prev => [newLog, ...prev]);
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this English practice session log?')) {
      await deleteEnglishPracticeLog(id);
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Languages size={26} color="#8b5cf6" /> Daily English Practice
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Track speaking, listening, reading, writing, and vocabulary daily to achieve fluency.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> Log Session
        </button>
      </div>

      {/* Metrics Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 14 }}>
        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Flame size={16} /> PRACTICE STREAK
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {streak} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>days</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b5cf6', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Clock size={16} /> TODAY'S GOAL ({todayMinutes}/{dailyGoalMins}m)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {todayMinutes}m <span style={{ fontSize: 13, color: todayMinutes >= dailyGoalMins ? '#10b981' : 'var(--text-muted)' }}>
              {todayMinutes >= dailyGoalMins ? '✓ Goal Met!' : `${dailyGoalMins - todayMinutes}m left`}
            </span>
          </div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.round((todayMinutes / dailyGoalMins) * 100))}%`, background: '#8b5cf6' }} />
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#06b6d4', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <Trophy size={16} /> TOTAL PRACTICE TIME
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </div>
        </div>

        <div className="stat-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ec4899', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <BookOpen size={16} /> VOCABULARY LOGGED
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalVocabCount} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>words</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('all')}
          >
            All Logs
          </button>
          {PRACTICE_TYPES.map(pt => {
            const Icon = pt.icon;
            return (
              <button
                key={pt.type}
                className={`btn btn-sm ${activeTab === pt.type ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab(pt.type)}
                style={{
                  borderColor: activeTab === pt.type ? pt.color : undefined,
                  background: activeTab === pt.type ? pt.color : undefined,
                }}
              >
                <Icon size={14} /> {pt.label}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', width: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 32, fontSize: 13 }}
            placeholder="Search topic or vocab..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Log Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading practice logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', borderRadius: 16,
          border: '2px dashed var(--border)', background: 'var(--bg-card)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗣️</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No English practice sessions found</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {searchQuery ? 'No matching logs for search query.' : 'Log your first session today to build momentum!'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={14} /> Add Practice Log
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredLogs.map(log => {
            const typeInfo = PRACTICE_TYPES.find(p => p.type === log.practiceType) || PRACTICE_TYPES[0];
            const Icon = typeInfo.icon;
            return (
              <div key={log.id} className="stat-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `${typeInfo.color}20`, color: typeInfo.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{log.topic}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span>📅 {format(new Date(log.date), 'MMM d, yyyy · h:mm a')}</span>
                        <span>⏱️ {log.durationMinutes} mins</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Rating stars */}
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={13}
                          fill={star <= (log.rating || 5) ? '#f59e0b' : 'transparent'}
                          color={star <= (log.rating || 5) ? '#f59e0b' : 'var(--text-muted)'}
                        />
                      ))}
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ padding: 6 }} onClick={() => openEditModal(log)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: 6, color: '#ef4444' }} onClick={() => handleDelete(log.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {log.notes && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 8, lineHeight: 1.5, marginBottom: 12 }}>
                    {log.notes}
                  </p>
                )}

                {/* Vocabulary Cards */}
                {log.vocabulary && log.vocabulary.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📚 New Words / Phrases ({log.vocabulary.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 8 }}>
                      {log.vocabulary.map((vocab, i) => (
                        <div key={i} style={{
                          padding: '10px 12px', borderRadius: 8,
                          background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)'
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#ec4899' }}>{vocab.word}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 2 }}>{vocab.meaning}</div>
                          {vocab.example && (
                            <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-muted)', marginTop: 4 }}>
                              "{vocab.example}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>
                {editingLog ? '✏️ Edit Practice Log' : '🗣️ Log English Practice'}
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Practice Type */}
              <div>
                <label style={labelStyle}>Practice Category</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRACTICE_TYPES.map(pt => {
                    const Icon = pt.icon;
                    return (
                      <button
                        key={pt.type}
                        type="button"
                        onClick={() => setPracticeType(pt.type)}
                        style={{
                          padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                          border: '1.5px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          background: practiceType === pt.type ? `${pt.color}20` : 'var(--input-bg)',
                          borderColor: practiceType === pt.type ? pt.color : 'var(--border)',
                          color: practiceType === pt.type ? pt.color : 'var(--text-secondary)'
                        }}
                      >
                        <Icon size={14} /> {pt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic */}
              <div>
                <label style={labelStyle}>Topic / Activity Title *</label>
                <input
                  className="input"
                  placeholder="e.g. Shadowing Tech Podcast / IELTS Speaking Q2"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  required
                />
              </div>

              {/* Duration & Rating */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Self Rating (1 - 5 stars)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                      >
                        <Star
                          size={20}
                          fill={star <= rating ? '#f59e0b' : 'transparent'}
                          color={star <= rating ? '#f59e0b' : 'var(--text-muted)'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Key Learnings & Notes (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="What went well? Any grammar rules or pronunciation tips?"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Vocabulary Addition Section */}
              <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                  ➕ Add New Words / Phrases
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Word / Phrase (e.g. Eloquent)"
                    value={vocabWord}
                    onChange={e => setVocabWord(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Meaning (e.g. Fluent and persuasive in speaking)"
                    value={vocabMeaning}
                    onChange={e => setVocabMeaning(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      placeholder="Example sentence (optional)"
                      value={vocabExample}
                      onChange={e => setVocabExample(e.target.value)}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddVocab}>
                      Add
                    </button>
                  </div>
                </div>

                {vocabList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {vocabList.map((v, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 10px', background: 'var(--bg-card)', borderRadius: 6 }}>
                        <span><strong>{v.word}</strong>: {v.meaning}</span>
                        <button type="button" onClick={() => handleRemoveVocab(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                  {editingLog ? 'Save Changes' : '+ Save Practice Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6,
};
