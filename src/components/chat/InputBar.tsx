import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Paperclip,
  Image,
  Microphone,
  PaperPlaneTilt,
  Stop,
  Sparkle,
} from '@phosphor-icons/react'
import { SlashPalette } from './SlashPalette'

interface Props {
  onSend: (text: string) => void
  isRecording: boolean
  isTranscribing?: boolean
  onRecordToggle: () => void
  transcribedText?: string
  onTranscriptConsumed?: () => void
  isMobile?: boolean
  isLoading?: boolean
}

export function InputBar({ onSend, isRecording, isTranscribing = false, onRecordToggle, transcribedText, onTranscriptConsumed, isMobile }: Props) {
  const [value, setValue] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // When parent provides a transcribed text, fill the textarea and focus it
  useEffect(() => {
    if (!transcribedText) return
    setValue(transcribedText)
    setTimeout(() => {
      textareaRef.current?.focus()
      // Move cursor to end
      const ta = textareaRef.current
      if (ta) { ta.selectionStart = ta.selectionEnd = ta.value.length }
    }, 50)
    onTranscriptConsumed?.()
  }, [transcribedText])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [value])

  useEffect(() => {
    if (isRecording) {
      setElapsed(0)
      elapsedRef.current = setInterval(() => {
        setElapsed(s => s + 1)
      }, 1000)
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      setElapsed(0)
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [isRecording])

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setValue(v)
    if (v.startsWith('/')) {
      setShowPalette(true)
      setPaletteQuery(v)
    } else {
      setShowPalette(false)
      setPaletteQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setShowPalette(false)
    }
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    setShowPalette(false)
    textareaRef.current?.focus()
  }

  const handlePaletteSelect = (cmd: string) => {
    setValue(cmd + ' ')
    setShowPalette(false)
    textareaRef.current?.focus()
  }

  const isEmpty = value.trim() === ''
  const isDisabled = isRecording || isTranscribing
  const isAskPrefix = value.trimStart().startsWith('/ask')
  const isActive = isRecording || isFocused || isAskPrefix

  const borderColor = isRecording
    ? 'rgba(139,127,245,0.6)'
    : isAskPrefix
    ? 'rgba(139,127,245,0.4)'
    : isFocused
    ? 'rgba(139,127,245,0.35)'
    : 'rgba(255,255,255,0.1)'

  return (
    <div
      className="flex-shrink-0 relative"
      style={{ padding: isMobile ? `8px 16px calc(92px + env(safe-area-inset-bottom))` : '8px 16px 16px' }}
    >
      {/* Recording / transcribing indicator */}
      <AnimatePresence>
        {(isRecording || isTranscribing) && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-3 px-1 pb-2"
          >
            <div className="flex items-center gap-0.5" aria-hidden>
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{ backgroundColor: isTranscribing ? 'rgba(139,127,245,0.5)' : 'var(--color-accent)' }}
                  animate={{ height: isTranscribing ? ['3px', '8px', '3px'] : ['4px', '12px', '4px'] }}
                  transition={{ duration: isTranscribing ? 1.2 : 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                />
              ))}
            </div>
            {isRecording && (
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                {formatElapsed(elapsed)}
              </span>
            )}
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {isTranscribing ? 'transcribing…' : 'recording — tap to stop'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slash palette */}
      <div className="relative">
        <SlashPalette
          visible={showPalette}
          query={paletteQuery}
          onSelect={handlePaletteSelect}
        />

        {/* Input row */}
        <div
          className="flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${borderColor}`,
            borderRadius: 16,
            padding: '6px 6px 6px 4px',
            transition: 'border-color 0.2s',
            boxShadow: isActive ? `0 0 0 3px rgba(139,127,245,0.08)` : 'none',
          }}
        >
          {/* Left action buttons */}
          <div className="flex items-center pb-0.5">
            <IconButton title="Attach file" label="file">
              <Paperclip size={16} />
            </IconButton>
            <IconButton title="Attach image" label="image">
              <Image size={16} />
            </IconButton>
            <IconButton
              title={isRecording ? 'Stop recording' : 'Voice note'}
              label={isRecording ? 'stop' : 'voice'}
              active={isRecording}
              onClick={onRecordToggle}
            >
              {isRecording ? <Stop size={16} weight="fill" /> : <Microphone size={16} />}
            </IconButton>
          </div>

          {/* Divider */}
          <div
            className="w-px self-stretch my-1.5 flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isRecording ? 'recording...' : 'type anything, or / for commands...'}
            rows={1}
            disabled={isDisabled}
            className="flex-1 bg-transparent outline-none resize-none"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 14,
              maxHeight: 140,
              overflowY: 'auto',
              lineHeight: 1.5,
            }}
          />

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={isEmpty || isDisabled}
            whileTap={{ scale: 0.9 }}
            className="flex-shrink-0 rounded-xl flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              backgroundColor: isEmpty && !isRecording
                ? 'rgba(255,255,255,0.06)'
                : 'var(--color-accent)',
              color: isEmpty && !isRecording ? 'rgba(255,255,255,0.3)' : '#fff',
              transition: 'background-color 0.18s, color 0.18s',
              flexShrink: 0,
            }}
          >
            {isAskPrefix ? (
              <Sparkle size={15} weight="fill" />
            ) : (
              <PaperPlaneTilt size={15} weight="fill" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  children,
  title,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode
  title: string
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-xl gap-0.5"
      style={{
        width: 40,
        height: 40,
        color: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.65)',
        backgroundColor: active ? 'var(--color-accent-glow-2)' : 'transparent',
        transition: 'background-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.07)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'
        }
      }}
    >
      {children}
      <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1 }}>
        {label}
      </span>
    </button>
  )
}
