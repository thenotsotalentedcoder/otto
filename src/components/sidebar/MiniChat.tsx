import { useState, useRef, useEffect } from 'react'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import ottoLogo from '../../assets/logo_nobg.png'

interface ChatMsg { role: 'user' | 'ai'; text: string }

interface Props {
  initialMessage: string
  placeholder?: string
  mockResponse?: string
}

export function MiniChat({ initialMessage, placeholder = 'Ask anything...', mockResponse }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: initialMessage },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const t = input.trim()
    if (!t) return
    setMessages(prev => [...prev, { role: 'user', text: t }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: mockResponse ?? "In production I'd cross-reference this with your full notes corpus. Mock mode only.",
      }])
    }, 700)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-1">
            {m.role === 'ai' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <img src={ottoLogo} alt="Otto" style={{ width: 12, height: 12, objectFit: 'contain', opacity: 0.85 }} />
                  <span style={{ color: 'var(--color-accent)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em' }}>
                    otto
                  </span>
                </div>
                <p style={{ color: 'var(--color-text-primary)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {m.text}
                </p>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--color-text-faint)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  you
                </span>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.65 }}>
                  {m.text}
                </p>
              </>
            )}
            {/* separator between turns */}
            {i < messages.length - 1 && (
              <div style={{ height: 1, backgroundColor: 'var(--color-border)', marginTop: 6 }} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-t flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none"
          style={{ color: 'var(--color-text-primary)', fontSize: 13, caretColor: 'var(--color-accent)' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: 30,
            height: 30,
            backgroundColor: input.trim() ? 'var(--color-accent)' : 'var(--color-surface-3)',
            color: input.trim() ? '#fff' : 'var(--color-text-muted)',
            transition: 'background-color 0.15s',
          }}
        >
          <PaperPlaneTilt size={13} weight="fill" />
        </button>
      </div>
    </div>
  )
}
