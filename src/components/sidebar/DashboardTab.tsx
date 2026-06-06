import { motion } from 'motion/react'
import { Lightning, CircleDashed, ArrowsClockwise, Link, Lightbulb } from '@phosphor-icons/react'

function SectionLabel({ icon: Icon, label, first }: { icon: React.ElementType; label: string; first?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" style={{ padding: `${first ? 20 : 28}px 20px 10px` }}>
      <Icon size={11} style={{ color: 'var(--color-accent)' }} weight="fill" />
      <span style={{ color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}


export function DashboardTab() {
  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <motion.div
        initial={{ x: '-20%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="flex-1 overflow-y-auto flex flex-col"
      >

        {/* This week */}
        <SectionLabel icon={Lightning} label="This week" first />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.75, padding: '0 20px 4px' }}>
          Save a few notes and Otto will synthesize your week here automatically.
        </p>

        {/* Active threads */}
        <SectionLabel icon={ArrowsClockwise} label="Active threads" />
        <p style={{ color: 'var(--color-text-faint)', fontSize: 12, padding: '4px 20px' }}>
          No threads yet — Otto will infer them from your notes.
        </p>

        {/* Unresolved */}
        <SectionLabel icon={CircleDashed} label="Unresolved" />
        <p style={{ color: 'var(--color-text-faint)', fontSize: 12, padding: '4px 20px' }}>
          Open questions will surface here as you capture more.
        </p>

        {/* Connections */}
        <SectionLabel icon={Lightbulb} label="Connections" />
        <p style={{ color: 'var(--color-text-faint)', fontSize: 12, padding: '4px 20px' }}>
          Non-obvious links across your notes will appear here.
        </p>

        {/* Reading list */}
        <SectionLabel icon={Link} label="Reading list" />
        <p style={{ color: 'var(--color-text-faint)', fontSize: 12, padding: '4px 20px' }}>
          Saved links will show up here.
        </p>

        <div style={{ height: 24 }} />
      </motion.div>
    </div>
  )
}
