import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IconRail } from './components/IconRail'
import { MobileNav } from './components/MobileNav'
import { PagePanel } from './components/PagePanel'
import { ChatScreen } from './components/chat/ChatScreen'
import { LandingScreen } from './components/onboarding/LandingScreen'
import type { SidebarTab, Message } from './types'
import './index.css'

const RAIL_OFFSET = 84
const ONBOARDING_KEY = 'otto_onboarding_complete'

function getSharedContent(): string | undefined {
  const p = new URLSearchParams(window.location.search)
  const url = p.get('share_url')
  const text = p.get('share_text')
  const title = p.get('share_title')
  const content = url || text || title || undefined
  if (content) {
    // Clean share params from URL without reload
    const clean = window.location.pathname
    window.history.replaceState({}, '', clean)
  }
  return content
}

export default function App() {
  const [stage, setStage] = useState<'landing' | 'app'>(
    localStorage.getItem(ONBOARDING_KEY) ? 'app' : 'landing'
  )
  const [activePage, setActivePage] = useState<SidebarTab | null>(null)
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [sharedContent] = useState<string | undefined>(getSharedContent)

  const isMobile = windowWidth < 768

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleMessagesChange = useCallback((msgs: Message[]) => {
    setAllMessages(msgs)
  }, [])

  const handlePageClick = (page: SidebarTab) => {
    setActivePage(prev => prev === page ? null : page)
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setStage('app')
  }

  return (
    <AnimatePresence mode="wait">
      {stage === 'landing' && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          transition={{ duration: 0.3 }}
          style={{ position: 'fixed', inset: 0 }}
        >
          <LandingScreen onComplete={handleOnboardingComplete} />
        </motion.div>
      )}

      {stage === 'app' && (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex h-full"
        >
          {!isMobile && (
            <IconRail activePage={activePage} onPageClick={handlePageClick} />
          )}
          <PagePanel
            page={activePage}
            onClose={() => setActivePage(null)}
            allMessages={allMessages}
            isMobile={isMobile}
          />
          <div className="flex flex-col w-full h-full overflow-hidden">
            <ChatScreen
              onMessagesChange={handleMessagesChange}
              isMobile={isMobile}
              railOffset={isMobile ? 0 : RAIL_OFFSET}
              sharedContent={sharedContent}
            />
          </div>
          {isMobile && (
            <MobileNav activePage={activePage} onPageClick={handlePageClick} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
