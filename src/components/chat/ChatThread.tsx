import { useEffect, useRef } from 'react'
import type { Message } from '../../types'
import { MessageBubble } from './MessageBubble'
import { DateSeparator } from './DateSeparator'

interface Props {
  messages: Message[]
  newMessageIds: Set<string>
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Spring scroll: physically-accurate easing toward target scrollTop.
// Uses a critically-damped spring so it never bounces.
function springScrollTo(el: HTMLElement, targetY: number) {
  // Respect prefers-reduced-motion — instant jump
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    el.scrollTop = targetY
    return
  }

  const stiffness = 120
  const damping   = 18
  const mass      = 1

  let position  = el.scrollTop
  let velocity  = 0
  let rafId     = 0
  let lastTime  = performance.now()

  function tick(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.064) // cap at ~4 frames
    lastTime = now

    const force    = -stiffness * (position - targetY)
    const damping_ = -damping * velocity
    const accel    = (force + damping_) / mass

    velocity += accel * dt
    position += velocity * dt

    el.scrollTop = position

    const atRest = Math.abs(velocity) < 0.5 && Math.abs(position - targetY) < 0.5
    if (!atRest) {
      rafId = requestAnimationFrame(tick)
    } else {
      el.scrollTop = targetY
    }
  }

  rafId = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(rafId)
}

export function ChatThread({ messages, newMessageIds }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cancelSpring = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // Cancel any in-flight spring before starting a new one
    cancelSpring.current?.()

    // Small delay so the new message has rendered and its height is in the DOM
    const timer = setTimeout(() => {
      const cancel = springScrollTo(el, el.scrollHeight - el.clientHeight)
      cancelSpring.current = cancel ?? undefined
    }, 20)

    return () => clearTimeout(timer)
  }, [messages.length])

  const items: Array<{ type: 'date'; date: Date; key: string } | { type: 'msg'; msg: Message }> = []
  let lastDate: Date | null = null

  for (const msg of messages) {
    if (!lastDate || !isSameDay(lastDate, msg.timestamp)) {
      items.push({ type: 'date', date: msg.timestamp, key: `sep-${msg.id}` })
      lastDate = msg.timestamp
    }
    items.push({ type: 'msg', msg })
  }

  return (
    <div className="relative flex-1 min-h-0">
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(4,3,18,0.6) 0%, transparent 100%)' }}
      />
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
        style={{ paddingTop: 20, paddingBottom: 16 }}
      >
        <div
          className="flex flex-col"
          style={{
            width: '100%',
            padding: '0 24px',
            gap: 0,
          }}
        >
        {items.map((item, idx) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} style={{ marginTop: idx === 0 ? 0 : 20, marginBottom: 8 }}>
                <DateSeparator date={item.date} />
              </div>
            )
          }

          const msg = item.msg
          const prevItem = items[idx - 1]
          const prevMsg = prevItem?.type === 'msg' ? prevItem.msg : null

          const isAckAfterUser     = msg.role === 'ai-ack'     && prevMsg?.role === 'user'
          const isAiAfterAck       = msg.role === 'ai-response' && prevMsg?.role === 'ai-ack'
          const isUserAfterAi      = msg.role === 'user'        && (prevMsg?.role === 'ai-ack' || prevMsg?.role === 'ai-response')

          let marginTop = 16
          if (isAckAfterUser)  marginTop = 6
          if (isAiAfterAck)    marginTop = 8
          if (isUserAfterAi)   marginTop = 24

          return (
            <div key={msg.id} style={{ marginTop }}>
              <MessageBubble
                message={msg}
                isNew={newMessageIds.has(msg.id)}
              />
            </div>
          )
        })}
        {/* Spacer */}
        <div style={{ height: 8, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  )
}
