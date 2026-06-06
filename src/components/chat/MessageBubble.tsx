import { motion, useReducedMotion } from 'motion/react'
import { Waveform } from '@phosphor-icons/react'
import ottoLogo from '../../assets/logo_nobg.png'
import type { Message } from '../../types'

const TAG_PALETTE: Record<string, { bg: string; text: string }> = {
  idea:              { bg: 'rgba(139,127,245,0.15)',  text: '#a89ef7' },
  link:              { bg: 'rgba(77,217,240,0.12)',   text: '#4dd9f0' },
  code:              { bg: 'rgba(99,232,160,0.12)',   text: '#5ecf8e' },
  decision:          { bg: 'rgba(232,201,99,0.12)',   text: '#d4b84a' },
  voice:             { bg: 'rgba(200,99,232,0.12)',   text: '#c07be0' },
  image:             { bg: 'rgba(232,160,99,0.12)',   text: '#d4945c' },
  meta:              { bg: 'rgba(160,152,144,0.12)',  text: '#9a9490' },
  architecture:      { bg: 'rgba(77,217,240,0.10)',   text: '#4dd9f0' },
  'kitchen monitoring': { bg: 'rgba(139,127,245,0.10)', text: '#a89ef7' },
  'second brain':    { bg: 'rgba(139,127,245,0.10)', text: '#a89ef7' },
  ai:                { bg: 'rgba(200,99,232,0.10)',   text: '#c07be0' },
}

function tagStyle(label: string) {
  const key = label.toLowerCase()
  return TAG_PALETTE[key] ?? { bg: 'rgba(160,152,144,0.10)', text: '#9a9490' }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

interface Props {
  message: Message
  isNew?: boolean
}

const ENTER = { type: 'spring', stiffness: 360, damping: 28, mass: 0.9 } as const
const FAST  = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } as const

export function MessageBubble({ message, isNew }: Props) {
  const reduceMotion = useReducedMotion()
  const { role, content, tags, noteType, voiceDuration, imageUrl, linkTitle, linkDomain, timestamp, isAsk } = message

  // ── AI ack — single inline line ──────────────────────────────────────────
  if (role === 'ai-ack') {
    return (
      <motion.div
        initial={isNew ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.06 }}
        className="flex items-center gap-2 py-0.5 pl-1"
      >
        <img src={ottoLogo} alt="Otto" style={{ width: 12, height: 12, objectFit: 'contain', flexShrink: 0, opacity: 0.8 }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.5 }}>
          {content}
        </p>
      </motion.div>
    )
  }

  // ── AI full response — left-accented block ────────────────────────────────
  if (role === 'ai-response') {
    const isStreaming = content === ''
    return (
      <motion.div
        initial={isNew ? (reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }) : false}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.2 } : ENTER}
        className="flex gap-3"
      >
        <div
          className="flex-shrink-0 rounded-full"
          style={{ width: 2, backgroundColor: 'var(--color-accent-dim)', marginTop: 3, alignSelf: 'stretch', minHeight: 20 }}
        />
        <div className="flex flex-col gap-2 min-w-0 flex-1 py-1">
          <div className="flex items-center gap-1.5">
            <img src={ottoLogo} alt="Otto" style={{ width: 14, height: 14, objectFit: 'contain' }} />
            <span style={{ color: 'var(--color-accent)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' }}>
              otto
            </span>
          </div>
          {isStreaming ? (
            <div className="flex items-center gap-1" style={{ height: 22 }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'rgba(139,127,245,0.5)',
                    animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : (
            <>
              <div>
                {content.split('\n\n').map((para, i) => (
                  <p
                    key={i}
                    style={{
                      color: 'var(--color-text-primary)',
                      fontSize: 14,
                      lineHeight: 1.75,
                      marginTop: i > 0 ? 10 : 0,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {para}
                  </p>
                ))}
              </div>
              <span style={{ color: 'var(--color-text-faint)', fontSize: 11 }}>
                {formatTime(timestamp)}
              </span>
            </>
          )}
        </div>
      </motion.div>
    )
  }

  // ── User note / ask — flat row with divider ───────────────────────────────
  return (
    <motion.div
      initial={isNew ? (reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }) : false}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0.18 } : FAST}
      className="flex flex-col gap-2"
    >
      <motion.div
        initial={isNew ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="flex items-center gap-1.5 flex-wrap"
      >
        {isAsk && (
          <span style={{
            color: 'var(--color-accent)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            ask
          </span>
        )}
        {tags?.map(tag => {
          const s = tagStyle(tag.label)
          return (
            <span
              key={tag.label}
              className="capitalize"
              style={{
                backgroundColor: s.bg,
                color: s.text,
                fontSize: 10,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 99,
                letterSpacing: '0.02em',
              }}
            >
              {tag.label}
            </span>
          )
        })}
        <span style={{ color: 'var(--color-text-faint)', fontSize: 11, marginLeft: 'auto' }}>
          {formatTime(timestamp)}
        </span>
      </motion.div>

      {noteType === 'voice' && voiceDuration && (
        <div className="flex items-center gap-2">
          <Waveform size={12} weight="fill" style={{ color: 'var(--color-accent)', opacity: 0.7 }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            voice · {voiceDuration}
          </span>
        </div>
      )}

      {noteType === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <a
            href={content.startsWith('http') ? content : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-accent)',
              fontSize: 14.5,
              fontWeight: 500,
              lineHeight: 1.5,
              textDecoration: 'underline',
              textDecorationColor: 'rgba(139,127,245,0.35)',
              textUnderlineOffset: 3,
              wordBreak: 'break-all',
              transition: 'text-decoration-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.textDecorationColor = 'rgba(139,127,245,0.8)'; el.style.color = '#c4bbff' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.textDecorationColor = 'rgba(139,127,245,0.35)'; el.style.color = 'var(--color-accent)' }}
          >
            {linkTitle || content}
          </a>
          {linkDomain && (
            <span style={{ fontSize: 11, color: 'rgba(176,168,216,0.35)', letterSpacing: '0.01em' }}>
              {linkDomain}
            </span>
          )}
        </div>
      )}

      {imageUrl && (
        <img src={imageUrl} alt="upload" className="rounded-lg max-w-sm block" style={{ maxHeight: 220 }} />
      )}

      {noteType !== 'link' && (
        <p
          style={{
            color: isAsk ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            fontSize: 14.5,
            lineHeight: 1.7,
            fontWeight: isAsk ? 400 : 500,
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </p>
      )}

      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 2 }} />
    </motion.div>
  )
}
