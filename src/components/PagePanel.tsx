import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { X } from '@phosphor-icons/react'
import type { SidebarTab, Message } from '../types'
import { LinksTab } from './sidebar/LinksTab'
import { MediaTab } from './sidebar/MediaTab'
import { DashboardTab } from './sidebar/DashboardTab'
import { BrowseTab } from './sidebar/BrowseTab'
import { SettingsTab } from './sidebar/SettingsTab'
import { LiquidGlassCard } from '../../components/uilayouts/liquid-glass'

const PAGE_LABELS: Record<SidebarTab, string> = {
  links:     'Links',
  media:     'Media',
  dashboard: 'Dashboard',
  browse:    'Browse',
  settings:  'Settings',
}

const PANEL_LEFT = 80

interface Props {
  page: SidebarTab | null
  onClose: () => void
  allMessages?: Message[]
  isMobile?: boolean
}

export function PagePanel({ page, onClose, isMobile }: Props) {
  const reduceMotion = useReducedMotion()

  if (isMobile) {
    return (
      <AnimatePresence>
        {page && (
          <>
            {/* Full-screen scrim */}
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0"
              style={{ backgroundColor: 'rgba(2,1,14,0.5)', zIndex: 45 }}
              onClick={onClose}
            />

            {/* Bottom sheet — slides up from bottom */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
              transition={reduceMotion
                ? { duration: 0.2 }
                : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }
              }
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) onClose()
              }}
              className="fixed left-0 right-0 flex flex-col overflow-hidden"
              style={{
                top: '6%',
                bottom: 88,
                zIndex: 50,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                background: 'rgba(10,8,28,0.45)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                border: '1px solid rgba(139,127,245,0.15)',
                borderBottom: 'none',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 -8px 40px rgba(0,0,0,0.4)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0" style={{ cursor: 'grab', touchAction: 'none' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              </div>

              {/* Header */}
              <div
                className="flex items-center justify-between flex-shrink-0"
                style={{ height: 48, padding: '0 16px 0 20px' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {PAGE_LABELS[page]}
                </span>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 32,
                    height: 32,
                    color: 'rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Content — no inner exit animation, parent handles close */}
              <div className="flex-1 overflow-hidden min-h-0 relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={page}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                    className="absolute inset-0"
                  >
                    {page === 'links'     && <LinksTab />}
                    {page === 'media'     && <MediaTab />}
                    {page === 'dashboard' && <DashboardTab />}
                    {page === 'browse'    && <BrowseTab />}
                    {page === 'settings'  && <SettingsTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // Desktop panel
  return (
    <AnimatePresence>
      {page && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed top-0 bottom-0 right-0"
            style={{ left: PANEL_LEFT, backgroundColor: 'rgba(2,1,14,0.28)', zIndex: 30 }}
            onClick={onClose}
          />

          <motion.div
            key="panel"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.15, ease: [0.0, 0.0, 0.2, 1] }}
            className="fixed top-4 bottom-2 flex flex-col"
            style={{ left: PANEL_LEFT, width: 360, zIndex: 40, borderRadius: 20, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <LiquidGlassCard
              draggable={false}
              blurIntensity="xl"
              glowIntensity="none"
              shadowIntensity="none"
              borderRadius="20px"
              className="flex flex-col h-full w-full overflow-hidden"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(139,127,245,0.15), inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              <div
                className="flex items-center justify-between flex-shrink-0 relative z-30"
                style={{ height: 52, padding: '0 16px 0 20px' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {PAGE_LABELS[page]}
                </span>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-lg transition-all duration-150"
                  style={{
                    width: 28,
                    height: 28,
                    color: 'rgba(255,255,255,0.45)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.12)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden min-h-0 relative z-30">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={page}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                    className="absolute inset-0"
                  >
                    {page === 'links'     && <LinksTab />}
                    {page === 'media'     && <MediaTab />}
                    {page === 'dashboard' && <DashboardTab />}
                    {page === 'browse'    && <BrowseTab />}
                    {page === 'settings'  && <SettingsTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </LiquidGlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
