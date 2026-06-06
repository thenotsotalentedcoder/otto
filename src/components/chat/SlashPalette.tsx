import { motion, AnimatePresence } from 'motion/react'
import { ChatCircle } from '@phosphor-icons/react'

interface Command {
  cmd: string
  description: string
  Icon: React.ElementType
}

const COMMANDS: Command[] = [
  { cmd: '/ask', description: 'Talk to Otto with full notes context', Icon: ChatCircle },
]

interface Props {
  visible: boolean
  query: string
  onSelect: (cmd: string) => void
}

export function SlashPalette({ visible, query, onSelect }: Props) {
  const filtered = COMMANDS.filter(c =>
    c.cmd.startsWith(query) || c.description.toLowerCase().includes(query.replace('/', '').toLowerCase())
  )

  return (
    <AnimatePresence>
      {visible && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-full left-0 right-0"
          style={{
            marginBottom: 6,
            background: 'rgba(10,8,28,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="py-2">
            {filtered.map(({ cmd, description, Icon }) => (
              <button
                key={cmd}
                onClick={() => onSelect(cmd)}
                className="w-full flex items-center gap-3 text-left"
                style={{
                  padding: '9px 20px',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,127,245,0.1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <Icon size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', minWidth: 56 }}>
                  {cmd}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                  {description}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
