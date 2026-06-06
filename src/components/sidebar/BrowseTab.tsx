import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MagnifyingGlass, ArrowLeft, Sparkle } from '@phosphor-icons/react'
import type { NoteItem } from '../../types'
import { MiniChat } from './MiniChat'
import { fetchAllNotes } from '../../lib/supabase'
import type { Note } from '../../lib/supabase'

const TYPE_COLORS: Record<string, string> = {
  idea:     '#63a5e8',
  link:     '#f0607a',
  code:     '#63e8a0',
  decision: '#e8c963',
  voice:    '#c863e8',
  image:    '#e8a063',
}


function noteToItem(n: Note): NoteItem {
  return {
    id: n.id,
    content: n.link_title || n.transcript || n.content,
    noteType: n.type,
    time: new Date(n.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }),
    tags: n.ai_tags,
  }
}

function NoteDetail({ note, onBack }: { note: NoteItem; onBack: () => void }) {
  const tc = TYPE_COLORS[note.noteType] ?? 'var(--color-text-muted)'
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <button onClick={onBack} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={14} />
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: `${tc}22`, color: tc }}>
          {note.noteType}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{note.time}</span>
      </div>
      <MiniChat
        initialMessage={`You saved this ${note.noteType} on ${note.time}.\n\n"${note.content}"\n\nI can discuss this note in the context of everything else you've saved.`}
        placeholder="Ask about this note..."
      />
    </div>
  )
}

export function BrowseTab() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<NoteItem | null>(null)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    fetchAllNotes().then(setNotes).catch(console.error)
  }, [])

  const items = notes.map(noteToItem)

  const filtered = items.filter(n =>
    !search.trim() ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <AnimatePresence>
        {selected && (
          <motion.div
            key="note-detail"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="absolute inset-0 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <NoteDetail note={selected} onBack={() => setSelected(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: '-20%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="flex flex-col flex-1 overflow-hidden min-h-0"
      >
        {/* Search */}
        <div className="flex-shrink-0 flex items-center gap-2" style={{ padding: '14px 20px 10px' }}>
          <MagnifyingGlass size={13} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)', fontSize: 13, caretColor: 'var(--color-accent)' }}
          />
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <MagnifyingGlass size={22} style={{ color: 'var(--color-text-faint)' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                {notes.length === 0 ? 'No notes saved yet' : 'No notes match'}
              </p>
            </div>
          ) : (
            filtered.map(note => {
              const tc = TYPE_COLORS[note.noteType] ?? 'var(--color-text-muted)'
              return (
                <button
                  key={note.id}
                  onClick={() => setSelected(note)}
                  className="w-full text-left group"
                  style={{ borderBottom: '1px solid var(--color-border)', padding: '16px 20px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 500, color: tc, textTransform: 'capitalize' }}>
                      {note.noteType}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Sparkle
                        size={11}
                        weight="fill"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--color-accent)' }}
                      />
                      <span style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>{note.time}</span>
                    </div>
                  </div>
                  <p className="line-clamp-3" style={{ color: 'var(--color-text-secondary)', fontSize: 12.5, lineHeight: 1.65 }}>
                    {note.content}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 10, color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}
