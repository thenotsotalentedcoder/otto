import { useMemo } from 'react'
import { Lightning, Tag } from '@phosphor-icons/react'
import ottoLogo from '../assets/logo_nobg.png'
import type { Message } from '../types'

interface Props {
  messages: Message[]
}

const TYPE_COLORS: Record<string, string> = {
  idea:     '#7ab8ed',
  link:     '#f0607a',
  code:     '#5ecf8e',
  decision: '#d4b84a',
  voice:    '#c07be0',
  image:    '#d4945c',
}

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function ContextStrip({ messages }: Props) {
  const stats = useMemo(() => {
    const todayStart = today().getTime()
    const userNotes = messages.filter(m => m.role === 'user' && !m.isAsk)
    const todayNotes = userNotes.filter(m => m.timestamp.getTime() >= todayStart)

    // Tag frequency
    const tagCounts: Record<string, number> = {}
    userNotes.forEach(m => {
      m.tags?.forEach(t => {
        tagCounts[t.label] = (tagCounts[t.label] ?? 0) + 1
      })
    })
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Type breakdown today
    const typeCounts: Record<string, number> = {}
    todayNotes.forEach(m => {
      if (m.noteType) typeCounts[m.noteType] = (typeCounts[m.noteType] ?? 0) + 1
    })

    // Recent 3 notes
    const recent = userNotes.slice(-3).reverse()

    return { todayCount: todayNotes.length, totalCount: userNotes.length, topTags, typeCounts, recent }
  }, [messages])

  return (
    <div
      className="flex-shrink-0 flex flex-col border-l overflow-y-auto"
      style={{
        width: 192,
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: '20px 0',
        gap: 0,
      }}
    >
      {/* Session header */}
      <div className="px-4 mb-5">
        <div className="flex items-center gap-1.5 mb-1">
          <img src={ottoLogo} alt="Otto" style={{ width: 13, height: 13, objectFit: 'contain' }} />
          <span style={{ color: 'var(--color-rose)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            session
          </span>
        </div>
        <p style={{ color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
          {stats.todayCount}
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 2 }}>
          saved today · {stats.totalCount} total
        </p>
      </div>

      <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '0 16px 16px' }} />

      {/* Type breakdown */}
      {Object.keys(stats.typeCounts).length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Lightning size={10} weight="fill" style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              today's types
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(stats.typeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize" style={{ color: TYPE_COLORS[type] ?? 'var(--color-text-muted)', fontSize: 11 }}>
                  {type}
                </span>
                <span style={{ color: 'var(--color-text-faint)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top tags */}
      {stats.topTags.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Tag size={10} weight="fill" style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              top tags
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {stats.topTags.map(([tag, count]) => (
              <div key={tag} className="flex items-center justify-between">
                <span className="capitalize" style={{ color: 'var(--color-text-secondary)', fontSize: 11, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tag}
                </span>
                <span style={{ color: 'var(--color-text-faint)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '0 16px 16px' }} />

      {/* Recent notes */}
      {stats.recent.length > 0 && (
        <div className="px-4">
          <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            recent
          </span>
          <div className="flex flex-col gap-3">
            {stats.recent.map(m => (
              <div key={m.id}>
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 11.5,
                    lineHeight: 1.55,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {m.content}
                </p>
                <span style={{ color: 'var(--color-text-faint)', fontSize: 10, marginTop: 2, display: 'block' }}>
                  {m.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
