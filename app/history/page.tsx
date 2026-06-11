'use client';

import { useState, useEffect } from 'react';
import { Flame, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import {
  syncWithCloud,
  getUser,
  getHistoryFromCloud,
  saveHistoryEntryToCloud,
  deleteHistoryEntryFromCloud,
  type HistoryEntry,
} from '@/lib/sync';

export default function History() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [entryType, setEntryType] = useState<'victory' | 'relapse'>('victory');

  useEffect(() => {
    async function loadHistory() {
      try {
        // 1. Load from localStorage immediately so the UI feels instant
        const saved = typeof window !== 'undefined'
          ? localStorage.getItem('seedguard_history')
          : null;
        if (saved) {
          setEntries(JSON.parse(saved));
        }

        // 2. If logged in, fetch from Supabase and use that as the source of truth
        const user = await getUser();
        if (user) {
          const cloudEntries = await getHistoryFromCloud();
          if (cloudEntries.length > 0) {
            setEntries(cloudEntries);
            // Keep localStorage in sync with cloud
            localStorage.setItem('seedguard_history', JSON.stringify(cloudEntries));
          } else if (saved) {
            // User is logged in but cloud is empty — migrate their local data up
            const localEntries: HistoryEntry[] = JSON.parse(saved);
            for (const entry of localEntries) {
              await saveHistoryEntryToCloud(entry);
            }
            setEntries(localEntries);
          }
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const addEntry = async () => {
    // Victories require a note; relapses can be logged without one
    if (!newNote.trim() && entryType === 'victory') return;

    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      type: entryType,
      note: newNote,
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);

    // Save to localStorage
    localStorage.setItem('seedguard_history', JSON.stringify(updated));

    // Save to Supabase (silently — don't block the UI)
    saveHistoryEntryToCloud(newEntry).catch(console.warn);

    // If it's a relapse, reset streak timer and update stats
    if (entryType === 'relapse') {
      const now = new Date().toISOString();
      localStorage.setItem('seedguard_streak_start', now);
      try {
        const saved = localStorage.getItem('seedguard_stats');
        const stats = saved ? JSON.parse(saved) : {};
        const updatedStats = {
          ...stats,
          currentStreak: 0,
          relapses: (stats.relapses || 0) + 1,
        };
        localStorage.setItem('seedguard_stats', JSON.stringify(updatedStats));
      } catch {}
      // Sync the reset streak to cloud too
      syncWithCloud(true).catch(console.warn);
    }

    setNewNote('');
  };

  const deleteEntry = async (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    localStorage.setItem('seedguard_history', JSON.stringify(updated));
    // Delete from Supabase too
    deleteHistoryEntryFromCloud(id).catch(console.warn);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-bounce-subtle text-primary neon-text-pink">
          <ShieldCheck className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const victories = entries.filter((e) => e.type === 'victory');
  const relapses = entries.filter((e) => e.type === 'relapse');

  if (typeof window === 'undefined') return null;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8 page-entry">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-widest uppercase italic neon-text-cyan text-secondary">
          History
        </h1>
        <p className="text-muted-foreground text-lg mt-2">
          Review your past relapses and check-ins.
        </p>
      </div>

      {/* Add Entry Section */}
      <div className="rounded-xl border border-primary/20 bg-background/50 backdrop-blur-sm p-6 space-y-4 animate-scale-in">
        <h3 className="font-bold text-lg uppercase tracking-wider">Log New Entry</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => setEntryType('victory')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
                ${entryType === 'victory'
                  ? 'bg-primary/20 text-primary neon-text-pink border border-primary/50'
                  : 'bg-muted/50 text-muted-foreground border border-muted/50 hover:bg-muted/75'
                }
              `}
            >
              <ShieldCheck className="w-5 h-5" />
              Victory
            </button>
            <button
              onClick={() => setEntryType('relapse')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
                ${entryType === 'relapse'
                  ? 'bg-destructive/20 text-destructive border border-destructive/50'
                  : 'bg-muted/50 text-muted-foreground border border-muted/50 hover:bg-muted/75'
                }
              `}
            >
              <Flame className="w-5 h-5" />
              Relapse
            </button>
          </div>

          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={entryType === 'victory' ? 'Write about your victory...' : 'What led to this relapse?'}
            className="w-full rounded-lg border border-muted/30 bg-background/50 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            rows={3}
          />

          <button
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary/20 text-primary border border-primary/50 rounded-lg hover:bg-primary/30 transition-all font-medium uppercase tracking-wider"
          >
            <Plus className="w-5 h-5" />
            Log Entry
          </button>
        </div>
      </div>

      {/* History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Victories */}
        <div className="space-y-4 animate-scale-in">
          <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-secondary neon-text-cyan">
            <ShieldCheck className="w-6 h-6" />
            Victories & Notes
          </h2>
          {victories.length === 0 ? (
            <div className="text-sm text-muted-foreground italic border border-dashed border-muted/50 rounded-lg p-6 text-center">
              No wins or notes logged yet. Start your journey today!
            </div>
          ) : (
            <div className="space-y-3">
              {victories.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-secondary/20 bg-background/50 p-4 hover:border-secondary/50 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">{entry.date}</p>
                      <p className="text-foreground">{entry.note}</p>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/20 rounded text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Relapses */}
        <div className="space-y-4 animate-scale-in [animation-delay:100ms]">
          <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2 text-destructive">
            <Flame className="w-6 h-6" />
            Relapse Log
          </h2>
          {relapses.length === 0 ? (
            <div className="text-sm text-muted-foreground italic border border-dashed border-muted/50 rounded-lg p-6 text-center">
              No relapses logged yet. Keep it up!
            </div>
          ) : (
            <div className="space-y-3">
              {relapses.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-destructive/20 bg-background/50 p-4 hover:border-destructive/50 transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">{entry.date}</p>
                      <p className="text-foreground">{entry.note || 'Relapse recorded'}</p>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/20 rounded text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-sm p-8">
          <h3 className="font-bold text-lg mb-4 uppercase tracking-wider">Session Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-secondary neon-text-cyan">{victories.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Victories</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{relapses.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Relapses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary neon-text-pink">
                {entries.length > 0 ? Math.round((victories.length / entries.length) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-accent">{entries.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Entries</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
