import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Waveform, X, ImageSquare } from '@phosphor-icons/react'
import type { VoiceItem, ImageItem } from '../../types'
import { MiniChat } from './MiniChat'
import { fetchNotesByType } from '../../lib/supabase'
import type { Note } from '../../lib/supabase'

function noteToVoice(n: Note): VoiceItem {
  return {
    id: n.id,
    duration: '',
    transcript: n.transcript || n.content,
    time: new Date(n.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }),
  }
}

function noteToImage(n: Note): ImageItem {
  return {
    id: n.id,
    url: n.file_path || '',
    label: n.file_name || n.content || 'Image',
    time: new Date(n.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    }),
  }
}

function VoiceDetail({ note, onBack }: { note: VoiceItem; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <button onClick={onBack} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-2">
          <Waveform size={12} style={{ color: 'var(--color-accent)' }} weight="fill" />
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{note.time}</span>
        </div>
      </div>
      <MiniChat
        initialMessage={`Here's your voice note from ${note.time}:\n\n"${note.transcript}"\n\nAsk me anything about this — I can connect it to your other notes.`}
        placeholder="Ask about this note..."
      />
    </div>
  )
}

function ImageLightbox({ img, onClose }: { img: ImageItem; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col"
      style={{ backgroundColor: '#000' }}
    >
      <div className="flex items-center justify-between px-3 py-3 flex-shrink-0">
        <p style={{ color: '#fff', fontSize: 12 }}>{img.label}</p>
        <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: '#888' }}>
          <X size={16} />
        </button>
      </div>
      <img src={img.url} alt={img.label} className="flex-1 w-full object-contain" />
      <p className="text-center py-3 text-[11px]" style={{ color: '#666' }}>{img.time}</p>
    </motion.div>
  )
}

function EmptySection({ label }: { label: string }) {
  return (
    <p style={{ color: 'var(--color-text-faint)', fontSize: 12, padding: '8px 20px 16px' }}>
      No {label} saved yet
    </p>
  )
}

export function MediaTab() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceItem | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const [voiceNotes, setVoiceNotes] = useState<VoiceItem[]>([])
  const [images, setImages] = useState<ImageItem[]>([])

  useEffect(() => {
    fetchNotesByType('voice').then(notes => setVoiceNotes(notes.map(noteToVoice))).catch(console.error)
    fetchNotesByType('image').then(notes => setImages(notes.map(noteToImage))).catch(console.error)
  }, [])

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <AnimatePresence>
        {selectedImage && (
          <ImageLightbox img={selectedImage} onClose={() => setSelectedImage(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVoice && (
          <motion.div
            key="voice-detail"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="absolute inset-0 flex flex-col"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <VoiceDetail note={selectedVoice} onBack={() => setSelectedVoice(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: '-20%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="flex-1 overflow-y-auto flex flex-col"
      >
        {/* Voice notes */}
        <div style={{ padding: '20px 20px 10px' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Voice notes
          </span>
        </div>

        {voiceNotes.length === 0 ? <EmptySection label="voice notes" /> : voiceNotes.map(note => (
          <button
            key={note.id}
            onClick={() => setSelectedVoice(note)}
            className="w-full text-left group"
            style={{ borderBottom: '1px solid var(--color-border)', padding: '14px 20px' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Waveform size={11} style={{ color: 'var(--color-accent)' }} weight="fill" />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  voice
                </span>
              </div>
              <span style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>{note.time}</span>
            </div>
            <p className="line-clamp-2" style={{ color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.6 }}>
              {note.transcript}
            </p>
          </button>
        ))}

        {/* Images */}
        <div style={{ padding: '24px 20px 10px' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Images
          </span>
        </div>

        {images.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6" style={{ padding: '8px 20px 24px' }}>
            <ImageSquare size={22} style={{ color: 'var(--color-text-faint)' }} />
            <p style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>No images saved yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2" style={{ padding: '0 20px 24px' }}>
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(img)}
                className="rounded-xl overflow-hidden cursor-pointer group relative"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <img src={img.url} alt={img.label} className="w-full h-24 object-cover block" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}
                >
                  <span style={{ color: '#fff', fontSize: 10 }}>{img.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
