import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Globe, ArrowUpRight, ChatCircle } from '@phosphor-icons/react'
import type { LinkItem } from '../../types'
import { MiniChat } from './MiniChat'
import { fetchNotesByType } from '../../lib/supabase'
import type { Note } from '../../lib/supabase'

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  research:    { bg: 'rgba(240,96,122,0.12)',  text: '#f0607a' },
  tools:       { bg: 'rgba(99,165,232,0.12)',  text: '#7ab8ed' },
  reference:   { bg: 'rgba(99,232,160,0.12)',  text: '#5ecf8e' },
  inspiration: { bg: 'rgba(232,201,99,0.12)',  text: '#d4b84a' },
}


function LinkDetail({ link, onBack }: { link: LinkItem; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-2 px-3 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button onClick={onBack} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{link.title}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{link.domain}</p>
        </div>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
          <ArrowUpRight size={14} />
        </a>
      </div>
      <MiniChat
        initialMessage={`You saved this link from ${link.domain}. Ask me anything about how it connects to your notes.`}
        placeholder="Ask about this link..."
      />
    </div>
  )
}

function noteToLinkItem(n: Note): LinkItem {
  let domain = ''
  try { domain = new URL(n.link_url ?? n.content).hostname.replace(/^www\./, '') } catch { domain = '' }
  return {
    id: n.id,
    title: n.link_title || domain || n.content.slice(0, 60),
    domain,
    url: n.link_url || n.content,
    summary: n.link_summary || '',
    tag: n.ai_tags[0] || 'link',
    time: new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  }
}

export function LinksTab() {
  const [selected, setSelected] = useState<LinkItem | null>(null)
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    fetchNotesByType('link').then(setNotes).catch(console.error)
  }, [])

  const filtered: LinkItem[] = notes.map(noteToLinkItem)

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key="detail"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="absolute inset-0 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <LinkDetail link={selected} onBack={() => setSelected(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ x: '-20%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-20%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="absolute inset-0 flex flex-col overflow-hidden"
          >
            {/* Flat list */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No links saved yet</p>
                  <p style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>Paste a URL in the chat to save it</p>
                </div>
              )}
              {filtered.map(link => {
                const tc = TAG_COLORS[link.tag] ?? { bg: 'var(--color-surface-3)', text: 'var(--color-text-muted)' }
                return (
                  <button
                    key={link.id}
                    onClick={() => setSelected(link)}
                    className="w-full text-left group"
                    style={{ borderBottom: '1px solid var(--color-border)', padding: '18px 20px' }}
                  >
                    {/* Domain + time */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Globe size={10} style={{ color: 'var(--color-text-muted)' }} />
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{link.domain}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ChatCircle
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--color-accent)' }}
                        />
                        <span style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>{link.time}</span>
                      </div>
                    </div>
                    {/* Title */}
                    <p style={{ color: 'var(--color-text-primary)', fontSize: 13.5, fontWeight: 500, lineHeight: 1.45, marginBottom: 6 }}>
                      {link.title}
                    </p>
                    {/* Summary */}
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
                      {link.summary}
                    </p>
                    {/* Tag */}
                    <span style={{ fontSize: 11, fontWeight: 500, color: tc.text }}>
                      {link.tag}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
