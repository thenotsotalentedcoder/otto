import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Link, Images, ChartBar, MagnifyingGlass, X } from '@phosphor-icons/react'
import ottoLogo from '../assets/logo_nobg.png'
import type { SidebarTab, Message } from '../types'
import { LinksTab } from './sidebar/LinksTab'
import { MediaTab } from './sidebar/MediaTab'
import { DashboardTab } from './sidebar/DashboardTab'
import { BrowseTab } from './sidebar/BrowseTab'

interface SidebarProps {
  activeTab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
  allMessages?: Message[]
}

const TABS: { id: SidebarTab; label: string; Icon: React.ElementType }[] = [
  { id: 'links',     label: 'Links',     Icon: Link },
  { id: 'media',     label: 'Media',     Icon: Images },
  { id: 'dashboard', label: 'Dashboard', Icon: ChartBar },
  { id: 'browse',    label: 'Search',    Icon: MagnifyingGlass },
]

export function Sidebar({ activeTab, onTabChange, isOpen, onClose, isMobile, allMessages }: SidebarProps) {
  const shouldReduceMotion = useReducedMotion()
  const content = (
    <div
      className="flex flex-col h-full w-72 border-r overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', padding: '0 16px', height: 48 }}
      >
        <div className="flex items-center gap-2">
          <img src={ottoLogo} alt="Otto" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          <span style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Otto
          </span>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className="flex-1 flex flex-col items-center gap-1 relative transition-colors"
              style={{
                color: active ? 'var(--color-rose)' : 'var(--color-text-muted)',
                padding: '10px 4px 10px',
              }}
            >
              <Icon size={15} weight={active ? 'fill' : 'regular'} />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-3 right-3 rounded-full"
                  style={{ backgroundColor: 'var(--color-rose)', height: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden min-h-0 relative">
        {activeTab === 'links'     && <LinksTab />}
        {activeTab === 'media'     && <MediaTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'browse'    && <BrowseTab />}
      </div>
    </div>
  )

  if (!isMobile) {
    return (
      <div className="hidden md:flex h-full flex-shrink-0">
        {content}
      </div>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={onClose}
          />
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
            transition={shouldReduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed left-0 top-0 bottom-0 z-50"
          >
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
