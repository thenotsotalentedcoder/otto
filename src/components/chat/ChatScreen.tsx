import { useState, useCallback, useEffect, useRef } from 'react'
import { ChatThread } from './ChatThread'
import { InputBar } from './InputBar'
import type { Message, NoteType } from '../../types'
import { insertNote, insertMessage, fetchMessages, fetchAllNotes, fetchWeeklyDigest, updateNote } from '../../lib/supabase'
import { askOttoStream, generateWeeklyDigest, parseOttoAction } from '../../lib/gemini'
import { upsertWeeklyDigest } from '../../lib/supabase'
import type { Note, DbMessage } from '../../lib/supabase'
import { scrapeLink } from '../../lib/scraper'

// ── Helpers ────────────────────────────────────────────────────────────────────

function guessNoteType(text: string): NoteType {
  if (/^https?:\/\//i.test(text.trim())) return 'link'
  if (/\b(decided|decision|going with|we'll use|architecture)\b/i.test(text)) return 'decision'
  if (/```|const |function |import |def |class /i.test(text)) return 'code'
  return 'idea'
}

function dbMsgToMessage(m: DbMessage, noteMap?: Map<string, Note>): Message {
  const { text } = parseOttoAction(m.content)
  const note = m.note_id ? noteMap?.get(m.note_id) : undefined
  return {
    id: m.id,
    role: m.role === 'user' ? 'user' : m.is_ask_mode ? 'ai-response' : 'ai-ack',
    content: text,
    timestamp: new Date(m.created_at),
    isAsk: m.is_ask_mode,
    // Restore tags + noteType from the linked note
    noteType: note ? (note.type as import('../../types').NoteType) : undefined,
    tags: note?.ai_tags?.length ? note.ai_tags.map(t => ({ label: t })) : undefined,
    linkTitle: note?.link_title ?? undefined,
    linkDomain: note?.link_url ? new URL(note.link_url).hostname.replace(/^www\./, '') : undefined,
  }
}

let tempId = 0
function tid() { return `temp-${++tempId}` }

// ── Week digest check ──────────────────────────────────────────────────────────

async function maybeRefreshDigest(notes: Note[]): Promise<string> {
  try {
    const digest = await fetchWeeklyDigest()
    if (digest) {
      const age = Date.now() - new Date(digest.generated_at).getTime()
      if (age < 7 * 24 * 60 * 60 * 1000) return digest.content
    }
    // Stale or missing — regenerate
    const fresh = await generateWeeklyDigest(notes)
    if (fresh) await upsertWeeklyDigest(fresh)
    return fresh
  } catch {
    return ''
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  onMessagesChange?: (msgs: Message[]) => void
  isMobile?: boolean
  railOffset?: number
  sharedContent?: string
}

export function ChatScreen({ onMessagesChange, isMobile, railOffset = 0, sharedContent }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribedText, setTranscribedText] = useState<string | undefined>(undefined)

  const [notesCache, setNotesCache] = useState<Note[]>([])
  const [digestCache, setDigestCache] = useState('')
  const askHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  // Queue: pending sends while AI is processing
  const queueRef = useRef<string[]>([])
  const processingRef = useRef(false)

  // ── Handle share target content ───────────────────────────────────────────

  useEffect(() => {
    if (!sharedContent) return
    const isUrl = /^https?:\/\//i.test(sharedContent.trim())
    if (isUrl) {
      // Auto-save shared URLs like a normal link dump
      handleSend(sharedContent.trim())
    } else {
      // Fill input bar for text so user can decide to save or /ask
      setTranscribedText(sharedContent.trim())
    }
  }, []) // intentionally run once on mount only

  // ── Boot: load messages + notes + digest ──────────────────────────────────

  useEffect(() => {
    async function boot() {
      try {
        const [dbMessages, notes] = await Promise.all([fetchMessages(), fetchAllNotes()])
        const noteMap = new Map(notes.map(n => [n.id, n]))
        const msgs = dbMessages.map(m => dbMsgToMessage(m, noteMap))
        setMessages(msgs)
        setNotesCache(notes)
        onMessagesChange?.(msgs)
        const digest = await maybeRefreshDigest(notes)
        setDigestCache(digest)
      } catch (e) {
        console.error('Boot failed:', e)
      }
    }
    boot()
  }, [])

  // ── Add messages helper ───────────────────────────────────────────────────

  const addMessages = useCallback((...msgs: Message[]) => {
    setMessages(prev => {
      const next = [...prev, ...msgs]
      onMessagesChange?.(next)
      return next
    })
    setNewIds(prev => {
      const next = new Set(prev)
      msgs.forEach(m => next.add(m.id))
      return next
    })
  }, [onMessagesChange])

  const replaceMessage = useCallback((tempMsgId: string, replacement: Message) => {
    setMessages(prev => prev.map(m => m.id === tempMsgId ? replacement : m))
    setNewIds(prev => {
      const next = new Set(prev)
      next.delete(tempMsgId)
      next.add(replacement.id)
      return next
    })
  }, [])

  const updateLastMessage = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m))
  }, [])

  // ── Process one send ──────────────────────────────────────────────────────

  const processOne = useCallback(async (text: string) => {
    // /ask must be explicitly typed each time — no sticky mode
    const isAsk = text.startsWith('/ask')
    const cleanText = isAsk ? text.slice(4).trim() : text.trim()
    if (!cleanText) return

    const type = isAsk ? 'idea' : guessNoteType(cleanText)

    // Optimistic user message — no tag shown until Gemini confirms
    const tempUserMsg: Message = {
      id: tid(),
      role: 'user',
      content: cleanText,
      timestamp: new Date(),
      isAsk,
      noteType: undefined, // set after Gemini responds with real tags
    }
    addMessages(tempUserMsg)
    setIsLoading(true)

    // Track streaming bubble id so catch can clean it up if Gemini fails
    let streamTempId: string | null = null

    try {
      if (isAsk) {
        // ── Ask mode ───────────────────────────────────────────────────────

        // Persist user message
        const dbUserMsg = await insertMessage({
          role: 'user',
          content: cleanText,
          is_ask_mode: true,
          saved: false,
        })
        replaceMessage(tempUserMsg.id, dbMsgToMessage(dbUserMsg))

        // Streaming AI response
        streamTempId = tid()
        const streamMsg: Message = {
          id: streamTempId,
          role: 'ai-response',
          content: '',
          timestamp: new Date(),
          isAsk: true,
        }
        addMessages(streamMsg)

        const { fullText, ottoAction } = await askOttoStream(
          askHistoryRef.current,
          cleanText,
          notesCache,
          digestCache,
          (visibleChunk) => {
            updateLastMessage(streamTempId!, visibleChunk)
          }
        )

        // Update ask history after call completes
        askHistoryRef.current.push({ role: 'user', content: cleanText })
        askHistoryRef.current.push({ role: 'assistant', content: fullText })

        // Execute action if Otto requested one, then refresh full notes cache
        if (ottoAction) {
          try {
            if (ottoAction.action === 'update_note' && ottoAction.note_id) {
              const patch: Parameters<typeof updateNote>[1] = {}
              if (ottoAction.content !== undefined) patch.content = ottoAction.content
              if (ottoAction.tags !== undefined) patch.ai_tags = ottoAction.tags
              await updateNote(ottoAction.note_id, patch)
            } else if (ottoAction.action === 'save_note' && ottoAction.content) {
              await insertNote({
                content: ottoAction.content,
                type: 'idea',
                source: 'typed',
                ai_tags: ottoAction.tags ?? [],
              })
            }
            // Refresh full cache so Otto sees updated notes in next /ask
            const freshNotes = await fetchAllNotes()
            setNotesCache(freshNotes)
          } catch (e) {
            console.warn('Otto action failed:', e)
          }
        }

        // Persist AI response
        const dbAiMsg = await insertMessage({
          role: 'assistant',
          content: fullText,
          is_ask_mode: true,
          saved: false,
        })
        replaceMessage(streamTempId!, dbMsgToMessage(dbAiMsg))

      } else {
        // ── Dump mode ──────────────────────────────────────────────────────

        // 1. Save note immediately — never blocked by Gemini
        const isLink = type === 'link'
        const note = await insertNote({
          content: cleanText,
          type: type as NoteType,
          source: 'typed',
          ai_tags: [],
          ...(isLink ? { link_url: cleanText } : {}),
        })
        setNotesCache(prev => [...prev, note])

        // 2. Persist user message immediately with fallback ack
        const dbUserMsg = await insertMessage({
          role: 'user',
          content: cleanText,
          is_ask_mode: false,
          saved: false,
          note_id: note.id,
        })
        // Immediately set noteType so link card renders without waiting for Gemini
        replaceMessage(tempUserMsg.id, {
          ...dbMsgToMessage(dbUserMsg),
          noteType: type as NoteType,
          linkDomain: isLink ? (() => { try { return new URL(cleanText).hostname.replace(/^www\./, '') } catch { return '' } })() : undefined,
        })

        // 3. Show fallback ack immediately so UI never blocks
        const fallbackAckId = tid()
        const fallbackAck: Message = {
          id: fallbackAckId,
          role: 'ai-ack',
          content: 'Saved.',
          timestamp: new Date(),
        }
        addMessages(fallbackAck)

        // Reset ask history on dump
        askHistoryRef.current = []

        // 4. Background enrichment — links only (scrape metadata + tags)
        // Plain typed notes skip Gemini entirely — saves API quota, tags add no value for raw text
        if (isLink) {
          ;(async () => {
            try {
              const meta = await scrapeLink(cleanText)
              await updateNote(note.id, { content: meta.title || cleanText })
              setNotesCache(prev => prev.map(n =>
                n.id === note.id
                  ? { ...n, link_url: cleanText, link_title: meta.title, link_summary: meta.description }
                  : n
              ))
              // Update the user message with scraped title
              setMessages(prev => prev.map(m =>
                m.id === dbUserMsg.id ? { ...m, linkTitle: meta.title } : m
              ))
            } catch (e) {
              console.warn('Link scrape failed:', e)
            }
          })()
        }
      }
    } catch (e) {
      console.error('Send failed:', e)
      const errContent = 'Something went wrong. Check your API keys in settings.'
      if (streamTempId) {
        // Replace stuck streaming bubble with error
        updateLastMessage(streamTempId, errContent)
      } else {
        addMessages({
          id: tid(),
          role: 'ai-ack',
          content: errContent,
          timestamp: new Date(),
        })
      }
    } finally {
      setIsLoading(false)
      // Process next in queue
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!
        processOne(next)
      } else {
        processingRef.current = false
      }
    }
  }, [addMessages, replaceMessage, updateLastMessage, notesCache, digestCache])

  // ── Handle send — queues if busy ──────────────────────────────────────────

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return
    if (processingRef.current) {
      queueRef.current.push(text)
    } else {
      processingRef.current = true
      processOne(text)
    }
  }, [processOne])

  // ── Voice recording ────────────────────────────────────────────────────────

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
        const recorder = new MediaRecorder(stream, { mimeType })
        audioChunksRef.current = []

        recorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop())
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          setIsTranscribing(true)
          try {
            const { transcribeAudio } = await import('../../lib/groq')
            const transcript = await transcribeAudio(audioBlob, mimeType)
            // Fill input bar — user decides to send as note or /ask
            setTranscribedText(transcript)
          } catch (e) {
            console.error('Transcription failed:', e)
            setTranscribedText('Transcription failed — check your Groq key')
          } finally {
            setIsTranscribing(false)
          }
        }

        recorder.start()
        mediaRecorderRef.current = recorder
        setIsRecording(true)
      } catch (e) {
        console.error('Mic access failed:', e)
      }
    }
  }, [isRecording])

  // ── Panel style ────────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 'calc(-1 * env(safe-area-inset-bottom, 34px))',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'rgba(8,6,28,0.28)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 10,
  } : {
    position: 'fixed',
    top: 16,
    bottom: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    width: 700,
    left: `max(${railOffset + 8}px, calc(50vw - 350px))`,
    background: 'rgba(8,6,28,0.28)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 10,
  }

  return (
    <div style={panelStyle}>
      <ChatThread messages={messages} newMessageIds={newIds} />
      <InputBar
        onSend={handleSend}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        onRecordToggle={handleRecordToggle}
        transcribedText={transcribedText}
        onTranscriptConsumed={() => setTranscribedText(undefined)}
        isMobile={isMobile}
        isLoading={isLoading}
      />
    </div>
  )
}
